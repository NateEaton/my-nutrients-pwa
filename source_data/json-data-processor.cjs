#!/usr/bin/env node

/*
 * USDA FDC JSON Data Processor (v2.0 - Hybrid Pipeline)
 *
 * Processes USDA FoodData Central JSON files (Foundation Foods and SR Legacy)
 * and extracts multi-nutrient data for use in the My Nutrients application.
 *
 * Enhanced for hybrid data pipeline:
 * - Source type tagging (Foundation vs SR Legacy)
 * - Food category extraction (FDC category codes)
 * - Preparation state classification (raw, cooked, dry)
 * - Water content extraction for density validation
 *
 * Input: Foundation Foods JSON and SR Legacy JSON files
 * Output: Unified JSON format with all nutrients and metadata
 */

const fs = require('fs');
const path = require('path');

// Preparation state classification patterns
const STATE_PATTERNS = {
  raw: /\b(raw|fresh|uncooked)\b/i,
  cooked: /\b(cooked|boiled|baked|fried|roasted|steamed|grilled|braised|broiled|sauteed|stewed|poached|simmered)\b/i,
  dry: /\b(dry|dried|dehydrated|uncooked)\b/i,
  processed: /\b(canned|frozen|prepared|pickled|smoked|cured)\b/i
};

// Classify food preparation state
function classifyState(name) {
  const nameLower = name.toLowerCase();

  // Check for raw indicators
  if (STATE_PATTERNS.raw.test(nameLower)) {
    // Make sure it's not also cooked
    if (!STATE_PATTERNS.cooked.test(nameLower)) {
      return 'raw';
    }
  }

  // Check for cooked indicators
  if (STATE_PATTERNS.cooked.test(nameLower)) {
    return 'cooked';
  }

  // Check for dry indicators (but not if also cooked)
  if (STATE_PATTERNS.dry.test(nameLower) && !STATE_PATTERNS.cooked.test(nameLower)) {
    return 'dry';
  }

  // Check for processed indicators
  if (STATE_PATTERNS.processed.test(nameLower)) {
    return 'processed';
  }

  return 'unspecified';
}

// Extract FDC food category from food object
function extractFoodCategory(food) {
  // Foundation Foods use foodCategory object
  if (food.foodCategory) {
    return {
      code: food.foodCategory.code || food.foodCategory.id?.toString(),
      description: food.foodCategory.description || food.foodCategory.name
    };
  }

  // SR Legacy may use fdcCategory or similar
  if (food.fdcCategory) {
    return {
      code: food.fdcCategory.code || food.fdcCategory.id?.toString(),
      description: food.fdcCategory.description
    };
  }

  // Try to get from ndbNumber prefix (SR Legacy pattern)
  if (food.ndbNumber) {
    const prefix = food.ndbNumber.toString().substring(0, 2);
    return {
      code: prefix + '00',
      description: null
    };
  }

  return null;
}

// USDA water content nutrient number
const WATER_NUTRIENT_NUMBER = '255';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    foundationFile: null,
    srLegacyFile: null,
    outputFile: 'combined-nutrient-data',
    configFile: 'usda-fdc-json-config.json'
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--foundation' && i + 1 < args.length) {
      config.foundationFile = args[++i];
    } else if (args[i] === '--sr-legacy' && i + 1 < args.length) {
      config.srLegacyFile = args[++i];
    } else if (args[i] === '--output' && i + 1 < args.length) {
      config.outputFile = args[++i];
    } else if (args[i] === '--config' && i + 1 < args.length) {
      config.configFile = args[++i];
    } else if (args[i] === '--help') {
      console.log(`
Usage: node json-data-processor.cjs [OPTIONS]

Process USDA FoodData Central JSON files to extract multi-nutrient data.

Options:
  --foundation <file>   Path to Foundation Foods JSON file
  --sr-legacy <file>    Path to SR Legacy Foods JSON file
  --output <file>       Output file name (without extension)
  --config <file>       Configuration file (default: usda-fdc-json-config.json)
  --help                Show this help message

Example:
  node json-data-processor.cjs \\
    --foundation foundation_download.json \\
    --sr-legacy sr_legacy_download.json \\
    --output combined-nutrient-data
`);
      process.exit(0);
    }
  }

  return config;
}

// Load configuration
function loadConfig(configPath) {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(`Error loading config file ${configPath}:`, error.message);
    process.exit(1);
  }
}

// Load JSON data file
function loadJsonFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  console.log(`Loading ${filePath}...`);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    console.log(`  File size: ${(data.length / 1024 / 1024).toFixed(2)} MB`);
    const parsed = JSON.parse(data);
    console.log(`  Parsed successfully`);
    return parsed;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

// Extract nutrients from foodNutrients array
// Returns { nutrients, waterContent } where waterContent is used for density validation
function extractNutrients(foodNutrients, nutrientMapping) {
  const nutrients = {};
  let waterContent = null;

  if (!foodNutrients || !Array.isArray(foodNutrients)) {
    return { nutrients, waterContent };
  }

  for (const nutrientData of foodNutrients) {
    const nutrientNumber = nutrientData.nutrient?.number;
    const amount = nutrientData.amount;

    if (nutrientNumber && amount !== null && amount !== undefined) {
      const propertyName = nutrientMapping[nutrientNumber];
      if (propertyName) {
        nutrients[propertyName] = parseFloat(amount);
      }

      // Also extract water content (nutrient 255) for density validation
      if (nutrientNumber === WATER_NUTRIENT_NUMBER || nutrientNumber === '255') {
        waterContent = parseFloat(amount);
      }
    }
  }

  // Calculate combined omega-3 if individual components exist
  if (nutrients.omega3ALA || nutrients.omega3EPA || nutrients.omega3DHA) {
    nutrients.omega3 =
      (nutrients.omega3ALA || 0) +
      (nutrients.omega3EPA || 0) +
      (nutrients.omega3DHA || 0);
  }

  return { nutrients, waterContent };
}

// Calculate nutrients for a specific portion
function calculatePortionNutrients(nutrientsPer100g, gramWeight) {
  const portionNutrients = {};

  for (const [key, value] of Object.entries(nutrientsPer100g)) {
    portionNutrients[key] = value * (gramWeight / 100);
  }

  return portionNutrients;
}

// Format measure string from portion data
function formatMeasure(portion) {
  const value = portion.value || 1;
  let unitName = portion.measureUnit?.name || portion.measureUnit?.abbreviation || 'serving';
  const modifier = portion.modifier || '';

  // Filter out "undetermined" from unit name (USDA placeholder value)
  if (unitName.toLowerCase() === 'undetermined') {
    // Try abbreviation first (but check it's not also "undetermined"),
    // then fall back to modifier (if not 'undetermined'), then generic 'serving'
    const cleanModifier = (modifier && modifier.toLowerCase() !== 'undetermined') ? modifier : '';
    const cleanAbbr = (portion.measureUnit?.abbreviation &&
                       portion.measureUnit.abbreviation.toLowerCase() !== 'undetermined')
                      ? portion.measureUnit.abbreviation
                      : '';
    unitName = cleanAbbr || cleanModifier || 'serving';
  }

  let measure = `${value} ${unitName}`;
  // Only add modifier if it exists, is not "undetermined", and is different from unitName
  if (modifier &&
      modifier.toLowerCase() !== 'undetermined' &&
      modifier.toLowerCase() !== unitName.toLowerCase()) {
    measure += ` (${modifier})`;
  }

  return measure.trim();
}

// Process a single food item
function processFood(food, nutrientMapping, sourceType) {
  const fdcId = food.fdcId;
  const name = food.description;

  if (!fdcId || !name) {
    return null;
  }

  // Extract nutrients per 100g (now returns object with waterContent)
  const { nutrients: nutrientsPer100g, waterContent } = extractNutrients(food.foodNutrients, nutrientMapping);

  // Check if we have any nutrients at all
  if (Object.keys(nutrientsPer100g).length === 0) {
    return null;
  }

  // Extract food category
  const foodCategory = extractFoodCategory(food);

  // Classify preparation state
  const prepState = classifyState(name);

  // Process portions
  const measures = [];

  if (food.foodPortions && Array.isArray(food.foodPortions)) {
    for (const portion of food.foodPortions) {
      const gramWeight = portion.gramWeight;

      if (!gramWeight || gramWeight <= 0) {
        continue;
      }

      const measure = formatMeasure(portion);
      const portionNutrients = calculatePortionNutrients(nutrientsPer100g, gramWeight);

      measures.push({
        measure,
        nutrients: portionNutrients,
        gramWeight,
        sequenceNumber: portion.sequenceNumber || 0
      });
    }
  }

  // Always add a 100g measure as fallback
  if (measures.length === 0 || !measures.find(m => m.measure.includes('100'))) {
    measures.push({
      measure: '100 g',
      nutrients: nutrientsPer100g,
      gramWeight: 100,
      sequenceNumber: 999
    });
  }

  // Sort measures by sequence number
  measures.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  // Build the food object with enhanced metadata
  const processedFood = {
    id: fdcId,
    sourceId: fdcId,
    name,
    measures,
    source: sourceType,
    sourceType: sourceType, // Explicit source type for hybrid pipeline
    nutrientsPer100g,
    prepState // Preparation state classification
  };

  // Add optional metadata if available
  if (foodCategory) {
    processedFood.foodCategory = foodCategory;
  }

  if (waterContent !== null) {
    processedFood.waterContent = waterContent; // For density validation
  }

  // Add NDB number if available (SR Legacy)
  if (food.ndbNumber) {
    processedFood.ndbNumber = food.ndbNumber;
  }

  return processedFood;
}

// Process all foods from a dataset
function processFoods(dataset, datasetKey, nutrientMapping, sourceType) {
  const foods = [];
  const foodArray = dataset[datasetKey];

  if (!foodArray || !Array.isArray(foodArray)) {
    console.log(`  No ${datasetKey} array found in dataset`);
    return foods;
  }

  console.log(`  Processing ${foodArray.length} foods from ${sourceType}...`);

  for (const food of foodArray) {
    const processed = processFood(food, nutrientMapping, sourceType);
    if (processed) {
      foods.push(processed);
    }
  }

  console.log(`  Extracted ${foods.length} foods with nutrient data`);
  return foods;
}

// Main processing function
function main() {
  const config = parseArgs();
  const appConfig = loadConfig(config.configFile);

  console.log('\n=== USDA FDC JSON Data Processor ===\n');
  console.log(`Configuration: ${config.configFile}`);
  console.log(`Nutrient mapping: ${Object.keys(appConfig.nutrientMapping).length} nutrients\n`);

  const allFoods = [];

  // Process Foundation Foods
  if (config.foundationFile) {
    console.log('Processing Foundation Foods...');
    const foundationData = loadJsonFile(config.foundationFile);
    if (foundationData) {
      const foods = processFoods(
        foundationData,
        appConfig.jsonPaths.foundationFoods,
        appConfig.nutrientMapping,
        'Foundation'
      );
      allFoods.push(...foods);
    }
    console.log('');
  }

  // Process SR Legacy Foods
  if (config.srLegacyFile) {
    console.log('Processing SR Legacy Foods...');
    const srLegacyData = loadJsonFile(config.srLegacyFile);
    if (srLegacyData) {
      const foods = processFoods(
        srLegacyData,
        appConfig.jsonPaths.srLegacyFoods,
        appConfig.nutrientMapping,
        'SR Legacy'
      );
      allFoods.push(...foods);
    }
    console.log('');
  }

  if (allFoods.length === 0) {
    console.error('Error: No foods were processed. Check input files and configuration.');
    process.exit(1);
  }

  // Create output data
  const output = {
    metadata: {
      ...appConfig.metadata,
      generated: new Date().toISOString(),
      totalFoods: allFoods.length,
      sourceName: appConfig.sourceName,
      nutrientsTracked: Object.keys(appConfig.nutrientMapping).length
    },
    foods: allFoods
  };

  // Write output file
  const outputPath = `${config.outputFile}.json`;
  console.log(`Writing output to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

  const fileSize = fs.statSync(outputPath).size;
  console.log(`\n=== Processing Complete ===`);
  console.log(`Total foods processed: ${allFoods.length}`);
  console.log(`Output file: ${outputPath}`);
  console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('');

  // Display sample statistics
  const sampleFood = allFoods[0];
  if (sampleFood) {
    console.log('\n=== Sample Food ===');
    console.log(`Name: ${sampleFood.name}`);
    console.log(`FDC ID: ${sampleFood.id}`);
    console.log(`Measures: ${sampleFood.measures.length}`);
    console.log(`Nutrients per 100g: ${Object.keys(sampleFood.nutrientsPer100g).length}`);
    console.log(`Sample nutrients:`, Object.keys(sampleFood.nutrientsPer100g).slice(0, 5).join(', '));
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  processFood,
  extractNutrients,
  calculatePortionNutrients,
  classifyState,
  extractFoodCategory,
  STATE_PATTERNS
};
