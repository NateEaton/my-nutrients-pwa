#!/usr/bin/env node

/**
 * data-audit.cjs - Comprehensive Data Integrity Validator
 *
 * Validates the app database against original USDA FDC source files by:
 * 1. Loading the final app database module (foodDatabaseData.js)
 * 2. Loading provenance data (static/data/provenance/)
 * 3. Loading original FDC JSON files (Foundation Foods, SR Legacy)
 * 4. Tracing each food, serving, and nutrient back to source
 * 5. Reporting discrepancies with configurable tolerance
 *
 * Usage: node data-audit.cjs [OPTIONS]
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const DEFAULT_CONFIG = {
  appDbPath: '../src/lib/data/foodDatabaseData.js',
  provenanceDir: '../static/data/provenance',
  foundationPath: 'FoodData_Central_foundation_food_json_2025-04-24.json',
  srLegacyPath: 'FoodData_Central_sr_legacy_food_json_2018-04.json',
  // Tolerance for nutrient comparisons (as fraction)
  nutrientTolerance: 0.01,     // 1% tolerance for rounding
  servingTolerance: 0.02,      // 2% tolerance for serving calculations
  // Sampling options
  sampleSize: null,            // null = audit all, number = random sample
  verbose: false,
  outputFile: 'audit_report',
};

// Nutrient ID mapping from USDA to app property names
const NUTRIENT_MAPPING = {
  '203': 'protein',
  '204': 'fat',
  '205': 'carbohydrates',
  '208': 'calories',
  '269': 'sugars',
  '291': 'fiber',
  '301': 'calcium',
  '303': 'iron',
  '304': 'magnesium',
  '305': 'phosphorus',
  '306': 'potassium',
  '307': 'sodium',
  '309': 'zinc',
  '312': 'copper',
  '315': 'manganese',
  '317': 'selenium',
  '320': 'vitaminA',
  '323': 'vitaminE',
  '324': 'vitaminD_IU',
  '328': 'vitaminD',
  '401': 'vitaminC',
  '404': 'thiamin',
  '405': 'riboflavin',
  '406': 'niacin',
  '410': 'pantothenicAcid',
  '415': 'vitaminB6',
  '435': 'folate',    // Folate, DFE (matches usda-fdc-json-config.json)
  '418': 'vitaminB12',
  '421': 'choline',
  '430': 'vitaminK',
  '601': 'cholesterol',
  '606': 'saturatedFat',
  '645': 'monounsaturatedFat',
  '646': 'polyunsaturatedFat',
  // Omega fatty acids - IDs must match usda-fdc-json-config.json
  '851': 'omega3ALA',   // 18:3 n-3 (alpha-linolenic)
  '629': 'omega3EPA',   // 20:5 n-3 (eicosapentaenoic)
  '621': 'omega3DHA',   // 22:6 n-3 (docosahexaenoic)
  '675': 'omega6',      // 18:2 n-6 (linoleic acid)
};

// --- Rounding Logic (must match data-module-generator-nutrients.cjs) ---

/**
 * Nutrient precision configuration - copied from generator
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

  // Omega fatty acids (g) - 3 decimal places
  omega3: 3,
  omega3ALA: 3,
  omega3EPA: 3,
  omega3DHA: 3,
  omega6: 3,

  // Minerals (mg) - dynamic based on magnitude
  calcium: 'dynamic',
  magnesium: 'dynamic',
  potassium: 'dynamic',
  iron: 'dynamic',
  zinc: 'dynamic',

  // Vitamins in mcg - dynamic
  vitaminD: 'dynamic',
  vitaminB12: 'dynamic',
  folate: 'dynamic',
  vitaminA: 'dynamic',
  vitaminK: 'dynamic',

  // Vitamins in mg - 1 decimal place
  vitaminB6: 1,
  vitaminC: 1,
};

/**
 * Round nutrient value using same logic as generator
 */
function roundNutrientValue(nutrientKey, value) {
  if (value == null || isNaN(value)) return 0;
  if (value === 0) return 0;

  const precision = NUTRIENT_PRECISION[nutrientKey];

  // Dynamic precision based on magnitude
  if (precision === 'dynamic') {
    if (value >= 10) {
      return Math.round(value);
    } else if (value >= 1) {
      return Math.round(value * 10) / 10;
    } else {
      return Math.round(value * 100) / 100;
    }
  }

  // Fixed precision (or default to 2 decimals if unknown nutrient)
  const factor = Math.pow(10, precision || 2);
  return Math.round(value * factor) / factor;
}

/**
 * Round all nutrients in an object using generator logic
 */
function roundNutrients(nutrients) {
  if (!nutrients || typeof nutrients !== 'object') return {};

  const rounded = {};
  for (const [key, value] of Object.entries(nutrients)) {
    if (typeof value === 'number') {
      rounded[key] = roundNutrientValue(key, value);
    }
  }
  return rounded;
}

// --- Argument Parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--app-db':
        config.appDbPath = args[++i];
        break;
      case '--provenance':
        config.provenanceDir = args[++i];
        break;
      case '--foundation':
        config.foundationPath = args[++i];
        break;
      case '--sr-legacy':
        config.srLegacyPath = args[++i];
        break;
      case '--tolerance':
        config.nutrientTolerance = parseFloat(args[++i]);
        break;
      case '--sample':
        config.sampleSize = parseInt(args[++i], 10);
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--output':
      case '-o':
        config.outputFile = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
Data Audit Tool - Validate app database against FDC sources

Usage: node data-audit.cjs [OPTIONS]

Options:
  --app-db <path>       Path to foodDatabaseData.js (default: ../src/lib/data/foodDatabaseData.js)
  --provenance <dir>    Path to provenance directory (default: ../static/data/provenance)
  --foundation <path>   Path to Foundation Foods JSON
  --sr-legacy <path>    Path to SR Legacy JSON
  --tolerance <n>       Nutrient comparison tolerance as fraction (default: 0.01)
  --sample <n>          Audit random sample of N foods (default: all)
  --verbose, -v         Show detailed progress and matches
  --output, -o <name>   Output file base name (default: audit_report)
  --help, -h            Show this help

Output:
  - audit_report.json   Machine-readable detailed results
  - audit_report.txt    Human-readable summary

Examples:
  node data-audit.cjs                           # Full audit
  node data-audit.cjs --sample 100 --verbose    # Audit 100 random foods with details
  node data-audit.cjs --tolerance 0.05          # Use 5% tolerance
`);
}

// --- Data Loading ---

/**
 * Load app database from JS module
 */
function loadAppDatabase(filePath) {
  console.log(`📖 Loading app database: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf8');

  // Extract exports using regex (since we can't use import())
  const keysMatch = content.match(/export const KEYS\s*=\s*(\{[^}]+\})/);
  const measureKeysMatch = content.match(/export const MEASURE_KEYS\s*=\s*(\{[^}]+\})/);

  // For DB, find the start and extract to the end marker
  const dbStartMatch = content.match(/export const DB\s*=\s*\[/);

  if (!keysMatch || !dbStartMatch) {
    throw new Error('Could not parse app database format');
  }

  // Parse the key mappings
  const KEYS = JSON.parse(keysMatch[1].replace(/'/g, '"'));
  const MEASURE_KEYS = measureKeysMatch ? JSON.parse(measureKeysMatch[1].replace(/'/g, '"')) : null;

  // Extract DB array - find the position and parse from there
  const dbStart = content.indexOf('export const DB = [') + 'export const DB = '.length;
  let dbEnd = content.length;

  // Find the end of the DB array by looking for the closing bracket
  // followed by a semicolon or export statement
  const afterDbStart = content.substring(dbStart);
  const endPatterns = ['];', '];\n', ']\nexport', '];\r\nexport'];

  for (const pattern of endPatterns) {
    const idx = afterDbStart.lastIndexOf(pattern);
    if (idx !== -1) {
      dbEnd = dbStart + idx + (pattern.startsWith('];') ? 1 : 1);
      break;
    }
  }

  // Try to find end by matching brackets
  let bracketCount = 0;
  let foundStart = false;
  for (let i = dbStart; i < content.length; i++) {
    const char = content[i];
    if (char === '[') {
      bracketCount++;
      foundStart = true;
    } else if (char === ']') {
      bracketCount--;
      if (foundStart && bracketCount === 0) {
        dbEnd = i + 1;
        break;
      }
    }
  }

  const dbStr = content.substring(dbStart, dbEnd);

  let DB;
  try {
    DB = JSON.parse(dbStr);
  } catch (e) {
    throw new Error(`Could not parse DB array: ${e.message}`);
  }

  console.log(`   Found ${DB.length} foods`);
  console.log(`   Keys: ${Object.keys(KEYS).join(', ')}`);

  // Rehydrate foods
  const foods = DB.map(minFood => {
    const food = {};
    for (const [minKey, fullKey] of Object.entries(KEYS)) {
      if (minFood[minKey] !== undefined) {
        food[fullKey] = minFood[minKey];
      }
    }

    // Rehydrate measures
    if (food.measures && MEASURE_KEYS) {
      food.measures = food.measures.map(minMeasure => {
        const measure = {};
        for (const [minKey, fullKey] of Object.entries(MEASURE_KEYS)) {
          if (minMeasure[minKey] !== undefined) {
            measure[fullKey] = minMeasure[minKey];
          }
        }
        return measure;
      });
    }

    return food;
  });

  return { foods, KEYS, MEASURE_KEYS };
}

/**
 * Load all provenance files
 */
function loadProvenance(provenanceDir) {
  console.log(`📖 Loading provenance data: ${provenanceDir}`);

  const provenance = {};
  const files = fs.readdirSync(provenanceDir)
    .filter(f => f.startsWith('provenance_') && f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(provenanceDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    Object.assign(provenance, data);
  }

  console.log(`   Loaded ${Object.keys(provenance).length} provenance records from ${files.length} files`);
  return provenance;
}

/**
 * Load FDC source file and build lookup index
 */
function loadFDCSource(filePath, sourceType) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${sourceType} file not found: ${filePath}`);
    return null;
  }

  console.log(`📖 Loading ${sourceType}: ${filePath}`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Find the foods array
  let foods = null;
  if (sourceType === 'Foundation' && data.FoundationFoods) {
    foods = data.FoundationFoods;
  } else if (sourceType === 'SR Legacy' && data.SRLegacyFoods) {
    foods = data.SRLegacyFoods;
  } else if (Array.isArray(data)) {
    foods = data;
  }

  if (!foods) {
    console.log(`⚠️  Could not find foods array in ${sourceType}`);
    return null;
  }

  // Build lookup by FDC ID
  const byId = new Map();
  for (const food of foods) {
    const fdcId = food.fdcId;
    if (fdcId) {
      byId.set(fdcId, food);
    }
  }

  console.log(`   Indexed ${byId.size} foods by FDC ID`);
  return { foods, byId };
}

/**
 * Extract nutrients from FDC food object
 */
function extractFDCNutrients(fdcFood) {
  const nutrients = {};

  if (!fdcFood.foodNutrients) return nutrients;

  for (const fn of fdcFood.foodNutrients) {
    const nutrientNumber = fn.nutrient?.number || fn.nutrient?.id?.toString();
    const amount = fn.amount;

    if (nutrientNumber && amount !== undefined && amount !== null) {
      const propName = NUTRIENT_MAPPING[nutrientNumber];
      if (propName) {
        nutrients[propName] = amount;
      }
    }
  }

  // Calculate omega3 total if components exist
  if (nutrients.omega3ALA || nutrients.omega3EPA || nutrients.omega3DHA) {
    nutrients.omega3 = (nutrients.omega3ALA || 0) +
                       (nutrients.omega3EPA || 0) +
                       (nutrients.omega3DHA || 0);
  }

  return nutrients;
}

/**
 * Extract portions from FDC food object
 */
function extractFDCPortions(fdcFood) {
  const portions = [];

  if (!fdcFood.foodPortions) return portions;

  for (const portion of fdcFood.foodPortions) {
    const gramWeight = portion.gramWeight;
    if (!gramWeight || gramWeight <= 0) continue;

    let measureStr = '';
    const value = portion.value || 1;
    const unit = portion.measureUnit?.name || portion.measureUnit?.abbreviation || 'serving';
    const modifier = portion.modifier || '';

    if (unit.toLowerCase() !== 'undetermined') {
      measureStr = `${value} ${unit}`;
      if (modifier && modifier.toLowerCase() !== 'undetermined' && modifier.toLowerCase() !== unit.toLowerCase()) {
        measureStr += ` (${modifier})`;
      }
    } else if (modifier && modifier.toLowerCase() !== 'undetermined') {
      measureStr = `${value} ${modifier}`;
    } else {
      measureStr = `${value} serving`;
    }

    portions.push({
      measure: measureStr.trim(),
      gramWeight
    });
  }

  return portions;
}

// --- Comparison Functions ---

/**
 * Compare two nutrient values with tolerance
 * @param {string} nutrientKey - The nutrient name for rounding lookup
 * @param {number} appValue - Value from app database or provenance
 * @param {number} sourceValue - Value from source
 * @param {number} tolerance - Allowed relative difference
 * @param {boolean} applyRounding - If true, apply generator rounding to sourceValue (for app vs prov/fdc comparisons)
 */
function compareNutrients(nutrientKey, appValue, sourceValue, tolerance, applyRounding = true) {
  if (appValue === undefined && sourceValue === undefined) return { match: true };
  if (appValue === undefined || sourceValue === undefined) {
    return {
      match: false,
      issue: 'missing',
      appValue,
      sourceValue
    };
  }

  // Optionally apply rounding to source value (only for app-to-source comparisons)
  const compareValue = applyRounding ? roundNutrientValue(nutrientKey, sourceValue) : sourceValue;

  // Handle zero cases
  if (compareValue === 0 && appValue === 0) return { match: true };
  if (compareValue === 0) {
    return {
      match: appValue < 0.01, // Allow tiny values when source is 0
      issue: appValue >= 0.01 ? 'unexpected_value' : null,
      appValue,
      sourceValue: compareValue,
      originalSourceValue: applyRounding ? sourceValue : undefined,
      diff: appValue
    };
  }

  const diff = Math.abs(appValue - compareValue);
  const relDiff = diff / Math.abs(compareValue);

  return {
    match: relDiff <= tolerance,
    issue: relDiff > tolerance ? 'value_mismatch' : null,
    appValue,
    sourceValue: compareValue,
    originalSourceValue: applyRounding ? sourceValue : undefined,
    diff,
    relDiff
  };
}

/**
 * Audit a single food against source data
 */
function auditFood(appFood, provenance, fdcSources, config) {
  const result = {
    appId: appFood.id,
    name: appFood.name,
    status: 'pass',
    issues: [],
    details: {}
  };

  // Get provenance records
  const provRecords = provenance[appFood.id] || provenance[String(appFood.id)];
  if (!provRecords || provRecords.length === 0) {
    result.status = 'warning';
    result.issues.push({
      type: 'no_provenance',
      message: 'No provenance record found'
    });
    return result;
  }

  result.details.provenanceCount = provRecords.length;

  // Check each provenance record
  for (const prov of provRecords) {
    const fdcId = prov.fdcId;

    // Find in FDC sources
    let fdcFood = null;
    let sourceType = null;

    if (fdcSources.foundation?.byId.has(fdcId)) {
      fdcFood = fdcSources.foundation.byId.get(fdcId);
      sourceType = 'Foundation';
    } else if (fdcSources.srLegacy?.byId.has(fdcId)) {
      fdcFood = fdcSources.srLegacy.byId.get(fdcId);
      sourceType = 'SR Legacy';
    }

    if (!fdcFood) {
      result.issues.push({
        type: 'fdc_not_found',
        fdcId,
        message: `FDC ID ${fdcId} not found in source files`
      });
      continue;
    }

    result.details.sourceType = sourceType;
    result.details.fdcId = fdcId;

    // Compare provenance nutrients to FDC source (per 100g)
    const fdcNutrients = extractFDCNutrients(fdcFood);
    const provNutrients = prov.nutrients || {};

    const nutrientComparisons = {};
    const allNutrients = new Set([...Object.keys(fdcNutrients), ...Object.keys(provNutrients)]);

    for (const nutrient of allNutrients) {
      // Compare provenance to FDC without rounding - both should have original values
      const comparison = compareNutrients(
        nutrient,
        provNutrients[nutrient],
        fdcNutrients[nutrient],
        config.nutrientTolerance,
        false  // Don't apply rounding - comparing two original sources
      );

      if (!comparison.match) {
        nutrientComparisons[nutrient] = comparison;
        if (comparison.issue === 'value_mismatch') {
          result.issues.push({
            type: 'nutrient_mismatch',
            nutrient,
            provValue: provNutrients[nutrient],
            fdcValue: fdcNutrients[nutrient],
            diff: comparison.relDiff,
            message: `${nutrient}: prov=${provNutrients[nutrient]?.toFixed(3)} vs fdc=${fdcNutrients[nutrient]?.toFixed(3)} (${(comparison.relDiff * 100).toFixed(1)}% diff)`
          });
        }
      }
    }

    result.details.nutrientComparisons = nutrientComparisons;
  }

  // Check app food measures against 100g calculation
  if (appFood.measures && appFood.measures.length > 0) {
    const measure100g = appFood.measures.find(m =>
      m.measure?.includes('100') && m.measure?.toLowerCase().includes('g')
    );

    if (measure100g && provRecords[0]?.nutrients) {
      const provNutrients = provRecords[0].nutrients;
      const appNutrients = measure100g.nutrients;

      if (appNutrients) {
        for (const [nutrient, appValue] of Object.entries(appNutrients)) {
          const provValue = provNutrients[nutrient];
          if (provValue !== undefined) {
            const comparison = compareNutrients(nutrient, appValue, provValue, config.nutrientTolerance);
            if (!comparison.match && comparison.issue === 'value_mismatch') {
              result.issues.push({
                type: 'app_100g_mismatch',
                nutrient,
                appValue,
                provValue,
                diff: comparison.relDiff,
                message: `100g measure ${nutrient}: app=${appValue?.toFixed(3)} vs prov=${provValue?.toFixed(3)}`
              });
            }
          }
        }
      }
    }

    // Check serving calculations
    for (const measure of appFood.measures) {
      if (!measure.gramWeight || !measure.nutrients) continue;
      if (measure.measure?.includes('100') && measure.measure?.toLowerCase().includes('g')) continue;

      const scaleFactor = measure.gramWeight / 100;
      const baseNutrients = provRecords[0]?.nutrients || {};

      for (const [nutrient, appValue] of Object.entries(measure.nutrients)) {
        const baseValue = baseNutrients[nutrient];
        if (baseValue === undefined) continue;

        const expectedValue = baseValue * scaleFactor;
        const comparison = compareNutrients(nutrient, appValue, expectedValue, config.servingTolerance);

        if (!comparison.match && comparison.issue === 'value_mismatch' && Math.abs(comparison.diff) > 0.5) {
          result.issues.push({
            type: 'serving_calculation',
            measure: measure.measure,
            nutrient,
            appValue,
            expectedValue,
            gramWeight: measure.gramWeight,
            diff: comparison.relDiff,
            message: `Serving "${measure.measure}" ${nutrient}: app=${appValue?.toFixed(2)} vs expected=${expectedValue?.toFixed(2)}`
          });
        }
      }
    }
  }

  // Determine overall status
  const criticalIssues = result.issues.filter(i =>
    i.type === 'nutrient_mismatch' ||
    i.type === 'app_100g_mismatch' ||
    i.type === 'fdc_not_found'
  );

  if (criticalIssues.length > 0) {
    result.status = 'fail';
  } else if (result.issues.length > 0) {
    result.status = 'warning';
  }

  return result;
}

// --- Main Audit Function ---

async function main() {
  const config = parseArgs();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Data Audit Tool - Validate App Database Against FDC Sources');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  // Load data
  const { foods: appFoods } = loadAppDatabase(config.appDbPath);
  const provenance = loadProvenance(config.provenanceDir);

  const fdcSources = {
    foundation: loadFDCSource(config.foundationPath, 'Foundation'),
    srLegacy: loadFDCSource(config.srLegacyPath, 'SR Legacy')
  };

  if (!fdcSources.foundation && !fdcSources.srLegacy) {
    console.error('\n❌ Error: No FDC source files could be loaded');
    console.log('   Please provide --foundation and/or --sr-legacy paths');
    process.exit(1);
  }

  console.log('');

  // Select foods to audit
  let foodsToAudit = appFoods;
  if (config.sampleSize && config.sampleSize < appFoods.length) {
    // Random sample
    foodsToAudit = [];
    const indices = new Set();
    while (indices.size < config.sampleSize) {
      indices.add(Math.floor(Math.random() * appFoods.length));
    }
    for (const idx of indices) {
      foodsToAudit.push(appFoods[idx]);
    }
    console.log(`📊 Auditing random sample of ${config.sampleSize} foods\n`);
  } else {
    console.log(`📊 Auditing all ${appFoods.length} foods\n`);
  }

  // Run audit
  const results = [];
  const stats = {
    total: foodsToAudit.length,
    pass: 0,
    warning: 0,
    fail: 0,
    issuesByType: {}
  };

  let lastProgress = 0;
  for (let i = 0; i < foodsToAudit.length; i++) {
    const food = foodsToAudit[i];
    const result = auditFood(food, provenance, fdcSources, config);
    results.push(result);

    // Update stats
    stats[result.status]++;
    for (const issue of result.issues) {
      stats.issuesByType[issue.type] = (stats.issuesByType[issue.type] || 0) + 1;
    }

    // Progress
    const progress = Math.floor((i + 1) / foodsToAudit.length * 100);
    if (progress >= lastProgress + 10) {
      process.stdout.write(`   Progress: ${progress}%\r`);
      lastProgress = progress;
    }

    // Verbose output
    if (config.verbose && result.status !== 'pass') {
      console.log(`\n[${result.status.toUpperCase()}] ${result.name} (${result.appId})`);
      for (const issue of result.issues) {
        console.log(`   - ${issue.message}`);
      }
    }
  }

  console.log('');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Generate report
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Audit Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Total foods audited: ${stats.total}`);
  console.log(`✅ Pass:    ${stats.pass} (${(stats.pass / stats.total * 100).toFixed(1)}%)`);
  console.log(`⚠️  Warning: ${stats.warning} (${(stats.warning / stats.total * 100).toFixed(1)}%)`);
  console.log(`❌ Fail:    ${stats.fail} (${(stats.fail / stats.total * 100).toFixed(1)}%)`);

  console.log('\nIssues by type:');
  for (const [type, count] of Object.entries(stats.issuesByType).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type}: ${count}`);
  }

  console.log(`\nAudit completed in ${elapsed}s`);

  // Write reports
  const jsonReport = {
    meta: {
      timestamp: new Date().toISOString(),
      duration: elapsed,
      config: {
        nutrientTolerance: config.nutrientTolerance,
        servingTolerance: config.servingTolerance,
        sampleSize: config.sampleSize
      }
    },
    summary: stats,
    results: results.filter(r => r.status !== 'pass') // Only include non-passing
  };

  const jsonPath = `${config.outputFile}.json`;
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`\n📄 Detailed report: ${jsonPath}`);

  // Text report
  let textReport = `Data Audit Report
Generated: ${new Date().toISOString()}
Duration: ${elapsed}s

SUMMARY
-------
Total foods: ${stats.total}
Pass: ${stats.pass} (${(stats.pass / stats.total * 100).toFixed(1)}%)
Warning: ${stats.warning} (${(stats.warning / stats.total * 100).toFixed(1)}%)
Fail: ${stats.fail} (${(stats.fail / stats.total * 100).toFixed(1)}%)

ISSUES BY TYPE
--------------
`;

  for (const [type, count] of Object.entries(stats.issuesByType).sort((a, b) => b[1] - a[1])) {
    textReport += `${type}: ${count}\n`;
  }

  textReport += `\nFAILED FOODS (${stats.fail})\n${'='.repeat(50)}\n`;
  for (const result of results.filter(r => r.status === 'fail').slice(0, 100)) {
    textReport += `\n[FAIL] ${result.name} (ID: ${result.appId})\n`;
    for (const issue of result.issues) {
      textReport += `  - ${issue.message}\n`;
    }
  }

  if (stats.fail > 100) {
    textReport += `\n... and ${stats.fail - 100} more failures (see JSON report)\n`;
  }

  textReport += `\nWARNINGS (${stats.warning})\n${'='.repeat(50)}\n`;
  for (const result of results.filter(r => r.status === 'warning').slice(0, 50)) {
    textReport += `\n[WARN] ${result.name} (ID: ${result.appId})\n`;
    for (const issue of result.issues) {
      textReport += `  - ${issue.message}\n`;
    }
  }

  if (stats.warning > 50) {
    textReport += `\n... and ${stats.warning - 50} more warnings (see JSON report)\n`;
  }

  const textPath = `${config.outputFile}.txt`;
  fs.writeFileSync(textPath, textReport);
  console.log(`📄 Summary report: ${textPath}`);

  // Exit code based on results
  if (stats.fail > 0) {
    console.log('\n⚠️  Audit completed with failures');
    process.exit(1);
  } else if (stats.warning > stats.total * 0.1) {
    console.log('\n⚠️  Audit completed with many warnings');
    process.exit(0);
  } else {
    console.log('\n✅ Audit passed!');
    process.exit(0);
  }
}

// Run
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
