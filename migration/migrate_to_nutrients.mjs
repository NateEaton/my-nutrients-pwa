#!/usr/bin/env node
/**
 * migrate-to-nutrients.mjs
 *
 * Migration utility for My Nutrients PWA - transforms My Calcium backup
 * to multi-nutrient format with enhanced journal entries.
 *
 * Usage:
 *   node migrate-to-nutrients.mjs \
 *     --merged-backup calcium-nutrients-merged-2025-12-18.json \
 *     --new-database ../src/lib/data/foodDatabaseData.js \
 *     --output nutrients-restore-2025-12-18.json
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Nutrient precision configuration (from data pipeline)
 * Defines appropriate decimal places for each nutrient type
 */
const NUTRIENT_PRECISION = {
  // Macronutrients (g) - 1 decimal place
  protein: 1,
  fiber: 1,
  carbohydrates: 1,
  sugars: 1,
  fat: 1,
  saturatedFat: 1,
  monounsaturatedFat: 1,
  polyunsaturatedFat: 1,

  // Omega fatty acids (g) - 2 decimal places
  omega3: 2,
  omega3ALA: 2,
  omega3EPA: 2,
  omega3DHA: 2,
  omega6: 2,

  // Minerals (mg) - 1 decimal place
  calcium: 1,
  magnesium: 1,
  potassium: 1,
  iron: 1,
  zinc: 1,

  // Vitamins - 1 decimal place
  vitaminD: 1,
  vitaminB12: 1,
  folate: 1,
  vitaminB6: 1,
  vitaminA: 1,
  vitaminC: 1,
  vitaminK: 1,
};

/**
 * Round nutrient value to appropriate precision (from data pipeline)
 */
function roundNutrientValue(nutrientKey, value) {
  if (value == null || isNaN(value)) return 0;
  if (value === 0) return 0;

  const precision = NUTRIENT_PRECISION[nutrientKey];
  if (!precision) {
    // Default to 1 decimal place for unknown nutrients
    return Math.round(value * 10) / 10;
  }

  // Fixed precision
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Round all nutrients in a nutrients object (from data pipeline)
 */
function roundNutrients(nutrients, omitZeros = true) {
  if (!nutrients || typeof nutrients !== 'object') {
    return {};
  }

  const rounded = {};
  for (const [key, value] of Object.entries(nutrients)) {
    const roundedValue = roundNutrientValue(key, value);

    // Omit zeros if requested
    if (omitZeros && roundedValue === 0) {
      continue;
    }

    rounded[key] = roundedValue;
  }

  return rounded;
}

/**
 * Parse and fix serving sizes from old production bug
 * Old bug patterns:
 * 1. qty=1, unit="3 oz (85g)" → Should be: qty=3, unit="oz (85g)"
 * 2. qty=1, unit="4oz" → Should be: qty=4, unit="oz"
 * 3. qty=2, unit="1 serving (5oz)" → Should be: qty=2, unit="serving (5oz)"
 */
function parseServingSize(servingQuantity, servingUnit) {
  if (!servingUnit) {
    return { servingQuantity: servingQuantity || 1, servingUnit: servingUnit || '' };
  }

  // Pattern 1 & 2: Only apply when qty=1 (quantity embedded in unit)
  if (servingQuantity === 1) {
    // Pattern 1: "3 oz (85g)" or "1 cup (240ml)" - with space
    const matchWithSpace = servingUnit.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    if (matchWithSpace) {
      return {
        servingQuantity: parseFloat(matchWithSpace[1]),
        servingUnit: matchWithSpace[2]
      };
    }

    // Pattern 2: "4oz" or "2tablespoons" - without space
    const matchNoSpace = servingUnit.match(/^(\d+(?:\.\d+)?)(oz|tablespoon|tablespoons|teaspoon|teaspoons|cup|cups|gram|grams|g)(.*)$/i);
    if (matchNoSpace) {
      return {
        servingQuantity: parseFloat(matchNoSpace[1]),
        servingUnit: matchNoSpace[2] + matchNoSpace[3]
      };
    }
  }

  // Pattern 3: Unit starts with "1 " (from database measure format like "1 serving 5 fl oz")
  // Strip the leading "1 " but keep original quantity
  // This applies to any quantity, not just qty=1
  const leadingNumber = servingUnit.match(/^1\s+(.+)$/);
  if (leadingNumber) {
    return {
      servingQuantity: servingQuantity || 1, // Keep original quantity
      servingUnit: leadingNumber[1] // Strip leading "1 "
    };
  }

  // No fix needed
  return { servingQuantity: servingQuantity || 1, servingUnit };
}

/**
 * Find the best matching measure in the database for a given serving unit
 * @param {Array} measures - Array of measure objects from database food
 * @param {string} servingUnit - The serving unit from the old entry
 * @returns {number} - Index of best matching measure (0 if no match found)
 */
function findMatchingMeasureIndex(measures, servingUnit) {
  if (!measures || measures.length === 0) return 0;
  if (!servingUnit) return 0;

  // Normalize the serving unit for comparison
  const normalizedUnit = servingUnit.toLowerCase().trim();

  // Try exact match first
  for (let i = 0; i < measures.length; i++) {
    const measure = measures[i];
    const measureText = (measure.measure || measure.s || '').toLowerCase().trim();
    if (measureText === normalizedUnit) {
      return i;
    }
  }

  // Try partial match (e.g., "slice large" should match "1 slice large")
  for (let i = 0; i < measures.length; i++) {
    const measure = measures[i];
    const measureText = (measure.measure || measure.s || '').toLowerCase().trim();

    // Check if measure contains the unit (e.g., "1 slice large" contains "slice large")
    if (measureText.includes(normalizedUnit) || normalizedUnit.includes(measureText)) {
      return i;
    }
  }

  // No match found - use first measure as fallback
  return 0;
}

/**
 * Load database from JS or JSON file
 */
async function loadDatabase(filePath) {
  console.log(`Loading database: ${filePath}`);

  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
    // Load as ES module
    const fileUrl = `file://${path.resolve(filePath)}?t=${Date.now()}`;
    const module = await import(fileUrl);

    // Handle minified format
    if (module.DB && module.KEYS && module.MEASURE_KEYS) {
      console.log(`  ✓ Loaded minified database (${module.DB.length} foods)`);
      return rehydrateDatabase(module.DB, module.KEYS, module.MEASURE_KEYS);
    }

    // Handle regular format
    if (module.default && Array.isArray(module.default)) {
      console.log(`  ✓ Loaded database (${module.default.length} foods)`);
      return module.default;
    }

    throw new Error('Unknown database format');
  }

  if (filePath.endsWith('.json')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      console.log(`  ✓ Loaded JSON database (${data.length} foods)`);
      return data;
    }

    if (data.foods && Array.isArray(data.foods)) {
      console.log(`  ✓ Loaded JSON database (${data.foods.length} foods)`);
      return data.foods;
    }

    throw new Error('Unknown JSON database format');
  }

  throw new Error('Unsupported file format');
}

/**
 * Rehydrate minified database
 */
function rehydrateDatabase(db, keys, measureKeys) {
  return db.map(food => {
    const rehydrated = {};

    // Rehydrate top-level keys
    for (const [minKey, fullKey] of Object.entries(keys)) {
      if (food[minKey] !== undefined) {
        rehydrated[fullKey] = food[minKey];
      }
    }

    // Rehydrate measures (use ms from the minified format)
    const measuresKey = food.ms ? 'ms' : food.m ? 'm' : null;

    if (measuresKey && Array.isArray(food[measuresKey])) {
      rehydrated.measures = food[measuresKey].map(measure => {
        const rehydratedMeasure = {};

        for (const [minKey, fullKey] of Object.entries(measureKeys)) {
          if (measure[minKey] !== undefined) {
            rehydratedMeasure[fullKey] = measure[minKey];
          }
        }

        // Handle nutrients object (already unminified in source)
        if (measure.n && typeof measure.n === 'object') {
          rehydratedMeasure.nutrients = measure.n;
        }

        return rehydratedMeasure;
      });
    }

    return rehydrated;
  });
}

/**
 * Get all measures from a food (handles both legacy and new formats)
 */
function getAllMeasures(food) {
  if (food.measures && Array.isArray(food.measures)) {
    return food.measures.map(m => ({
      measure: m.measure,
      nutrients: m.nutrients || { calcium: m.calcium || 0 }
    }));
  }

  // Legacy format
  return [{
    measure: food.measure || food.m || '',
    nutrients: { calcium: food.calcium || food.c || 0 }
  }];
}

/**
 * Extract ALL available nutrients from a matched food
 */
function extractAllNutrients(food, measureIndex = 0) {
  const measures = getAllMeasures(food);

  if (measureIndex >= measures.length) {
    measureIndex = 0; // Fallback
  }

  const measure = measures[measureIndex];
  return measure.nutrients || { calcium: 0 };
}

/**
 * Create lookup map for database foods by NAME
 */
function createDatabaseLookup(database) {
  const lookup = new Map();

  for (const food of database) {
    const name = (food.name || food.n || '').toLowerCase().trim();
    const appId = food.appId || food.id || food.i;
    if (name && appId) {
      lookup.set(name, { food, appId });
    }
  }

  return lookup;
}

/**
 * Normalize food name for matching
 */
function normalizeName(name) {
  return (name || '').toLowerCase().trim();
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Enhance journal entries with multi-nutrient data
 */
function enhanceJournalEntries(journalEntries, databaseLookup, customFoods) {
  const enhanced = {};
  let enhancedCount = 0;
  let customCount = 0;
  let fallbackCount = 0;
  const unmatchedNames = new Set();

  // Create custom food lookup by name
  const customFoodLookup = new Map();
  for (const food of customFoods) {
    customFoodLookup.set(food.name.toLowerCase().trim(), food.id);
  }

  for (const [date, entries] of Object.entries(journalEntries)) {
    enhanced[date] = entries.map(entry => {
      // Custom food - keep calcium-only
      if (entry.isCustom) {
        customCount++;

        // Find custom food ID by name
        const customFoodId = entry.customFoodId || customFoodLookup.get(entry.name.toLowerCase().trim());

        // Fix serving size bug from old production
        const fixedServing = parseServingSize(
          entry.servingQuantity || 1,
          entry.servingUnit
        );

        return {
          name: entry.name,
          customFoodId: customFoodId, // Add custom food ID
          nutrients: {
            calcium: entry.calcium || 0
          },
          servingQuantity: fixedServing.servingQuantity, // Use fixed quantity
          servingUnit: fixedServing.servingUnit, // Use fixed unit
          timestamp: entry.timestamp,
          isCustom: true
        };
      }

      // Database food - try to match by name
      const normalizedName = normalizeName(entry.name);
      const match = databaseLookup.get(normalizedName);

      if (match) {
        // Found match - find the correct measure by matching serving unit
        const { food, appId } = match;

        // Get measures from food (handle both formats)
        const measures = food.measures || food.ms || food.m || [];

        // Find matching measure index
        const measureIndex = findMatchingMeasureIndex(measures, entry.servingUnit);

        // Extract nutrients from database (these are for 1 instance of that measure)
        const nutrientsPerServing = extractAllNutrients(food, measureIndex);

        // IMPORTANT: Save original quantity BEFORE any parsing fixes
        const originalQuantity = entry.servingQuantity || 1;

        // Fix serving size bug from old production
        const fixedServing = parseServingSize(
          originalQuantity,
          entry.servingUnit
        );

        // CRITICAL: Scale database nutrients by ORIGINAL serving quantity
        // Database nutrients are for 1 instance of the measure, but journal entry
        // might have qty=2 (2 servings), qty=0.5 (half serving), etc.
        // We use ORIGINAL quantity because:
        // - Pork: original qty=1, unit="3 oz" → nutrients for "3 oz"=10mg → 1×10mg=10mg ✓
        // - Wine: original qty=2, unit="1 serving" → nutrients for "1 serving"=12mg → 2×12mg=24mg ✓
        const scaledByQuantity = {};
        for (const [nutrient, value] of Object.entries(nutrientsPerServing)) {
          if (typeof value === 'number') {
            scaledByQuantity[nutrient] = value * originalQuantity; // Use ORIGINAL, not fixed!
          }
        }

        // Check if we actually fixed the serving size
        const servingSizeWasFixed = (
          fixedServing.servingQuantity !== originalQuantity ||
          fixedServing.servingUnit !== entry.servingUnit
        );

        let finalNutrients;

        if (servingSizeWasFixed) {
          // Serving size bug was fixed - this is the SAME serving, just displayed correctly
          // Use scaled nutrients (already scaled by ORIGINAL quantity above)
          finalNutrients = scaledByQuantity;
        } else {
          // Serving size is correct - check if calcium matches database
          const standardCalcium = scaledByQuantity.calcium || 1;
          const actualCalcium = entry.calcium || 0;
          const calciumDiff = Math.abs(standardCalcium - actualCalcium);

          if (calciumDiff < 0.5) {
            // Calcium matches (within rounding tolerance) - use scaled database values
            finalNutrients = scaledByQuantity;
          } else {
            // Calcium differs - this is a user override, scale all nutrients further
            const scale = actualCalcium / standardCalcium;
            const rescaledNutrients = {};
            for (const [nutrient, value] of Object.entries(scaledByQuantity)) {
              if (typeof value === 'number') {
                rescaledNutrients[nutrient] = value * scale;
              }
            }
            finalNutrients = rescaledNutrients;
          }
        }

        // Apply data pipeline rounding to match database precision
        const roundedNutrients = roundNutrients(finalNutrients, true);

        enhancedCount++;

        return {
          name: entry.name,
          appId: appId,
          nutrients: roundedNutrients,
          servingQuantity: fixedServing.servingQuantity,
          servingUnit: fixedServing.servingUnit,
          timestamp: entry.timestamp,
          isCustom: false
        };
      }

      // No match found - fallback to calcium only
      fallbackCount++;
      unmatchedNames.add(entry.name);

      // Fix serving size bug from old production
      const fixedServing = parseServingSize(
        entry.servingQuantity || 1,
        entry.servingUnit
      );

      return {
        name: entry.name,
        nutrients: {
          calcium: entry.calcium || 0
        },
        servingQuantity: fixedServing.servingQuantity, // Use fixed quantity
        servingUnit: fixedServing.servingUnit, // Use fixed unit
        timestamp: entry.timestamp,
        isCustom: false
      };
    });
  }

  console.log(`\n  Enhanced entries:`);
  console.log(`    Database foods with multi-nutrients: ${enhancedCount}`);
  console.log(`    Custom foods (calcium-only): ${customCount}`);
  console.log(`    Unmatched foods (calcium-only): ${fallbackCount}`);

  if (unmatchedNames.size > 0 && unmatchedNames.size <= 20) {
    console.log(`\n  Unmatched food names:`);
    Array.from(unmatchedNames).slice(0, 10).forEach(name => {
      console.log(`    - ${name}`);
    });
    if (unmatchedNames.size > 10) {
      console.log(`    ... and ${unmatchedNames.size - 10} more`);
    }
  }

  return enhanced;
}

/**
 * Transform preferences for My Nutrients
 */
function transformPreferences(oldPreferences) {
  const dailyGoal = oldPreferences.dailyGoal || 1500;

  return {
    nutrientGoals: {
      calcium: dailyGoal,
      protein: 60,  // Default RDA values
      fiber: 28,
      vitaminD: 20
    },
    displayedNutrients: ['protein', 'calcium', 'fiber', 'vitaminD'],
    theme: oldPreferences.theme || 'auto',
    colorScheme: 'blue',
    sortBy: oldPreferences.sortBy || 'time',
    sortOrder: oldPreferences.sortOrder || 'desc'
  };
}

/**
 * Calculate statistics for journal entries
 */
function calculateStats(journalEntries) {
  let totalEntries = 0;
  const nutrientCounts = {};

  for (const entries of Object.values(journalEntries)) {
    for (const entry of entries) {
      totalEntries++;

      if (entry.nutrients) {
        for (const nutrient of Object.keys(entry.nutrients)) {
          nutrientCounts[nutrient] = (nutrientCounts[nutrient] || 0) + 1;
        }
      }
    }
  }

  return { totalEntries, nutrientCounts };
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function migrateToNutrients(config) {
  const {
    mergedBackupPath,
    newDatabasePath,
    outputPath
  } = config;

  console.log('='*70);
  console.log('MY NUTRIENTS MIGRATION');
  console.log('='*70);

  // Load files
  console.log('\n📂 Loading files...');
  const mergedBackup = JSON.parse(fs.readFileSync(mergedBackupPath, 'utf8'));
  const nutrientsDatabase = await loadDatabase(newDatabasePath);

  console.log(`\n✅ Loaded merged backup:`);
  console.log(`   Journal days: ${Object.keys(mergedBackup.journalEntries).length}`);
  console.log(`   Custom foods: ${mergedBackup.customFoods.length}`);
  console.log(`   Favorites: ${mergedBackup.favorites.length}`);

  // Create database lookup
  console.log('\n🗂️  Creating database lookup...');
  const databaseLookup = createDatabaseLookup(nutrientsDatabase);
  console.log(`   Indexed ${databaseLookup.size} foods`);

  // Enhance journal entries with multi-nutrient data
  console.log('\n📊 Enhancing journal entries with multi-nutrient data...');
  const enhancedEntries = enhanceJournalEntries(
    mergedBackup.journalEntries,
    databaseLookup,
    mergedBackup.customFoods
  );

  // Transform preferences
  console.log('\n⚙️  Transforming preferences for My Nutrients...');
  const nutrientSettings = transformPreferences(mergedBackup.preferences);
  console.log(`   Tracked nutrients: ${nutrientSettings.displayedNutrients.join(', ')}`);
  console.log(`   Calcium goal: ${nutrientSettings.nutrientGoals.calcium}mg`);

  // Create final restore file
  console.log('\n📝 Creating My Nutrients restore file...');

  // Fix serving preferences (apply same serving size bug fixes)
  const fixedServingPreferences = (mergedBackup.servingPreferences || []).map(pref => {
    const fixed = parseServingSize(pref.preferredQuantity, pref.preferredUnit);
    return {
      ...pref,
      preferredQuantity: fixed.servingQuantity,
      preferredUnit: fixed.servingUnit
    };
  });

  const restoreFile = {
    metadata: {
      version: '2.0.0',
      appName: 'My Nutrients PWA',
      createdAt: new Date().toISOString(),
      migratedFrom: 'My Calcium',
      originalVersion: '1.0.0',
      migrationDate: new Date().toISOString(),
      sourceFiles: {
        merged: mergedBackupPath,
        database: newDatabasePath
      }
    },
    preferences: nutrientSettings,
    customFoods: mergedBackup.customFoods,
    favorites: mergedBackup.favorites,
    hiddenFoods: mergedBackup.hiddenFoods,
    servingPreferences: fixedServingPreferences,
    journalEntries: enhancedEntries
  };

  // Save output
  fs.writeFileSync(outputPath, JSON.stringify(restoreFile, null, 2));

  console.log(`\n✅ Migration complete!`);
  console.log(`📁 Output: ${outputPath}`);

  // Print statistics
  console.log('\n' + '='*70);
  console.log('MIGRATION STATISTICS');
  console.log('='*70);

  const dates = Object.keys(restoreFile.journalEntries).sort();
  console.log(`\n📅 Journal Entries:`);
  console.log(`   Days: ${dates.length}`);
  console.log(`   Range: ${dates[0]} → ${dates[dates.length - 1]}`);

  const stats = calculateStats(restoreFile.journalEntries);
  console.log(`   Total entries: ${stats.totalEntries}`);

  console.log(`\n🥗 Nutrient Coverage:`);
  const sortedNutrients = Object.entries(stats.nutrientCounts)
    .sort((a, b) => b[1] - a[1]);

  for (const [nutrient, count] of sortedNutrients.slice(0, 10)) {
    const percentage = Math.round((count / stats.totalEntries) * 100);
    console.log(`   ${nutrient}: ${count}/${stats.totalEntries} (${percentage}%)`);
  }

  if (sortedNutrients.length > 10) {
    console.log(`   ... and ${sortedNutrients.length - 10} more nutrients`);
  }

  console.log(`\n📦 Other Data:`);
  console.log(`   Custom foods: ${restoreFile.customFoods.length}`);
  console.log(`   Favorites: ${restoreFile.favorites.length}`);
  console.log(`   Hidden foods: ${restoreFile.hiddenFoods.length}`);
  console.log(`   Serving preferences: ${restoreFile.servingPreferences.length}`);

  // Sample entries
  console.log(`\n📝 Sample Journal Entry (${dates[dates.length - 1]}):`);
  const sampleEntries = restoreFile.journalEntries[dates[dates.length - 1]];

  if (sampleEntries && sampleEntries.length > 0) {
    const sample = sampleEntries[0];
    console.log(`   Name: ${sample.name}`);
    console.log(`   Nutrients: ${Object.keys(sample.nutrients || {}).length} nutrients`);

    const nutrients = sample.nutrients || {};
    const nutrientStr = Object.entries(nutrients)
      .slice(0, 5)
      .map(([k, v]) => `${k}=${v.toFixed(1)}`)
      .join(', ');
    console.log(`   Sample values: ${nutrientStr}`);
  }

  console.log('\n' + '='*70);
  console.log('✅ READY FOR VALIDATION AND TESTING');
  console.log('='*70);
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--merged-backup':
        config.mergedBackupPath = args[++i];
        break;
      case '--new-database':
        config.newDatabasePath = args[++i];
        break;
      case '--output':
        config.outputPath = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${args[i]}`);
        showHelp();
        process.exit(1);
    }
  }

  return config;
}

function showHelp() {
  console.log(`
My Nutrients Migration Tool

Usage:
  node migrate-to-nutrients.mjs \\
    --merged-backup <merged-file.json> \\
    --new-database <database.js> \\
    --output <restore-file.json>

Required Arguments:
  --merged-backup   Path to merged backup file (from merge_for_nutrients.py)
  --new-database    Path to My Nutrients database (foodDatabaseData.js)
  --output          Path for output restore file

Example:
  node migrate-to-nutrients.mjs \\
    --merged-backup migration/calcium-nutrients-merged-2025-12-18.json \\
    --new-database src/lib/data/foodDatabaseData.js \\
    --output migration/nutrients-restore-2025-12-18.json
`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs();

  if (!config.mergedBackupPath || !config.newDatabasePath || !config.outputPath) {
    console.error('Error: Missing required arguments');
    showHelp();
    process.exit(1);
  }

  try {
    await migrateToNutrients(config);
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}
