#!/usr/bin/env node

/**
 * Foundation & SR Legacy Data Merger
 *
 * Intelligently merges USDA Foundation Foods with SR Legacy Foods to create
 * a unified dataset that:
 * - Prioritizes Foundation data (more current, maintained)
 * - Preserves portions from both sources
 * - Tracks provenance for transparency
 * - Prevents duplicate foods in final database
 *
 * Input: combined-nutrient-data.json (from json-data-processor.cjs)
 * Output: merged-nutrient-data.json + merge-report.json
 */

const fs = require('fs');
const path = require('path');

// Levenshtein distance for fuzzy name matching
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

// Calculate similarity score (0-1, higher is more similar)
function similarityScore(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1.0 - (distance / maxLen);
}

// Normalize food name for comparison
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\b(grade\s+[a-z]|large|medium|small|extra|jumbo)\b/gi, '')  // Size qualifiers
    .replace(/\b(raw|fresh|frozen|dried|pasteurized|cooked|canned)\b/gi, '')  // Preparation
    .replace(/\b(usda|fdc|ndb)\b/gi, '')  // Database markers
    .replace(/[,\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate nutrient similarity
function nutrientSimilarity(nutrients1, nutrients2) {
  const keys = new Set([...Object.keys(nutrients1), ...Object.keys(nutrients2)]);
  if (keys.size === 0) return 0;

  let totalDiff = 0;
  let comparedCount = 0;

  for (const key of keys) {
    const val1 = nutrients1[key] || 0;
    const val2 = nutrients2[key] || 0;

    // Skip if both are zero
    if (val1 === 0 && val2 === 0) continue;

    const maxVal = Math.max(val1, val2);
    if (maxVal === 0) continue;

    const diff = Math.abs(val1 - val2) / maxVal;
    totalDiff += diff;
    comparedCount++;
  }

  if (comparedCount === 0) return 0;

  // Return similarity (1 - average difference)
  return 1 - (totalDiff / comparedCount);
}

// Check if two foods are likely the same food
function areSameFood(food1, food2, options = {}) {
  const {
    nameSimilarityThreshold = 0.75,
    nutrientSimilarityThreshold = 0.80,
    strictNutrientCheck = true
  } = options;

  // Normalize names
  const norm1 = normalizeName(food1.name);
  const norm2 = normalizeName(food2.name);

  // Quick reject: names too different
  const nameSim = similarityScore(norm1, norm2);
  if (nameSim < nameSimilarityThreshold) {
    return { match: false, nameSimilarity: nameSim, reason: 'name_mismatch' };
  }

  // Token overlap check (additional name verification)
  const tokens1 = new Set(norm1.split(' ').filter(t => t.length > 2));
  const tokens2 = new Set(norm2.split(' ').filter(t => t.length > 2));
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  const tokenOverlap = union.size > 0 ? intersection.size / union.size : 0;

  if (tokenOverlap < 0.5) {
    return { match: false, nameSimilarity: nameSim, tokenOverlap, reason: 'token_mismatch' };
  }

  // Nutrient verification
  const nutSim = nutrientSimilarity(food1.nutrientsPer100g || {}, food2.nutrientsPer100g || {});

  if (strictNutrientCheck && nutSim < nutrientSimilarityThreshold) {
    return { match: false, nameSimilarity: nameSim, nutrientSimilarity: nutSim, reason: 'nutrient_mismatch' };
  }

  // Match!
  return {
    match: true,
    nameSimilarity: nameSim,
    nutrientSimilarity: nutSim,
    tokenOverlap,
    confidence: (nameSim + nutSim + tokenOverlap) / 3
  };
}

// Merge two foods (Foundation + SR Legacy)
function mergeFoods(foundationFood, srLegacyFood) {
  // Combine measures, removing duplicates
  const measureMap = new Map();

  // Add Foundation measures first (higher priority)
  if (foundationFood.measures) {
    for (const measure of foundationFood.measures) {
      const key = `${measure.measure}_${measure.gramWeight}`;
      if (!measureMap.has(key)) {
        measureMap.set(key, { ...measure, source: 'Foundation' });
      }
    }
  }

  // Add SR Legacy measures if not already present
  if (srLegacyFood.measures) {
    for (const measure of srLegacyFood.measures) {
      const key = `${measure.measure}_${measure.gramWeight}`;
      if (!measureMap.has(key)) {
        measureMap.set(key, { ...measure, source: 'SR Legacy' });
      }
    }
  }

  const mergedMeasures = Array.from(measureMap.values());

  // Use Foundation nutrients (preferred)
  return {
    id: foundationFood.id,
    sourceId: foundationFood.sourceId || foundationFood.id,
    name: foundationFood.name,
    measures: mergedMeasures,
    source: 'Foundation',
    nutrientsPer100g: foundationFood.nutrientsPer100g,
    provenance: {
      foundationFdcId: foundationFood.id,
      srLegacyFdcId: srLegacyFood.id,
      mergedSources: ['Foundation', 'SR Legacy'],
      foundationMeasures: foundationFood.measures ? foundationFood.measures.length : 0,
      srLegacyMeasures: srLegacyFood.measures ? srLegacyFood.measures.length : 0,
      totalMeasures: mergedMeasures.length,
      foundationName: foundationFood.name,
      srLegacyName: srLegacyFood.name
    }
  };
}

// Main merging function
function mergeDataSources(inputData, options = {}) {
  const {
    nameSimilarityThreshold = 0.75,
    nutrientSimilarityThreshold = 0.80,
    verbose = true
  } = options;

  const foods = inputData.foods || [];

  // Separate by source
  const foundationFoods = foods.filter(f => f.source === 'Foundation');
  const srLegacyFoods = foods.filter(f => f.source === 'SR Legacy');

  if (verbose) {
    console.log(`\n📊 Input Statistics:`);
    console.log(`  Foundation Foods: ${foundationFoods.length}`);
    console.log(`  SR Legacy Foods: ${srLegacyFoods.length}`);
    console.log(`  Total: ${foods.length}`);
  }

  const mergedFoods = [];
  const mergeReport = {
    totalMerged: 0,
    foundationOnlyCount: 0,
    srLegacyOnlyCount: 0,
    merges: [],
    skippedFoundation: [],
    skippedSrLegacy: []
  };

  // Track which SR Legacy foods have been merged
  const srLegacyMatched = new Set();

  // For each Foundation food, try to find matching SR Legacy
  for (let i = 0; i < foundationFoods.length; i++) {
    const foundationFood = foundationFoods[i];

    if (verbose && i % 100 === 0) {
      process.stdout.write(`\r🔍 Merging Foundation foods: ${i}/${foundationFoods.length}`);
    }

    let bestMatch = null;
    let bestScore = null;

    // Search for best matching SR Legacy food
    for (let j = 0; j < srLegacyFoods.length; j++) {
      if (srLegacyMatched.has(j)) continue;  // Already matched

      const srLegacyFood = srLegacyFoods[j];
      const result = areSameFood(foundationFood, srLegacyFood, {
        nameSimilarityThreshold,
        nutrientSimilarityThreshold
      });

      if (result.match) {
        if (!bestMatch || result.confidence > bestScore.confidence) {
          bestMatch = j;
          bestScore = result;
        }
      }
    }

    if (bestMatch !== null) {
      // Merge the two foods
      const srLegacyFood = srLegacyFoods[bestMatch];
      const merged = mergeFoods(foundationFood, srLegacyFood);
      mergedFoods.push(merged);

      srLegacyMatched.add(bestMatch);
      mergeReport.totalMerged++;
      mergeReport.merges.push({
        foundationName: foundationFood.name,
        srLegacyName: srLegacyFood.name,
        foundationId: foundationFood.id,
        srLegacyId: srLegacyFood.id,
        confidence: bestScore.confidence,
        nameSimilarity: bestScore.nameSimilarity,
        nutrientSimilarity: bestScore.nutrientSimilarity
      });
    } else {
      // No match - keep Foundation food as-is
      mergedFoods.push({ ...foundationFood, provenance: { source: 'Foundation' } });
      mergeReport.foundationOnlyCount++;
    }
  }

  if (verbose) {
    process.stdout.write(`\r🔍 Merging Foundation foods: ${foundationFoods.length}/${foundationFoods.length} ✓\n`);
  }

  // Add unmatched SR Legacy foods
  for (let j = 0; j < srLegacyFoods.length; j++) {
    if (!srLegacyMatched.has(j)) {
      const srLegacyFood = srLegacyFoods[j];
      mergedFoods.push({ ...srLegacyFood, provenance: { source: 'SR Legacy' } });
      mergeReport.srLegacyOnlyCount++;
    }
  }

  if (verbose) {
    console.log(`\n✅ Merge Complete:`);
    console.log(`  Merged (Foundation + SR Legacy): ${mergeReport.totalMerged}`);
    console.log(`  Foundation only: ${mergeReport.foundationOnlyCount}`);
    console.log(`  SR Legacy only: ${mergeReport.srLegacyOnlyCount}`);
    console.log(`  Total output foods: ${mergedFoods.length}`);
    console.log(`  Data reduction: ${foods.length} → ${mergedFoods.length} (${((1 - mergedFoods.length / foods.length) * 100).toFixed(1)}%)`);
  }

  return {
    foods: mergedFoods,
    metadata: {
      ...inputData.metadata,
      mergeDate: new Date().toISOString(),
      mergeStats: {
        totalMerged: mergeReport.totalMerged,
        foundationOnlyCount: mergeReport.foundationOnlyCount,
        srLegacyOnlyCount: mergeReport.srLegacyOnlyCount,
        inputCount: foods.length,
        outputCount: mergedFoods.length
      }
    },
    mergeReport
  };
}

// CLI
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help')) {
    console.log(`
Usage: node merge-foundation-sr-legacy.cjs <input.json> <output.json> [options]

Merges Foundation Foods and SR Legacy Foods into a unified dataset.

Arguments:
  input.json    Input file from json-data-processor.cjs
  output.json   Output file (merged data)

Options:
  --name-threshold <0-1>      Name similarity threshold (default: 0.75)
  --nutrient-threshold <0-1>  Nutrient similarity threshold (default: 0.80)
  --report <file>             Save merge report to file (default: merge-report.json)
  --quiet                     Suppress progress output

Examples:
  node merge-foundation-sr-legacy.cjs combined-nutrient-data.json merged-nutrient-data.json
  node merge-foundation-sr-legacy.cjs input.json output.json --name-threshold 0.80
`);
    process.exit(0);
  }

  const inputFile = args[0];
  const outputFile = args[1];
  let reportFile = 'merge-report.json';
  let nameSimilarityThreshold = 0.75;
  let nutrientSimilarityThreshold = 0.80;
  let verbose = true;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--name-threshold' && i + 1 < args.length) {
      nameSimilarityThreshold = parseFloat(args[++i]);
    } else if (args[i] === '--nutrient-threshold' && i + 1 < args.length) {
      nutrientSimilarityThreshold = parseFloat(args[++i]);
    } else if (args[i] === '--report' && i + 1 < args.length) {
      reportFile = args[++i];
    } else if (args[i] === '--quiet') {
      verbose = false;
    }
  }

  console.log('\n=== Foundation & SR Legacy Merger ===\n');
  console.log(`📂 Input:  ${inputFile}`);
  console.log(`📂 Output: ${outputFile}`);
  console.log(`📊 Report: ${reportFile}`);
  console.log(`\n⚙️  Settings:`);
  console.log(`  Name similarity threshold:     ${nameSimilarityThreshold}`);
  console.log(`  Nutrient similarity threshold: ${nutrientSimilarityThreshold}`);

  // Load input
  console.log(`\n📖 Loading ${inputFile}...`);
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

  // Merge
  const result = mergeDataSources(inputData, {
    nameSimilarityThreshold,
    nutrientSimilarityThreshold,
    verbose
  });

  // Save output
  console.log(`\n💾 Saving merged data to ${outputFile}...`);
  fs.writeFileSync(
    outputFile,
    JSON.stringify({ foods: result.foods, metadata: result.metadata }, null, 2),
    'utf8'
  );

  console.log(`💾 Saving merge report to ${reportFile}...`);
  fs.writeFileSync(
    reportFile,
    JSON.stringify(result.mergeReport, null, 2),
    'utf8'
  );

  console.log(`\n✅ Merge complete!\n`);
}

if (require.main === module) {
  main();
}

module.exports = { mergeDataSources, areSameFood, normalizeName };
