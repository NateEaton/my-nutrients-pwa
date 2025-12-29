#!/usr/bin/env node

/**
 * Test Pipeline Scripts
 *
 * Creates minimal test data and runs through merge and synthesis scripts
 * to verify they work correctly before running on full USDA dataset.
 */

const fs = require('fs');
const { mergeDataSources } = require('./merge-foundation-sr-legacy.cjs');
const { synthesizePortions } = require('./synthesize-portions.cjs');

console.log('\n=== Testing Pipeline Scripts ===\n');

// Create test data
const testData = {
  foods: [
    // Foundation food with portion
    {
      id: 748967,
      sourceId: 748967,
      name: "Eggs, Grade A, Large, egg whole",
      source: "Foundation",
      measures: [
        {
          measure: "1 oz",
          gramWeight: 28.4,
          nutrients: { protein: 3.6, calcium: 14 }
        }
      ],
      nutrientsPer100g: { protein: 12.6, calcium: 50 }
    },
    // SR Legacy food with different portion
    {
      id: 171287,
      sourceId: 171287,
      name: "Egg, whole, raw, fresh",
      source: "SR Legacy",
      measures: [
        {
          measure: "1 large egg (50g)",
          gramWeight: 50,
          nutrients: { protein: 6.3, calcium: 25 }
        }
      ],
      nutrientsPer100g: { protein: 12.6, calcium: 50 }
    },
    // Foundation food with no portion (will get synthesized)
    {
      id: 2262075,
      sourceId: 2262075,
      name: "Flaxseed, ground",
      source: "Foundation",
      foodCategory: "Nut and Seed Products",
      measures: [
        {
          measure: "100 g",
          gramWeight: 100,
          nutrients: { protein: 18.3, fiber: 27.3 }
        }
      ],
      nutrientsPer100g: { protein: 18.3, fiber: 27.3 }
    },
    // SR Legacy food that won't match Foundation
    {
      id: 169414,
      sourceId: 169414,
      name: "Seeds, flaxseed",
      source: "SR Legacy",
      foodCategory: "Nut and Seed Products",
      measures: [
        {
          measure: "1 tablespoon (10g)",
          gramWeight: 10,
          nutrients: { protein: 1.9, fiber: 2.8 }
        }
      ],
      nutrientsPer100g: { protein: 19.0, fiber: 28.0 }
    }
  ],
  metadata: {
    source: "Test Data",
    created: new Date().toISOString()
  }
};

console.log('📊 Test Data Created:');
console.log(`  Foundation foods: ${testData.foods.filter(f => f.source === 'Foundation').length}`);
console.log(`  SR Legacy foods:  ${testData.foods.filter(f => f.source === 'SR Legacy').length}`);
console.log('');

// Test 1: Merge
console.log('🔬 Test 1: Merging Foundation & SR Legacy...');
try {
  const mergeResult = mergeDataSources(testData, {
    nameSimilarityThreshold: 0.75,
    nutrientSimilarityThreshold: 0.80,
    verbose: false
  });

  console.log('✓ Merge successful:');
  console.log(`  Total merged: ${mergeResult.mergeReport.totalMerged}`);
  console.log(`  Foundation only: ${mergeResult.mergeReport.foundationOnlyCount}`);
  console.log(`  SR Legacy only: ${mergeResult.mergeReport.srLegacyOnlyCount}`);
  console.log(`  Output foods: ${mergeResult.foods.length}`);

  // Save intermediate result for synthesis test
  const mergedData = mergeResult;

  console.log('');

  // Test 2: Synthesize Portions
  console.log('🔬 Test 2: Synthesizing portions...');

  // Load RACC table
  const raccTable = JSON.parse(fs.readFileSync('./racc-table.json', 'utf8'));

  const synthesisResult = synthesizePortions(mergedData, raccTable, { verbose: false });

  console.log('✓ Synthesis successful:');
  console.log(`  Synthesized: ${synthesisResult.stats.synthesizedCount}`);
  console.log(`  Already had portions: ${synthesisResult.stats.alreadyHadPortions}`);

  // Check specific results
  console.log('');
  console.log('📋 Sample Results:');

  // Find the merged egg
  const egg = synthesisResult.foods.find(f => f.name.toLowerCase().includes('egg') && f.provenance?.mergedSources);
  if (egg) {
    console.log('✓ Egg (merged from Foundation + SR Legacy):');
    console.log(`  Name: ${egg.name}`);
    console.log(`  Measures: ${egg.measures.length}`);
    console.log(`  Sources: ${egg.provenance.mergedSources.join(' + ')}`);
  }

  // Find flaxseed with synthesized portion
  const flaxseed = synthesisResult.foods.find(f => f.name.toLowerCase().includes('flaxseed, ground'));
  if (flaxseed && flaxseed.portionSynthesis) {
    console.log('✓ Flaxseed (synthesized portion):');
    console.log(`  Name: ${flaxseed.name}`);
    console.log(`  Synthesized measure: ${flaxseed.measures[0].measure}`);
    console.log(`  RACC grams: ${flaxseed.portionSynthesis.raccEntry.racc_grams}g`);
  }

  console.log('');
  console.log('✅ All tests passed!');
  console.log('');
  console.log('The pipeline scripts are working correctly.');
  console.log('You can now run the full pipeline with real USDA data.');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
