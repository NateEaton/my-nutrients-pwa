#!/usr/bin/env node

/**
 * cleanup-journal-ids.mjs
 *
 * Cleans up journal entry ID fields in backup files.
 *
 * Cleanup operations:
 * 1. Backfill missing customFoodIds for custom food entries
 * 2. Backfill missing appIds for database food entries
 * 3. Move legacy positive IDs from customFoodId to appId
 * 4. Ensure isCustom flag consistency
 * 5. Remove entries with both appId and customFoodId
 *
 * Usage:
 *   node cleanup-journal-ids.mjs --input <backup> --custom-foods <file> --database <file> --output <file> [--dry-run]
 */

import fs from 'fs';
import path from 'path';

// Parse command-line arguments
const args = process.argv.slice(2);
let inputFile = null;
let customFoodsFile = null;
let databaseFile = null;
let outputFile = null;
let overridesFile = null;
let dbFoodMappingFile = null;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--input':
    case '-i':
      inputFile = args[++i];
      break;
    case '--custom-foods':
    case '-c':
      customFoodsFile = args[++i];
      break;
    case '--database':
    case '-d':
      databaseFile = args[++i];
      break;
    case '--output':
    case '-o':
      outputFile = args[++i];
      break;
    case '--overrides':
      overridesFile = args[++i];
      break;
    case '--db-food-mapping':
      dbFoodMappingFile = args[++i];
      break;
    case '--dry-run':
      dryRun = true;
      break;
    case '--help':
    case '-h':
      console.log(`
Usage: node cleanup-journal-ids.mjs [options]

Cleans up journal entry ID fields in backup files.

Required options:
  --input, -i         Input backup file
  --output, -o        Output backup file (cleaned)

Optional options:
  --custom-foods, -c   Custom foods file (for backfilling customFoodId)
                       If not provided, uses customFoods from input backup
  --database, -d       Database file (for backfilling appId)
                       Example: ../src/lib/data/foodDatabaseData.js
  --overrides          Manual override file for custom food ID assignments
                       Example: custom-food-overrides.json
  --db-food-mapping    Database food mapping file (map missing foods to appIds or convert to custom)
                       Example: database-food-mapping.json
  --dry-run            Preview changes without writing output file

Example:
  # Basic cleanup (using custom foods from backup)
  node cleanup-journal-ids.mjs \\
    --input merged-output.json \\
    --output merged-output-cleaned.json

  # Full cleanup with database matching
  node cleanup-journal-ids.mjs \\
    --input merged-output.json \\
    --database ../src/lib/data/foodDatabaseData.js \\
    --output merged-output-cleaned.json \\
    --dry-run

  # Cleanup with database food mappings
  node cleanup-journal-ids.mjs \\
    --input nutrients-restore.json \\
    --database ../src/lib/data/foodDatabaseData.js \\
    --db-food-mapping database-food-mapping.json \\
    --output nutrients-restore-fixed.json
`);
      process.exit(0);
    default:
      break;
  }
}

// Validate required arguments
if (!inputFile || !outputFile) {
  console.error('❌ Error: Missing required arguments');
  console.error('Usage: node cleanup-journal-ids.mjs --input <file> --output <file> [options]');
  console.error('Run with --help for more information');
  process.exit(1);
}

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log(`\n${'='.repeat(70)}`);
console.log('🧹 JOURNAL ENTRY ID CLEANUP');
console.log('='.repeat(70));
console.log(`\n📁 Input:  ${inputFile}`);
console.log(`📁 Output: ${outputFile}`);
if (dryRun) {
  console.log(`\n⚠️  DRY RUN MODE - No files will be modified`);
}

// Load input backup
let backup;
try {
  const content = fs.readFileSync(inputFile, 'utf8');
  backup = JSON.parse(content);
} catch (error) {
  console.error(`❌ Error reading input file: ${error.message}`);
  process.exit(1);
}

// Validate structure
if (!backup.journalEntries || typeof backup.journalEntries !== 'object') {
  console.error('❌ Error: Input file missing journalEntries');
  process.exit(1);
}

// Load custom foods (from file or backup)
let customFoods = [];
if (customFoodsFile) {
  try {
    const content = fs.readFileSync(customFoodsFile, 'utf8');
    const data = JSON.parse(content);
    customFoods = data.customFoods || data;
  } catch (error) {
    console.error(`❌ Error reading custom foods file: ${error.message}`);
    process.exit(1);
  }
} else {
  customFoods = backup.customFoods || [];
}

// Load database (if provided)
let database = [];
let databaseLookup = new Map();

if (databaseFile) {
  try {
    // Check file extension to determine format
    const ext = path.extname(databaseFile);

    if (ext === '.js') {
      // JavaScript module - need to extract the data
      const content = fs.readFileSync(databaseFile, 'utf8');
      // Extract the export statement
      const match = content.match(/export\s+const\s+\w+\s*=\s*(\[[\s\S]*\]);/);
      if (match) {
        database = eval(match[1]);
      } else {
        throw new Error('Could not parse JavaScript database file');
      }
    } else {
      // JSON file
      const content = fs.readFileSync(databaseFile, 'utf8');
      const data = JSON.parse(content);
      database = data.foods || data;
    }

    // Build lookup by name (handle minified keys)
    for (const food of database) {
      const name = (food.n || food.name || '').toLowerCase().trim();
      const appId = food.i || food.id || food.appId;
      if (name && appId) {
        if (!databaseLookup.has(name)) {
          databaseLookup.set(name, []);
        }
        databaseLookup.get(name).push({ food, appId });
      }
    }

    console.log(`\n✅ Loaded database: ${database.length} foods`);
  } catch (error) {
    console.error(`❌ Error reading database file: ${error.message}`);
    process.exit(1);
  }
}

// Load database food mapping (if provided)
let dbFoodMappings = {};
if (dbFoodMappingFile) {
  try {
    const content = fs.readFileSync(dbFoodMappingFile, 'utf8');
    const data = JSON.parse(content);
    dbFoodMappings = data.databaseFoodMappings || {};
    console.log(`\n✅ Loaded database food mappings: ${Object.keys(dbFoodMappings).length} food mappings`);
  } catch (error) {
    console.error(`❌ Error reading database food mapping file: ${error.message}`);
    process.exit(1);
  }
}

// Build custom food lookup
const customFoodByName = new Map();
const customFoodById = new Map();

for (const food of customFoods) {
  const key = `${food.name.toLowerCase().trim()}|${food.calcium || 0}`;
  customFoodByName.set(key, food);
  if (food.id) {
    customFoodById.set(food.id, food);
  }
}

console.log(`\n✅ Loaded custom foods: ${customFoods.length} foods`);

// Load manual overrides (if provided)
let overrides = {};
if (overridesFile) {
  try {
    const content = fs.readFileSync(overridesFile, 'utf8');
    const data = JSON.parse(content);
    overrides = data.customFoodIdOverrides || {};
    console.log(`\n✅ Loaded manual overrides: ${Object.keys(overrides).length} entry mappings`);
  } catch (error) {
    console.error(`❌ Error reading overrides file: ${error.message}`);
    process.exit(1);
  }
}

// Initialize change tracking
const changes = [];
let stats = {
  totalEntries: 0,
  customFoodIdBackfilled: 0,
  appIdBackfilled: 0,
  dbFoodMapped: 0,
  dbFoodConvertedToCustom: 0,
  positiveIdMoved: 0,
  isCustomFlagFixed: 0,
  bothIdsRemoved: 0,
  noChanges: 0,
};

// Track next custom food ID for conversions
let nextCustomFoodId = -1;
if (customFoods.length > 0) {
  const minId = Math.min(...customFoods.map(f => f.id || 0));
  nextCustomFoodId = minId < 0 ? minId - 1 : -1;
}

// Track new custom foods created from conversions
const newCustomFoods = [];

// Process journal entries
console.log(`\n${'─'.repeat(70)}`);
console.log('🔧 PROCESSING ENTRIES');
console.log('─'.repeat(70));

for (const [date, entries] of Object.entries(backup.journalEntries)) {
  if (!Array.isArray(entries)) continue;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    stats.totalEntries++;

    const originalEntry = JSON.stringify(entry);
    let modified = false;
    const entryChanges = [];

    const isCustom = entry.isCustom === true;
    const hasCustomFoodId = entry.customFoodId !== undefined && entry.customFoodId !== null;
    const hasAppId = entry.appId !== undefined && entry.appId !== null;

    // Rule 1: Fix entries with both IDs (choose the correct one)
    if (hasCustomFoodId && hasAppId) {
      if (isCustom) {
        // Keep customFoodId, remove appId
        delete entry.appId;
        entryChanges.push('Removed appId (kept customFoodId for custom food)');
      } else {
        // Keep appId, remove customFoodId
        delete entry.customFoodId;
        entryChanges.push('Removed customFoodId (kept appId for database food)');
      }
      stats.bothIdsRemoved++;
      modified = true;
    }

    // Rule 2: Fix positive customFoodId (move to appId if database food, negate if custom food)
    if (hasCustomFoodId && entry.customFoodId > 0) {
      if (!isCustom) {
        // Database food with positive customFoodId - move to appId
        entry.appId = entry.customFoodId;
        delete entry.customFoodId;
        entryChanges.push(`Moved positive ID ${entry.appId} from customFoodId to appId`);
        stats.positiveIdMoved++;
        modified = true;
      } else {
        // Custom food with positive ID - this is legacy format, negate it
        const oldId = entry.customFoodId;
        entry.customFoodId = -entry.customFoodId;
        entryChanges.push(`Negated legacy customFoodId: ${oldId} → ${entry.customFoodId}`);
        stats.positiveIdMoved++;
        modified = true;
      }
    }

    // Rule 3: Backfill missing customFoodId for custom foods
    if (isCustom && !entry.customFoodId) {
      // Check manual overrides first
      const overrideKey = `${date}[${i}]`;
      const override = overrides[overrideKey];

      if (override && override.assignedId) {
        // Apply manual override
        entry.customFoodId = override.assignedId;
        entryChanges.push(`Applied manual override: customFoodId = ${override.assignedId} (matched to "${override.matchedTo}")`);
        stats.customFoodIdBackfilled++;
        modified = true;
      } else {
        // Try automatic matching
        const key = `${entry.name.toLowerCase().trim()}|${entry.calcium || entry.nutrients?.calcium || 0}`;
        const matchedFood = customFoodByName.get(key);

        if (matchedFood && matchedFood.id) {
          entry.customFoodId = matchedFood.id;
          entryChanges.push(`Backfilled customFoodId: ${matchedFood.id}`);
          stats.customFoodIdBackfilled++;
          modified = true;
        } else {
          entryChanges.push(`Warning: Could not backfill customFoodId for "${entry.name}"`);
        }
      }
    }

    // Rule 4: Backfill missing appId for database foods (or convert to custom)
    if (!isCustom && !entry.appId) {
      // Check database food mapping first
      const mapping = dbFoodMappings[entry.name];

      if (mapping) {
        if (mapping.targetAppId) {
          // Map to specified appId
          entry.appId = mapping.targetAppId;
          entryChanges.push(`Mapped to appId: ${mapping.targetAppId} (from mapping file)`);
          stats.dbFoodMapped++;
          modified = true;

          // TODO: Recalculate nutrients from database based on serving size
          // For now, just adding the appId. Nutrient recalculation would require
          // looking up the food in database and scaling nutrients.
        } else if (mapping.convertToCustom) {
          // Convert to custom food
          const customFoodId = nextCustomFoodId--;

          // Create custom food definition
          const customFood = {
            id: customFoodId,
            name: entry.name,
            nutrients: entry.nutrients || { calcium: entry.calcium || 0 },
            measure: entry.servingUnit || entry.measure || '1 serving',
            dateAdded: date,
            isCustom: true,
            sourceMetadata: {
              sourceType: 'database_conversion',
              originalName: entry.name,
              conversionDate: date
            }
          };

          newCustomFoods.push(customFood);

          // Update entry to be custom food
          entry.isCustom = true;
          entry.customFoodId = customFoodId;
          delete entry.appId; // Remove appId if present

          entryChanges.push(`Converted to custom food: customFoodId = ${customFoodId} (from mapping file)`);
          stats.dbFoodConvertedToCustom++;
          modified = true;
        }
      } else if (databaseFile) {
        // Fall back to automatic name matching
        const name = entry.name.toLowerCase().trim();
        const matches = databaseLookup.get(name);

        if (matches && matches.length > 0) {
          // Use first match (most common case)
          entry.appId = matches[0].appId;
          entryChanges.push(`Backfilled appId: ${matches[0].appId}`);
          stats.appIdBackfilled++;
          modified = true;

          if (matches.length > 1) {
            entryChanges.push(`  (Note: ${matches.length} foods with this name, used first match)`);
          }
        }
      }
    }

    // Rule 5: Ensure isCustom flag consistency
    if (entry.customFoodId && !isCustom) {
      entry.isCustom = true;
      entryChanges.push('Fixed isCustom flag (set to true for customFoodId)');
      stats.isCustomFlagFixed++;
      modified = true;
    }

    // Record changes
    if (modified) {
      changes.push({
        date,
        index: i,
        name: entry.name,
        changes: entryChanges,
        before: originalEntry,
        after: JSON.stringify(entry)
      });
    } else {
      stats.noChanges++;
    }
  }
}

// Print change summary
console.log(`\n📊 CHANGE SUMMARY:`);
console.log(`   Total entries processed: ${stats.totalEntries}`);
console.log(`   Entries modified:        ${stats.totalEntries - stats.noChanges}`);
console.log(`   Entries unchanged:       ${stats.noChanges}`);
console.log();
console.log(`   Changes applied:`);
console.log(`     customFoodId backfilled:     ${stats.customFoodIdBackfilled}`);
console.log(`     appId backfilled:            ${stats.appIdBackfilled}`);
console.log(`     DB foods mapped to appId:    ${stats.dbFoodMapped}`);
console.log(`     DB foods converted to custom: ${stats.dbFoodConvertedToCustom}`);
console.log(`     Positive ID moved to appId:  ${stats.positiveIdMoved}`);
console.log(`     isCustom flag fixed:         ${stats.isCustomFlagFixed}`);
console.log(`     Both IDs removed:            ${stats.bothIdsRemoved}`);

// Show sample changes
if (changes.length > 0 && changes.length <= 20) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log('📝 DETAILED CHANGES');
  console.log('─'.repeat(70));

  for (const change of changes) {
    console.log(`\n${change.date} [${change.index}]: "${change.name}"`);
    for (const c of change.changes) {
      console.log(`   ${c}`);
    }
  }
} else if (changes.length > 20) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log('📝 SAMPLE CHANGES (showing first 10)');
  console.log('─'.repeat(70));

  for (const change of changes.slice(0, 10)) {
    console.log(`\n${change.date} [${change.index}]: "${change.name}"`);
    for (const c of change.changes) {
      console.log(`   ${c}`);
    }
  }
  console.log(`\n... and ${changes.length - 10} more changes`);
}

// Save change log
if (!dryRun) {
  const changeLogPath = outputFile.replace(/\.json$/, '-changelog.json');
  fs.writeFileSync(changeLogPath, JSON.stringify(changes, null, 2));
  console.log(`\n📄 Change log saved to: ${changeLogPath}`);
}

// Save cleaned backup
if (dryRun) {
  console.log(`\n⚠️  DRY RUN - No output file written`);
  console.log(`   Run without --dry-run to save changes to: ${outputFile}`);
  if (newCustomFoods.length > 0) {
    console.log(`\n   Would create ${newCustomFoods.length} new custom food definition(s)`);
  }
} else {
  try {
    // Add new custom foods to backup
    if (newCustomFoods.length > 0) {
      if (!backup.customFoods) {
        backup.customFoods = [];
      }
      backup.customFoods.push(...newCustomFoods);
      console.log(`\n✅ Added ${newCustomFoods.length} new custom food definition(s) to backup`);
    }

    // Update metadata
    if (!backup.metadata) {
      backup.metadata = {};
    }
    backup.metadata.cleanedAt = new Date().toISOString();
    backup.metadata.cleanupStats = stats;

    fs.writeFileSync(outputFile, JSON.stringify(backup, null, 2));
    console.log(`\n✅ Cleaned backup saved to: ${outputFile}`);

    // Validate output
    const outputSize = fs.statSync(outputFile).size;
    console.log(`   File size: ${(outputSize / 1024).toFixed(1)} KB`);
  } catch (error) {
    console.error(`\n❌ Error writing output file: ${error.message}`);
    process.exit(1);
  }
}

console.log(`\n${'─'.repeat(70)}`);
console.log('💡 NEXT STEPS');
console.log('─'.repeat(70));

if (dryRun) {
  console.log('\n1. Review the changes above');
  console.log('2. If changes look correct, run without --dry-run');
  console.log(`3. Command: node cleanup-journal-ids.mjs --input ${inputFile} --output ${outputFile}`);
} else {
  console.log('\n1. Verify the cleaned backup file');
  console.log('2. Run analyze-journal-ids.mjs to confirm cleanup');
  console.log(`3. Command: node analyze-journal-ids.mjs ${outputFile}`);
  console.log('4. If analysis looks good, proceed with migration');
}

console.log(`\n${'='.repeat(70)}\n`);
