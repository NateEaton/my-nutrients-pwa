#!/usr/bin/env node

/**
 * Portion Synthesizer
 *
 * Adds practical serving portions to foods that lack them, using:
 * - FDA RACC (Reference Amounts Customarily Consumed) values
 * - Category-based defaults
 * - Food-specific pattern matching
 *
 * This ensures all foods have meaningful serving sizes for users,
 * even when USDA data only provides 100g measures.
 *
 * Input: merged-nutrient-data.json (from merge-foundation-sr-legacy.cjs)
 * Output: portioned-nutrient-data.json + synthesis-report.json
 */

const fs = require('fs');
const path = require('path');

// Load RACC table
function loadRaccTable(raccFilePath = './racc-table.json') {
  try {
    const data = fs.readFileSync(raccFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading RACC table: ${error.message}`);
    process.exit(1);
  }
}

// Calculate nutrients for a specific portion
function calculatePortionNutrients(nutrientsPer100g, gramWeight) {
  const portionNutrients = {};
  for (const [key, value] of Object.entries(nutrientsPer100g)) {
    portionNutrients[key] = value * (gramWeight / 100);
  }
  return portionNutrients;
}

// Find RACC entry for a food
function findRaccEntry(food, raccTable) {
  const foodCategory = food.category || food.foodCategory || '';
  const foodName = food.name.toLowerCase();

  // Try to find category in RACC table
  const categoryData = raccTable.categories[foodCategory];

  if (!categoryData) {
    // No category match - use fallback
    return {
      ...raccTable.fallback,
      matched: false,
      matchType: 'fallback'
    };
  }

  // Try pattern matching within category
  if (categoryData.patterns) {
    for (const [pattern, raccData] of Object.entries(categoryData.patterns)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(foodName)) {
        return {
          ...raccData,
          matched: true,
          matchType: 'pattern',
          pattern: pattern
        };
      }
    }
  }

  // Use category default
  if (categoryData.default) {
    return {
      ...categoryData.default,
      matched: true,
      matchType: 'category_default',
      category: foodCategory
    };
  }

  // Fallback
  return {
    ...raccTable.fallback,
    matched: false,
    matchType: 'fallback'
  };
}

// Check if food needs portion synthesis
function needsPortionSynthesis(food) {
  if (!food.measures || food.measures.length === 0) {
    return { needs: true, reason: 'no_measures' };
  }

  // Check if only has 100g measure
  const has100g = food.measures.some(m => m.measure === '100 g');
  const hasOthers = food.measures.some(m => m.measure !== '100 g');

  if (has100g && !hasOthers) {
    return { needs: true, reason: '100g_only' };
  }

  return { needs: false };
}

// Synthesize portion for a food
function synthesizePortion(food, raccEntry) {
  if (!raccEntry) return null;

  const portion = {
    measure: raccEntry.portion,
    gramWeight: raccEntry.racc_grams,
    nutrients: calculatePortionNutrients(food.nutrientsPer100g || {}, raccEntry.racc_grams),
    sequenceNumber: 0,  // Put synthesized portions first
    synthesized: true,
    raccBased: true,
    raccNotes: raccEntry.notes || ''
  };

  return portion;
}

// Process all foods
function synthesizePortions(inputData, raccTable, options = {}) {
  const { verbose = true } = options;

  const foods = inputData.foods || [];
  const processedFoods = [];

  const stats = {
    totalFoods: foods.length,
    synthesizedCount: 0,
    alreadyHadPortions: 0,
    synthesizedByReason: {
      no_measures: 0,
      '100g_only': 0
    },
    synthesizedByCategory: {},
    synthesizedByMatchType: {
      pattern: 0,
      category_default: 0,
      fallback: 0
    }
  };

  for (let i = 0; i < foods.length; i++) {
    const food = foods[i];

    if (verbose && i % 500 === 0) {
      process.stdout.write(`\r🔧 Processing foods: ${i}/${foods.length}`);
    }

    const needsSynthesis = needsPortionSynthesis(food);

    if (!needsSynthesis.needs) {
      // Food already has good portions
      processedFoods.push(food);
      stats.alreadyHadPortions++;
      continue;
    }

    // Find RACC entry
    const raccEntry = findRaccEntry(food, raccTable);

    // Synthesize portion
    const synthesizedPortion = synthesizePortion(food, raccEntry);

    // Create updated food with synthesized portion
    const updatedFood = {
      ...food,
      measures: [
        synthesizedPortion,
        ...(food.measures || [])
      ].filter(m => m !== null),
      portionSynthesis: {
        synthesized: true,
        reason: needsSynthesis.reason,
        raccEntry: {
          portion: raccEntry.portion,
          racc_grams: raccEntry.racc_grams,
          matchType: raccEntry.matchType,
          pattern: raccEntry.pattern,
          category: raccEntry.category
        }
      }
    };

    processedFoods.push(updatedFood);

    // Update stats
    stats.synthesizedCount++;
    stats.synthesizedByReason[needsSynthesis.reason]++;
    stats.synthesizedByMatchType[raccEntry.matchType]++;

    const category = food.category || food.foodCategory || 'Unknown';
    stats.synthesizedByCategory[category] = (stats.synthesizedByCategory[category] || 0) + 1;
  }

  if (verbose) {
    process.stdout.write(`\r🔧 Processing foods: ${foods.length}/${foods.length} ✓\n`);
  }

  return { foods: processedFoods, stats };
}

// CLI
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help')) {
    console.log(`
Usage: node synthesize-portions.cjs <input.json> <output.json> [options]

Adds RACC-based portions to foods that lack meaningful serving sizes.

Arguments:
  input.json    Input file (merged data)
  output.json   Output file (with synthesized portions)

Options:
  --racc-table <file>  RACC lookup table (default: racc-table.json)
  --report <file>      Save synthesis report (default: synthesis-report.json)
  --quiet              Suppress progress output

Examples:
  node synthesize-portions.cjs merged-nutrient-data.json portioned-nutrient-data.json
  node synthesize-portions.cjs input.json output.json --racc-table custom-racc.json
`);
    process.exit(0);
  }

  const inputFile = args[0];
  const outputFile = args[1];
  let raccTableFile = 'racc-table.json';
  let reportFile = 'synthesis-report.json';
  let verbose = true;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--racc-table' && i + 1 < args.length) {
      raccTableFile = args[++i];
    } else if (args[i] === '--report' && i + 1 < args.length) {
      reportFile = args[++i];
    } else if (args[i] === '--quiet') {
      verbose = false;
    }
  }

  console.log('\n=== Portion Synthesizer ===\n');
  console.log(`📂 Input:      ${inputFile}`);
  console.log(`📂 Output:     ${outputFile}`);
  console.log(`📋 RACC Table: ${raccTableFile}`);
  console.log(`📊 Report:     ${reportFile}`);

  // Load RACC table
  console.log(`\n📖 Loading RACC table...`);
  const raccTable = loadRaccTable(raccTableFile);
  console.log(`   ${Object.keys(raccTable.categories).length} categories loaded`);

  // Load input
  console.log(`\n📖 Loading ${inputFile}...`);
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log(`   ${inputData.foods.length} foods loaded`);

  // Synthesize portions
  console.log(`\n🔧 Synthesizing portions...\n`);
  const result = synthesizePortions(inputData, raccTable, { verbose });

  // Display stats
  console.log(`\n✅ Synthesis Complete:\n`);
  console.log(`  Total foods:             ${result.stats.totalFoods}`);
  console.log(`  Synthesized portions:    ${result.stats.synthesizedCount}`);
  console.log(`  Already had portions:    ${result.stats.alreadyHadPortions}`);
  console.log(`\n  Synthesis by reason:`);
  console.log(`    No measures:           ${result.stats.synthesizedByReason.no_measures}`);
  console.log(`    100g only:             ${result.stats.synthesizedByReason['100g_only']}`);
  console.log(`\n  Synthesis by match type:`);
  console.log(`    Pattern match:         ${result.stats.synthesizedByMatchType.pattern}`);
  console.log(`    Category default:      ${result.stats.synthesizedByMatchType.category_default}`);
  console.log(`    Fallback (100g):       ${result.stats.synthesizedByMatchType.fallback}`);

  // Top categories
  const topCategories = Object.entries(result.stats.synthesizedByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topCategories.length > 0) {
    console.log(`\n  Top categories synthesized:`);
    for (const [category, count] of topCategories) {
      console.log(`    ${category}: ${count}`);
    }
  }

  // Save output
  console.log(`\n💾 Saving output to ${outputFile}...`);
  const outputData = {
    foods: result.foods,
    metadata: {
      ...inputData.metadata,
      synthesisDate: new Date().toISOString(),
      synthesisStats: result.stats
    }
  };
  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');

  // Save report
  console.log(`💾 Saving report to ${reportFile}...`);
  fs.writeFileSync(reportFile, JSON.stringify(result.stats, null, 2), 'utf8');

  console.log(`\n✅ Portion synthesis complete!\n`);
}

if (require.main === module) {
  main();
}

module.exports = { synthesizePortions, findRaccEntry, needsPortionSynthesis };
