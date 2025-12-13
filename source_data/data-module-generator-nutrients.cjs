#!/usr/bin/env node

/**
 * data-module-generator-nutrients.cjs
 *
 * **Multi-Nutrient Version**
 * Generates app-ready database modules from curated multi-nutrient JSON data.
 *
 * Features:
 * - Handles nutrients objects in measures
 * - Generates ready-to-use JS modules with exports
 * - Optional minification for smaller bundle size
 * - Minimal output option (strips metadata)
 */

const fs = require("fs");
const path = require("path");

// --- Argument Parsing ---
const args = process.argv.slice(2);
const fileArgs = [];
let moduleOutput = false;
let minify = false;
let minimal = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "--module":
      moduleOutput = true;
      break;
    case "--minify":
      minify = true;
      break;
    case "--minimal":
      minimal = true;
      break;
    default:
      if (arg.startsWith("--") || arg.startsWith("-")) {
        console.error(`❌ Error: Unknown parameter '${arg}'`);
        console.error(`Valid parameters: --module, --minify, --minimal`);
        process.exit(1);
      } else {
        fileArgs.push(arg);
      }
      break;
  }
}

const inputFile = fileArgs[0];
const outputFile = fileArgs[1] || "foodDatabaseData.js";

if (!inputFile) {
  console.error(
    "Usage: node data-module-generator-nutrients.cjs <curated.json> [output.js] [--module] [--minify] [--minimal]"
  );
  console.error("  --module: Generate JS module with exports (recommended)");
  console.error("  --minify: Compress object keys to reduce bundle size");
  console.error("  --minimal: Strip metadata fields for smaller app bundle");
  process.exit(1);
}

// --- Key Minification Mappings ---
const KEY_MAPPINGS = {
  id: "i",
  name: "n",
  measures: "ms",
  nutrientsPer100g: "n100",
  sourceId: "si",
  sourceName: "sn",
};

const MEASURE_MAPPINGS = {
  measure: "s", // s = serving
  nutrients: "n", // n = nutrients
  gramWeight: "g", // g = grams
};

// Nutrient name minification (optional, for extreme size reduction)
const NUTRIENT_MAPPINGS = {
  protein: "p",
  fiber: "f",
  carbohydrates: "ch",
  sugars: "su",
  fat: "ft",
  saturatedFat: "sf",
  monounsaturatedFat: "mf",
  polyunsaturatedFat: "pf",
  omega3: "o3",
  omega3ALA: "oa",
  omega3EPA: "oe",
  omega3DHA: "od",
  omega6: "o6",
  calcium: "ca",
  magnesium: "mg",
  potassium: "k",
  iron: "fe",
  zinc: "zn",
  vitaminD: "vd",
  vitaminB12: "vb",
  folate: "fo",
  vitaminB6: "v6",
  vitaminA: "va",
  vitaminC: "vc",
  vitaminK: "vk",
};

// --- Utility Functions ---

/**
 * Nutrient precision configuration
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

  // Omega fatty acids (g) - 2-3 decimal places (often very small values)
  omega3: 3,
  omega3ALA: 3,
  omega3EPA: 3,
  omega3DHA: 3,
  omega6: 3,

  // Minerals (mg) - 0-1 decimal places based on magnitude
  calcium: 'dynamic', // 0 decimals if >10, 1 decimal if <10
  magnesium: 'dynamic',
  potassium: 'dynamic',
  iron: 'dynamic',
  zinc: 'dynamic',

  // Vitamins in mcg - 1-2 decimal places based on magnitude
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
 * Round nutrient value to appropriate precision
 * @param {string} nutrientKey - The nutrient identifier
 * @param {number} value - The raw nutrient value
 * @returns {number} Rounded value
 */
function roundNutrientValue(nutrientKey, value) {
  if (value == null || isNaN(value)) return 0;
  if (value === 0) return 0;

  const precision = NUTRIENT_PRECISION[nutrientKey];

  // Dynamic precision based on magnitude
  if (precision === 'dynamic') {
    if (value >= 10) {
      // Whole numbers for large values
      return Math.round(value);
    } else if (value >= 1) {
      // 1 decimal for medium values
      return Math.round(value * 10) / 10;
    } else {
      // 2 decimals for small values
      return Math.round(value * 100) / 100;
    }
  }

  // Fixed precision
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Round all nutrients in a nutrients object
 * @param {Object} nutrients - Object with nutrient key-value pairs
 * @param {boolean} omitZeros - Whether to omit zero values
 * @returns {Object} Rounded nutrients object
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

function loadInputData(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Input file not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`📖 Loading: ${filePath}`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (!data.foods || !Array.isArray(data.foods)) {
    console.error(`❌ Invalid format. Expected {metadata, foods: [...]} structure`);
    process.exit(1);
  }

  return data;
}

function minifyObject(obj, mappings) {
  const minified = {};
  for (const [key, value] of Object.entries(obj)) {
    const minKey = mappings[key] || key;
    minified[minKey] = value;
  }
  return minified;
}

function processFood(food, options) {
  const processed = {
    id: food.id || food.appId,
    name: food.name,
  };

  // Process measures array
  if (food.measures && Array.isArray(food.measures)) {
    processed.measures = food.measures.map((measure) => {
      // Round nutrients and optionally omit zeros
      const roundedNutrients = roundNutrients(measure.nutrients || {}, true);

      const processedMeasure = {
        measure: measure.measure,
        nutrients: roundedNutrients,
      };

      if (options.minify) {
        return minifyObject(processedMeasure, MEASURE_MAPPINGS);
      }
      return processedMeasure;
    });
  }

  // Add metadata if not minimal
  if (!options.minimal) {
    if (food.nutrientsPer100g) {
      // Also round nutrientsPer100g
      processed.nutrientsPer100g = roundNutrients(food.nutrientsPer100g, true);
    }
    if (food.sourceId) {
      processed.sourceId = food.sourceId;
    }
    if (food.sourceName) {
      processed.sourceName = food.sourceName;
    }
  }

  // Apply minification to top-level keys
  if (options.minify) {
    return minifyObject(processed, KEY_MAPPINGS);
  }

  return processed;
}

function generateModule(foods, metadata, options) {
  const processedFoods = foods.map((food) => processFood(food, options));

  let output = "";

  if (options.module) {
    // Generate ES module
    output += "/**\n";
    output += " * Food Database Data\n";
    output += " * Generated by data-module-generator-nutrients.cjs\n";
    output += ` * ${metadata?.description || "Comprehensive food database from USDA FoodData Central with multi-nutrient data for nutrition tracking"}\n`;
    output += ` * Generated: ${new Date().toISOString()}\n`;
    output += ` * Total Foods: ${processedFoods.length}\n`;
    if (options.minify) {
      output += " * Format: Minified\n";
    }
    if (options.minimal) {
      output += " * Mode: Minimal (metadata stripped)\n";
    }
    output += " */\n\n";

    if (options.minify) {
      // MINIFIED FORMAT - Must match what foodDatabase.js expects
      // Add key mappings as comments for reference
      output += "// Key Mappings:\n";
      output += "// " + JSON.stringify(KEY_MAPPINGS, null, 2).replace(/\n/g, "\n// ") + "\n";
      output += `// Measure Mappings: ${JSON.stringify(MEASURE_MAPPINGS)}\n\n`;

      // Reverse the mappings for rehydration
      const keyMappingsReverse = {};
      for (const [original, minified] of Object.entries(KEY_MAPPINGS)) {
        keyMappingsReverse[minified] = original;
      }

      const measureMappingsReverse = {};
      for (const [original, minified] of Object.entries(MEASURE_MAPPINGS)) {
        measureMappingsReverse[minified] = original;
      }

      // Export with EXACT names that foodDatabase.js expects
      output += "// Key mappings for rehydration\n";
      output += `export const KEYS = ${JSON.stringify(keyMappingsReverse, null, 2)};\n\n`;
      output += "// Measure object key mappings for rehydration\n";
      output += `export const MEASURE_KEYS = ${JSON.stringify(measureMappingsReverse, null, 2)};\n\n`;
      output += "// Minified food database\n";
      output += `export const DB = ${JSON.stringify(processedFoods)};\n\n`;
      output += "// Format flag\n";
      output += `export const __minified__ = true;\n\n`;
    } else {
      // STANDARD FORMAT - Must match what foodDatabase.js expects
      output += "// Food database\n";
      output += `export const DEFAULT_FOOD_DATABASE = ${JSON.stringify(processedFoods, null, 2)};\n\n`;
      output += "// Format flag\n";
      output += `export const __minified__ = false;\n\n`;
    }

    // Export metadata
    output += "// Database metadata\n";
    output += `export const DATABASE_METADATA = ${JSON.stringify(metadata, null, 2)};\n`;
  } else {
    // Generate plain JSON
    output = JSON.stringify(processedFoods, null, 2);
  }

  return output;
}

// --- Main Execution ---

(async () => {
  try {
    console.log("🚀 Data Module Generator (Multi-Nutrient) - Starting...\n");

    const inputData = loadInputData(inputFile);
    console.log(`📊 Input: ${inputData.foods.length} foods`);

    const options = {
      module: moduleOutput,
      minify: minify,
      minimal: minimal,
    };

    console.log(`⚙️  Options:`);
    console.log(`   Module format: ${options.module ? "Yes" : "No"}`);
    console.log(`   Minified: ${options.minify ? "Yes" : "No"}`);
    console.log(`   Minimal: ${options.minimal ? "Yes" : "No"}`);
    console.log("");

    const output = generateModule(inputData.foods, inputData.metadata, options);

    // Write output
    fs.writeFileSync(outputFile, output, "utf-8");

    const fileSize = fs.statSync(outputFile).size;
    console.log(`✅ Generated: ${outputFile}`);
    console.log(`📦 Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Foods: ${inputData.foods.length}`);

    // Calculate some statistics
    let totalMeasures = 0;
    let totalNutrients = 0;
    const nutrientCounts = {};

    inputData.foods.forEach((food) => {
      if (food.measures) {
        totalMeasures += food.measures.length;
        food.measures.forEach((measure) => {
          if (measure.nutrients) {
            Object.keys(measure.nutrients).forEach((nutrient) => {
              nutrientCounts[nutrient] = (nutrientCounts[nutrient] || 0) + 1;
            });
          }
        });
      }
    });

    totalNutrients = Object.keys(nutrientCounts).length;

    console.log(`📈 Stats:`);
    console.log(`   Total measures: ${totalMeasures}`);
    console.log(`   Nutrients tracked: ${totalNutrients}`);
    console.log(`   Avg measures/food: ${(totalMeasures / inputData.foods.length).toFixed(1)}`);

    console.log("\n🎉 Module generation complete!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
