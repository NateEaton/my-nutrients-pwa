#!/usr/bin/env node

/**
 * serving-deriver.cjs (Hybrid Pipeline Stage 5)
 *
 * Derives and validates serving sizes for food concepts.
 * Implements the serving derivation priority:
 * 1. Explicit household measures from Reference source
 * 2. FDA RACC lookup by food category
 * 3. Density-based volume calculations
 * 4. Unit weight table for countable foods
 * 5. Fallback to 100g only
 *
 * Also applies density transfer safety checks when Primary differs from Reference.
 */

const fs = require('fs');
const path = require('path');

// --- Load Reference Data ---
function loadReferenceData(dataDir) {
  const refs = {};

  const raccPath = path.join(dataDir, 'racc_table.json');
  if (fs.existsSync(raccPath)) {
    refs.racc = JSON.parse(fs.readFileSync(raccPath, 'utf8'));
    console.log(`Loaded RACC table: ${Object.keys(refs.racc.byCategory).length} categories`);
  }

  const densityPath = path.join(dataDir, 'density_defaults.json');
  if (fs.existsSync(densityPath)) {
    refs.density = JSON.parse(fs.readFileSync(densityPath, 'utf8'));
    console.log(`Loaded density defaults: ${Object.keys(refs.density.byTexture).length} textures`);
  }

  const unitWeightsPath = path.join(dataDir, 'unit_weights.json');
  if (fs.existsSync(unitWeightsPath)) {
    refs.unitWeights = JSON.parse(fs.readFileSync(unitWeightsPath, 'utf8'));
    console.log(`Loaded unit weights: ${Object.keys(refs.unitWeights).length} food types`);
  }

  return refs;
}

// --- Food Type Classification ---

const FOOD_TYPE_PATTERNS = {
  liquid: /\b(milk|juice|water|tea|coffee|soda|drink|beverage|broth|stock|nectar|wine|beer|spirit)\b/i,
  oil: /\b(oil|olive oil|vegetable oil|canola|coconut oil)\b/i,
  dairy: /\b(cheese|yogurt|cream|butter|margarine|sour cream)\b/i,
  egg: /\b(egg|eggs)\b/i,
  fruit_small: /\b(berr|grape|cherry|cherries|blueberr|raspberr|strawberr)\b/i,
  fruit_medium: /\b(apple|orange|banana|peach|pear|plum|nectarine|apricot|kiwi)\b/i,
  fruit_large: /\b(melon|watermelon|cantaloupe|honeydew|pineapple|papaya|mango)\b/i,
  vegetable_leafy: /\b(lettuce|spinach|kale|arugula|greens|chard|cabbage|collard)\b/i,
  vegetable: /\b(carrot|broccoli|cauliflower|pepper|onion|tomato|cucumber|celery|potato|corn|peas|beans)\b/i,
  grain: /\b(rice|pasta|noodle|quinoa|couscous|barley|oat)\b/i,
  bread: /\b(bread|roll|muffin|bagel|biscuit|tortilla|pita)\b/i,
  meat: /\b(beef|pork|chicken|turkey|lamb|veal|bison|venison|duck|goose)\b/i,
  fish: /\b(fish|salmon|tuna|cod|tilapia|trout|halibut|bass|mackerel)\b/i,
  shellfish: /\b(shrimp|crab|lobster|oyster|clam|mussel|scallop|crawfish)\b/i,
  nut: /\b(almond|walnut|pecan|cashew|peanut|pistachio|macadamia|hazelnut|nut)\b/i,
  seed: /\b(seed|sunflower|pumpkin|flax|chia|sesame|hemp)\b/i,
  legume: /\b(bean|lentil|chickpea|pea|tofu|tempeh|edamame)\b/i,
  cereal: /\b(cereal|granola|oatmeal|muesli)\b/i,
  snack: /\b(chip|cracker|pretzel|popcorn|snack)\b/i,
  sweet: /\b(candy|chocolate|cookie|cake|pie|pastry|dessert|ice cream)\b/i,
  condiment: /\b(sauce|dressing|mayonnaise|ketchup|mustard|salsa|dip)\b/i,
  spice: /\b(spice|herb|seasoning|salt|pepper|cinnamon|cumin|oregano|basil)\b/i
};

function classifyFoodType(name) {
  const nameLower = name.toLowerCase();

  for (const [type, pattern] of Object.entries(FOOD_TYPE_PATTERNS)) {
    if (pattern.test(nameLower)) {
      return type;
    }
  }

  return 'generic';
}

// --- RACC Lookup ---

function lookupRACC(foodName, foodCategory, raccTable) {
  if (!raccTable) return null;

  // Try by food category code first
  if (foodCategory?.code) {
    const categoryData = raccTable.byCategory[foodCategory.code];
    if (categoryData) {
      // Check for subcategories
      if (categoryData.subcategories) {
        // Try to match subcategory by keyword
        for (const [subKey, subData] of Object.entries(categoryData.subcategories)) {
          if (subKey !== 'default' && foodName.toLowerCase().includes(subKey)) {
            return subData;
          }
        }
        // Fall back to default
        if (categoryData.subcategories.default) {
          return categoryData.subcategories.default;
        }
      }
      return categoryData;
    }
  }

  // Try by keyword lookup
  if (raccTable.lookupByKeyword) {
    for (const [keyword, lookup] of Object.entries(raccTable.lookupByKeyword)) {
      if (foodName.toLowerCase().includes(keyword)) {
        const cat = raccTable.byCategory[lookup.category];
        if (cat?.subcategories && lookup.subcategory) {
          return cat.subcategories[lookup.subcategory] || cat.subcategories.default;
        }
        return cat;
      }
    }
  }

  return null;
}

// --- Density Lookup ---

function lookupDensity(foodName, foodType, foodCategory, densityTable) {
  if (!densityTable) return null;

  // Try by food category first
  if (foodCategory?.code && densityTable.byFoodCategory) {
    const catDensity = densityTable.byFoodCategory[foodCategory.code];
    if (catDensity) {
      // Try to match sub-type
      for (const [key, value] of Object.entries(catDensity)) {
        if (key !== 'default' && foodName.toLowerCase().includes(key)) {
          return value;
        }
      }
      if (catDensity.default) {
        return catDensity.default;
      }
    }
  }

  // Try by texture
  if (densityTable.byTexture) {
    // Map food type to texture
    const textureMap = {
      liquid: 'liquid',
      oil: 'oil',
      dairy: 'soft_solid',
      grain: 'granular_cooked',
      vegetable_leafy: 'leafy_raw',
      nut: 'nuts_whole',
      seed: 'nuts_chopped',
      snack: 'granular_fine',
      cereal: 'cereal_flakes'
    };

    const texture = textureMap[foodType];
    if (texture && densityTable.byTexture[texture]) {
      return densityTable.byTexture[texture];
    }
  }

  return null;
}

// --- Unit Weight Lookup ---

function lookupUnitWeight(foodName, unitWeightsTable) {
  if (!unitWeightsTable) return null;

  const nameLower = foodName.toLowerCase();

  for (const [category, weights] of Object.entries(unitWeightsTable)) {
    // Skip metadata
    if (category.startsWith('_')) continue;

    // Check if food name matches category
    const categoryPattern = new RegExp(`\\b${category.replace(/_/g, '[ _]?')}\\b`, 'i');
    if (categoryPattern.test(nameLower)) {
      // Try to find size qualifier
      for (const [size, weight] of Object.entries(weights)) {
        if (size !== 'default' && nameLower.includes(size)) {
          return { size, weight };
        }
      }
      // Return default if available
      if (weights.default) {
        return { size: 'medium', weight: weights.default };
      }
    }
  }

  return null;
}

// --- Measure Derivation ---

function deriveMeasures(candidate, refs) {
  const measures = candidate.refMeasures || [];
  const name = candidate.name;
  const foodCategory = candidate.foodCategory;
  const foodType = classifyFoodType(name);
  const nutrients = candidate.primaryNutrients;

  // Track derivation source for coverage reporting
  let derivationSource = 'explicit';

  // Check if we already have good household measures
  const hasHouseholdMeasure = measures.some(m => {
    const measure = m.measure.toLowerCase();
    return !measure.includes('100 g') &&
           (measure.includes('cup') ||
            measure.includes('oz') ||
            measure.includes('tbsp') ||
            measure.includes('tsp') ||
            measure.includes('slice') ||
            measure.includes('piece') ||
            measure.includes('serving'));
  });

  let derivedMeasures = [...measures];

  // If no household measures, try to derive them
  if (!hasHouseholdMeasure) {
    // Try RACC first
    const raccData = lookupRACC(name, foodCategory, refs.racc);
    if (raccData && raccData.racc) {
      const gramWeight = raccData.racc;
      const unit = raccData.unit || 'serving';
      const measureString = `1 ${unit} (${gramWeight}g)`;

      // Calculate nutrients for this serving
      const servingNutrients = {};
      for (const [key, value] of Object.entries(nutrients)) {
        servingNutrients[key] = value * (gramWeight / 100);
      }

      derivedMeasures.unshift({
        measure: measureString,
        nutrients: servingNutrients,
        gramWeight: gramWeight,
        derived: true,
        derivedFrom: 'RACC'
      });
      derivationSource = 'RACC';
    }

    // Try density-based derivation for volumetric foods
    if (derivationSource === 'explicit') {
      const densityData = lookupDensity(name, foodType, foodCategory, refs.density);
      if (densityData && densityData.grams_per_cup) {
        const gramWeight = densityData.grams_per_cup;
        const measureString = `1 cup (${gramWeight}g)`;

        const servingNutrients = {};
        for (const [key, value] of Object.entries(nutrients)) {
          servingNutrients[key] = value * (gramWeight / 100);
        }

        derivedMeasures.unshift({
          measure: measureString,
          nutrients: servingNutrients,
          gramWeight: gramWeight,
          derived: true,
          derivedFrom: 'density',
          confidence: densityData.confidence || 'medium'
        });
        derivationSource = 'density';
      }
    }

    // Try unit weights for countable foods
    if (derivationSource === 'explicit') {
      const unitData = lookupUnitWeight(name, refs.unitWeights);
      if (unitData) {
        const gramWeight = unitData.weight;
        const measureString = `1 ${unitData.size} (${gramWeight}g)`;

        const servingNutrients = {};
        for (const [key, value] of Object.entries(nutrients)) {
          servingNutrients[key] = value * (gramWeight / 100);
        }

        derivedMeasures.unshift({
          measure: measureString,
          nutrients: servingNutrients,
          gramWeight: gramWeight,
          derived: true,
          derivedFrom: 'unit_weight'
        });
        derivationSource = 'unit_weight';
      }
    }
  }

  // Ensure 100g measure exists
  const has100g = derivedMeasures.some(m => m.measure === '100 g');
  if (!has100g) {
    derivedMeasures.push({
      measure: '100 g',
      nutrients: nutrients,
      gramWeight: 100
    });
  }

  return {
    measures: derivedMeasures,
    derivationSource: derivationSource,
    foodType: foodType
  };
}

// --- Density Transfer Validation ---

function validateDensityTransfer(candidate) {
  // If primary and reference are the same source, no transfer needed
  if (candidate.primaryFDC === candidate.refFDC) {
    return { valid: true, revertToFallback: false };
  }

  // Check density warning flag
  if (candidate.densityWarning) {
    // Density mismatch detected - consider reverting to fallback
    return {
      valid: false,
      revertToFallback: true,
      reason: 'density_mismatch',
      variance: candidate.densityVariance
    };
  }

  return { valid: true, revertToFallback: false };
}

// --- Main Processing ---

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    inputFile: null,
    outputFile: 'derived-foods',
    dataDir: '.'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' && i + 1 < args.length) {
      config.inputFile = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      config.outputFile = args[++i];
    } else if (arg === '--data-dir' && i + 1 < args.length) {
      config.dataDir = args[++i];
    } else if (arg === '--help') {
      console.log(`
Usage: node serving-deriver.cjs [OPTIONS]

Derive and validate serving sizes for food concepts.

Options:
  --input <file>      Input candidates JSON file (required)
  --output <name>     Output file base name (default: derived-foods)
  --data-dir <dir>    Directory containing reference data files (default: .)
  --help              Show this help message

Example:
  node serving-deriver.cjs --input candidates.json --output derived-foods
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

function main() {
  const config = parseArgs();

  console.log('\n=== Serving Deriver (Hybrid Pipeline) ===\n');
  console.log(`Input: ${config.inputFile}`);
  console.log(`Data directory: ${config.dataDir}\n`);

  // Load reference data
  const refs = loadReferenceData(config.dataDir);

  // Load input candidates
  if (!fs.existsSync(config.inputFile)) {
    console.error(`Error: Input file not found: ${config.inputFile}`);
    process.exit(1);
  }

  const inputData = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
  const candidates = inputData.candidates || inputData.foods || inputData;

  if (!Array.isArray(candidates)) {
    console.error('Error: Expected candidates array in input');
    process.exit(1);
  }

  console.log(`Loaded ${candidates.length} candidates\n`);

  // Statistics
  const stats = {
    total: 0,
    explicitMeasures: 0,
    raccDerived: 0,
    densityDerived: 0,
    unitWeightDerived: 0,
    fallbackOnly: 0,
    densityReverts: 0
  };

  // Process each candidate
  const derivedFoods = [];

  for (const candidate of candidates) {
    stats.total++;

    // Validate density transfer
    const transferValidation = validateDensityTransfer(candidate);

    let foodData;
    if (transferValidation.revertToFallback && candidate.fallbackNutrients) {
      // Use fallback (SR Legacy) for BOTH nutrients AND source ID
      // This ensures data integrity: the FDC link will match the actual nutrient values
      // Without this, provenance would show Foundation Foods nutrients while app uses SR Legacy
      foodData = {
        ...candidate,
        primaryFDC: candidate.refFDC,           // Use SR Legacy FDC ID
        primaryNutrients: candidate.fallbackNutrients,
        primarySource: 'SR Legacy',             // Clean source name (was matched but reverted)
        densityRevert: true,
        revertReason: transferValidation.reason,
        originalPrimaryFDC: candidate.primaryFDC  // Keep original FF ID for reference
      };
      stats.densityReverts++;
    } else {
      foodData = candidate;
    }

    // Derive measures
    const derivation = deriveMeasures(foodData, refs);

    // Build final food object
    const derivedFood = {
      appId: foodData.appId,
      name: foodData.name,
      sourceId: foodData.primaryFDC,
      sourceName: foodData.primarySource,
      measures: derivation.measures,
      nutrientsPer100g: foodData.primaryNutrients,
      prepState: foodData.prepState,
      foodCategory: foodData.foodCategory,
      foodType: derivation.foodType,
      derivationSource: derivation.derivationSource,
      // Provenance metadata
      provenance: {
        primaryFDC: foodData.primaryFDC,
        primarySource: foodData.primarySource,
        refFDC: foodData.refFDC,
        refSource: foodData.refSource,
        matchScore: foodData.matchScore,
        densityWarning: foodData.densityWarning,
        densityRevert: foodData.densityRevert,
        // Track original Foundation Foods ID if density revert occurred
        originalFoundationFDC: foodData.originalPrimaryFDC || null
      }
    };

    derivedFoods.push(derivedFood);

    // Update statistics
    switch (derivation.derivationSource) {
      case 'explicit':
        stats.explicitMeasures++;
        break;
      case 'RACC':
        stats.raccDerived++;
        break;
      case 'density':
        stats.densityDerived++;
        break;
      case 'unit_weight':
        stats.unitWeightDerived++;
        break;
      default:
        stats.fallbackOnly++;
    }
  }

  // Output statistics
  console.log('\n=== Serving Derivation Statistics ===');
  console.log(`Total foods: ${stats.total}`);
  console.log(`Explicit measures: ${stats.explicitMeasures} (${(stats.explicitMeasures / stats.total * 100).toFixed(1)}%)`);
  console.log(`RACC-derived: ${stats.raccDerived} (${(stats.raccDerived / stats.total * 100).toFixed(1)}%)`);
  console.log(`Density-derived: ${stats.densityDerived} (${(stats.densityDerived / stats.total * 100).toFixed(1)}%)`);
  console.log(`Unit weight-derived: ${stats.unitWeightDerived} (${(stats.unitWeightDerived / stats.total * 100).toFixed(1)}%)`);
  console.log(`100g only (fallback): ${stats.fallbackOnly} (${(stats.fallbackOnly / stats.total * 100).toFixed(1)}%)`);
  console.log(`Density reverts: ${stats.densityReverts}`);

  // Write output
  const output = {
    metadata: {
      ...inputData.metadata,
      generated: new Date().toISOString(),
      generator: 'serving-deriver.cjs',
      stats: stats
    },
    foods: derivedFoods
  };

  const outputPath = `${config.outputFile}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten: ${outputPath} (${derivedFoods.length} foods)`);

  // Calculate coverage percentage
  const nonFallbackPct = ((stats.total - stats.fallbackOnly) / stats.total * 100).toFixed(1);
  console.log(`\nCoverage: ${nonFallbackPct}% of foods have non-100g servings`);

  console.log('\n=== Serving Derivation Complete ===\n');
}

// Run
if (require.main === module) {
  main();
}

module.exports = {
  classifyFoodType,
  lookupRACC,
  lookupDensity,
  lookupUnitWeight,
  deriveMeasures,
  validateDensityTransfer
};
