#!/usr/bin/env node

/**
 * candidate-generator.cjs (Hybrid Pipeline Stage 3)
 *
 * Generates food concept candidates by matching Foundation Foods to SR Legacy foods.
 * Implements the hybrid data strategy:
 * - Foundation Foods for nutrients when high-confidence match exists
 * - SR Legacy for serving measures (almost always)
 * - State filtering to prevent raw/cooked mismatches
 *
 * Output: Food concepts with assigned Primary and Reference sources
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const DEFAULT_MATCH_THRESHOLD = 0.70; // Minimum Jaccard similarity for FF match
const DENSITY_VARIANCE_THRESHOLD = 0.20; // 20% water content difference = density warning

// State compatibility rules - states that cannot be matched together
const INCOMPATIBLE_STATES = {
  raw: new Set(['cooked', 'boiled', 'baked', 'fried', 'roasted', 'steamed', 'grilled']),
  cooked: new Set(['raw', 'uncooked', 'dry', 'dried', 'dehydrated']),
  dry: new Set(['cooked', 'boiled', 'baked', 'fried', 'rehydrated', 'prepared']),
};

// Common stop words to exclude from token comparison
const STOP_WORDS = new Set([
  'the', 'and', 'or', 'with', 'without', 'in', 'of', 'a', 'an', 'to', 'for',
  'from', 'by', 'on', 'at', 'as', 'is', 'it', 'all', 'types', 'commercial',
  'varieties', 'includes', 'nfs', 'ns'
]);

// --- Argument Parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    inputFile: null,
    outputFile: 'candidates',
    matchThreshold: DEFAULT_MATCH_THRESHOLD,
    generateAudit: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' && i + 1 < args.length) {
      config.inputFile = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      config.outputFile = args[++i];
    } else if (arg === '--threshold' && i + 1 < args.length) {
      config.matchThreshold = parseFloat(args[++i]);
    } else if (arg === '--no-audit') {
      config.generateAudit = false;
    } else if (arg === '--help') {
      console.log(`
Usage: node candidate-generator.cjs [OPTIONS]

Generate food concept candidates by matching FF to SRL sources.

Options:
  --input <file>      Input JSON file from json-data-processor (required)
  --output <name>     Output file base name (default: candidates)
  --threshold <n>     Match threshold 0.0-1.0 (default: ${DEFAULT_MATCH_THRESHOLD})
  --no-audit          Skip audit CSV generation
  --help              Show this help message

Example:
  node candidate-generator.cjs --input combined-nutrient-data.json --output candidates
`);
      process.exit(0);
    } else if (!arg.startsWith('--') && !config.inputFile) {
      config.inputFile = arg;
    }
  }

  if (!config.inputFile) {
    console.error('Error: Input file is required');
    process.exit(1);
  }

  return config;
}

// --- Tokenization & Similarity ---

/**
 * Tokenize a food name for comparison
 */
function tokenize(name) {
  if (!name) return new Set();

  return new Set(
    name.toLowerCase()
      .replace(/[(),\[\]]/g, ' ') // Remove punctuation
      .split(/\s+/) // Split on whitespace
      .filter(token => token.length > 1) // Remove single chars
      .filter(token => !STOP_WORDS.has(token)) // Remove stop words
      .filter(token => !/^\d+(\.\d+)?$/.test(token)) // Remove pure numbers
  );
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Check if two preparation states are compatible
 */
function statesCompatible(stateA, stateB) {
  if (stateA === 'unspecified' || stateB === 'unspecified') {
    return true; // Unspecified can match anything
  }

  if (stateA === stateB) {
    return true;
  }

  // Check incompatibility rules
  const incompatible = INCOMPATIBLE_STATES[stateA];
  if (incompatible) {
    // Check if stateB or any keyword in stateB is incompatible
    return !incompatible.has(stateB);
  }

  return true;
}

/**
 * Check for density compatibility using water content
 */
function checkDensityCompatibility(foodA, foodB) {
  const waterA = foodA.waterContent;
  const waterB = foodB.waterContent;

  // If water content not available, assume compatible
  if (waterA === null || waterA === undefined ||
      waterB === null || waterB === undefined) {
    return { compatible: true, variance: null };
  }

  const maxWater = Math.max(waterA, waterB);
  if (maxWater === 0) {
    return { compatible: true, variance: 0 };
  }

  const variance = Math.abs(waterA - waterB) / maxWater;
  return {
    compatible: variance <= DENSITY_VARIANCE_THRESHOLD,
    variance: variance
  };
}

/**
 * Find best Foundation Foods match for an SR Legacy food
 */
function findBestFFMatch(srlFood, ffFoods, threshold) {
  const srlTokens = tokenize(srlFood.name);
  const srlCategory = srlFood.foodCategory?.code;
  const srlState = srlFood.prepState || 'unspecified';

  let bestMatch = null;
  let bestScore = 0;

  for (const ffFood of ffFoods) {
    // Category lock: only match within same category if available
    const ffCategory = ffFood.foodCategory?.code;
    if (srlCategory && ffCategory && srlCategory !== ffCategory) {
      continue;
    }

    // State filtering: skip incompatible preparation states
    const ffState = ffFood.prepState || 'unspecified';
    if (!statesCompatible(srlState, ffState)) {
      continue;
    }

    // Calculate token similarity
    const ffTokens = tokenize(ffFood.name);
    const score = jaccardSimilarity(srlTokens, ffTokens);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = ffFood;
    }
  }

  if (bestScore >= threshold && bestMatch) {
    // Check density compatibility
    const densityCheck = checkDensityCompatibility(srlFood, bestMatch);

    return {
      match: bestMatch,
      score: bestScore,
      stateMatch: true,
      densityWarning: !densityCheck.compatible,
      densityVariance: densityCheck.variance
    };
  }

  return null;
}

// --- Main Processing ---

function main() {
  const config = parseArgs();

  console.log('\n=== Candidate Generator (Hybrid Pipeline) ===\n');
  console.log(`Input: ${config.inputFile}`);
  console.log(`Match threshold: ${config.matchThreshold}`);

  // Load input data
  if (!fs.existsSync(config.inputFile)) {
    console.error(`Error: Input file not found: ${config.inputFile}`);
    process.exit(1);
  }

  const inputData = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
  const foods = inputData.foods || inputData;

  if (!Array.isArray(foods)) {
    console.error('Error: Expected foods array in input');
    process.exit(1);
  }

  console.log(`Loaded ${foods.length} foods\n`);

  // Separate Foundation Foods and SR Legacy
  const ffFoods = foods.filter(f => f.sourceType === 'Foundation' || f.source === 'Foundation');
  const srlFoods = foods.filter(f => f.sourceType === 'SR Legacy' || f.source === 'SR Legacy');

  console.log(`Foundation Foods: ${ffFoods.length}`);
  console.log(`SR Legacy Foods: ${srlFoods.length}\n`);

  // Statistics
  const stats = {
    totalCandidates: 0,
    ffPrimaryWithSrlMeasures: 0,
    srlOnly: 0,
    ffOnly: 0,
    densityWarnings: 0,
    stateFiltered: 0
  };

  // Generate candidates
  const candidates = [];
  const auditRows = [];

  // Process SR Legacy foods - find FF matches where available
  console.log('Processing SR Legacy foods...');
  for (const srlFood of srlFoods) {
    const matchResult = findBestFFMatch(srlFood, ffFoods, config.matchThreshold);

    let candidate;
    let action;

    if (matchResult) {
      // FF match found - use FF for nutrients, SRL for measures
      candidate = {
        appId: null, // Will be assigned by master-key-assigner
        name: srlFood.name,
        primarySource: 'Foundation',
        primaryFDC: matchResult.match.sourceId,
        primaryNutrients: matchResult.match.nutrientsPer100g,
        refSource: 'SR Legacy',
        refFDC: srlFood.sourceId,
        refMeasures: srlFood.measures,
        waterContent: srlFood.waterContent,
        prepState: srlFood.prepState,
        foodCategory: srlFood.foodCategory,
        matchScore: matchResult.score,
        stateMatch: matchResult.stateMatch,
        densityWarning: matchResult.densityWarning,
        densityVariance: matchResult.densityVariance,
        // Fallback nutrients in case of density issues
        fallbackNutrients: srlFood.nutrientsPer100g
      };

      if (matchResult.densityWarning) {
        stats.densityWarnings++;
        action = 'REVIEW';
      } else {
        action = 'ACCEPT';
      }
      stats.ffPrimaryWithSrlMeasures++;
    } else {
      // No FF match - use SRL for both nutrients and measures
      candidate = {
        appId: null,
        name: srlFood.name,
        primarySource: 'SR Legacy',
        primaryFDC: srlFood.sourceId,
        primaryNutrients: srlFood.nutrientsPer100g,
        refSource: 'SR Legacy',
        refFDC: srlFood.sourceId,
        refMeasures: srlFood.measures,
        waterContent: srlFood.waterContent,
        prepState: srlFood.prepState,
        foodCategory: srlFood.foodCategory,
        matchScore: null,
        stateMatch: null,
        densityWarning: false,
        densityVariance: null
      };
      action = 'SRL_ONLY';
      stats.srlOnly++;
    }

    candidates.push(candidate);
    stats.totalCandidates++;

    // Audit row
    if (config.generateAudit) {
      auditRows.push({
        name: candidate.name,
        primarySource: candidate.primarySource,
        primaryFDC: candidate.primaryFDC,
        refFDC: candidate.refFDC,
        score: candidate.matchScore !== null ? candidate.matchScore.toFixed(3) : 'N/A',
        stateMatch: candidate.stateMatch !== null ? candidate.stateMatch.toString() : 'N/A',
        densityWarning: candidate.densityWarning.toString(),
        action: action
      });
    }
  }

  // Process FF-only foods (not in SRL)
  console.log('Processing Foundation Foods only entries...');
  const srlFDCIds = new Set(srlFoods.map(f => f.sourceId));
  const matchedFFIds = new Set(
    candidates
      .filter(c => c.primarySource === 'Foundation')
      .map(c => c.primaryFDC)
  );

  for (const ffFood of ffFoods) {
    // Skip if this FF was already matched to an SRL food
    if (matchedFFIds.has(ffFood.sourceId)) {
      continue;
    }

    // This is an FF-only food
    const candidate = {
      appId: null,
      name: ffFood.name,
      primarySource: 'Foundation',
      primaryFDC: ffFood.sourceId,
      primaryNutrients: ffFood.nutrientsPer100g,
      refSource: 'Foundation',
      refFDC: ffFood.sourceId,
      refMeasures: ffFood.measures,
      waterContent: ffFood.waterContent,
      prepState: ffFood.prepState,
      foodCategory: ffFood.foodCategory,
      matchScore: null,
      stateMatch: null,
      densityWarning: false,
      densityVariance: null
    };

    candidates.push(candidate);
    stats.totalCandidates++;
    stats.ffOnly++;

    if (config.generateAudit) {
      auditRows.push({
        name: candidate.name,
        primarySource: 'Foundation',
        primaryFDC: candidate.primaryFDC,
        refFDC: candidate.refFDC,
        score: 'N/A',
        stateMatch: 'N/A',
        densityWarning: 'false',
        action: 'FF_ONLY'
      });
    }
  }

  // Output statistics
  console.log('\n=== Candidate Generation Statistics ===');
  console.log(`Total candidates: ${stats.totalCandidates}`);
  console.log(`FF primary + SRL measures: ${stats.ffPrimaryWithSrlMeasures} (${(stats.ffPrimaryWithSrlMeasures / stats.totalCandidates * 100).toFixed(1)}%)`);
  console.log(`SRL only (no FF match): ${stats.srlOnly} (${(stats.srlOnly / stats.totalCandidates * 100).toFixed(1)}%)`);
  console.log(`FF only (new foods): ${stats.ffOnly} (${(stats.ffOnly / stats.totalCandidates * 100).toFixed(1)}%)`);
  console.log(`Density warnings: ${stats.densityWarnings}`);

  // Write output
  const output = {
    metadata: {
      ...inputData.metadata,
      generated: new Date().toISOString(),
      generator: 'candidate-generator.cjs',
      matchThreshold: config.matchThreshold,
      stats: stats
    },
    candidates: candidates
  };

  const outputPath = `${config.outputFile}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten: ${outputPath} (${candidates.length} candidates)`);

  // Write audit CSV if requested
  if (config.generateAudit && auditRows.length > 0) {
    const csvPath = `${config.outputFile}_review.csv`;
    const csvHeader = 'name,primarySource,primaryFDC,refFDC,score,stateMatch,densityWarning,action\n';
    const csvRows = auditRows.map(row =>
      `"${row.name.replace(/"/g, '""')}",${row.primarySource},${row.primaryFDC},${row.refFDC},${row.score},${row.stateMatch},${row.densityWarning},${row.action}`
    ).join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`Written: ${csvPath} (audit CSV)`);
  }

  console.log('\n=== Candidate Generation Complete ===\n');
}

// Run
if (require.main === module) {
  main();
}

module.exports = {
  tokenize,
  jaccardSimilarity,
  statesCompatible,
  checkDensityCompatibility,
  findBestFFMatch
};
