#!/usr/bin/env node

/**
 * food-curator-nutrients.cjs
 *
 * **Multi-Nutrient Version**
 * Enhanced curator supporting multiple nutrients per food item.
 * - Works with nutrients objects instead of single calcium values
 * - Preserves all nutrient data through the pipeline
 * - Maintains compatibility with existing keep/exclude list functionality
 */

const fs = require("fs");

// --- Argument Parsing ---
const args = process.argv.slice(2);
const fileArgs = [];
let keepListFile = null;
let excludeListFile = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "--keep-list":
    case "--keep":
      if (i + 1 >= args.length) {
        console.error(`❌ Error: ${arg} requires a file path`);
        process.exit(1);
      }
      keepListFile = args[++i];
      break;
    case "--exclude-list":
    case "--exclude":
      if (i + 1 >= args.length) {
        console.error(`❌ Error: ${arg} requires a file path`);
        process.exit(1);
      }
      excludeListFile = args[++i];
      break;
    default:
      if (arg.startsWith("--") || arg.startsWith("-")) {
        console.error(`❌ Error: Unknown parameter '${arg}'`);
        console.error(`Valid parameters: --keep-list <file>, --exclude-list <file>`);
        process.exit(1);
      } else {
        fileArgs.push(arg);
      }
      break;
  }
}

const inputJson = fileArgs[0];
const outputBaseName = fileArgs[1] || "curated-nutrients";

if (!inputJson) {
  console.error(
    "Usage: node food-curator-nutrients.cjs <mastered.json> [output_base_name] [--keep-list keep.txt] [--exclude-list exclude.txt]"
  );
  process.exit(1);
}

// --- Helper Functions ---

function normalizeName(originalName) {
  if (!originalName) return "";
  let norm = originalName.toLowerCase();

  // Remove parenthetical and bracketed content
  norm = norm.replace(/\s*\[[^\]]*\]/g, "");
  norm = norm.replace(/\s*\([^)]*\)/g, "");

  // Remove nutritional/preparation details
  norm = norm.replace(/\b(\d+(\.\d+)?\s*proof)\b/g, "");
  norm = norm.replace(
    /,?\s*(all commercial varieties|all types|mixed species|all areas)/g,
    ""
  );
  norm = norm.replace(
    /,?\s*(with added vitamin|vitamin d fortified|with added ca|calcium-fortified|protein fortified)/gi,
    ""
  );
  norm = norm.replace(
    /,?\s*(solids and liquids|drained solids|with bone|without bone)/gi,
    ""
  );
  norm = norm.replace(
    /,?\s*(with salt|without salt|salted|unsalted|low sodium)/gi,
    ""
  );
  norm = norm.replace(
    /\b(enriched|fortified|sweetened|unsweetened|ready-to-drink|from concentrate)/gi,
    ""
  );
  norm = norm.replace(
    /\b(canned|frozen|raw|unprepared|prepared|cooked|boiled|steamed)/gi,
    ""
  );
  norm = norm.replace(
    /\b(low fat|reduced fat|fat free|nonfat|whole milk|lean only)/gi,
    ""
  );

  // Final cleanup
  norm = norm
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .replace(/,\s*$/g, "")
    .replace(/^\s*,/g, "")
    .trim();

  return norm;
}

const keepSet = keepListFile
  ? new Set(
      fs
        .readFileSync(keepListFile, "utf-8")
        .split(/\r?\n/)
        .map(normalizeName)
        .filter(Boolean)
    )
  : new Set();

const excludeSet = excludeListFile
  ? new Set(
      fs
        .readFileSync(excludeListFile, "utf-8")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  : new Set();

// --- Processing Steps ---

let stepCounter = 0;
function logStep(description, beforeCount, afterCount) {
  stepCounter++;
  const dropped = beforeCount - afterCount;
  const percent = beforeCount > 0 ? ((dropped / beforeCount) * 100).toFixed(1) : "0.0";
  console.log(`  ${stepCounter}. ${description}`);
  console.log(`     Before: ${beforeCount} | After: ${afterCount} | Dropped: ${dropped} (${percent}%)`);
}

function processData(rawData) {
  console.log("\n🔧 Processing Data...\n");

  let foods = rawData.foods || [];
  let initialCount = foods.length;
  console.log(`📊 Input: ${initialCount} foods\n`);

  // Helper function to check if a food is in the keep list
  const isKept = (food) => keepSet.has(normalizeName(food.name));

  if (keepSet.size > 0) {
    const keptCount = foods.filter(isKept).length;
    console.log(`📋 Keep list active: ${keepSet.size} entries (${keptCount} foods protected from filtering)\n`);
  }

  // Step 1: Filter by exclude list (if provided)
  // Keep list foods are EXEMPT from exclude filtering
  if (excludeSet.size > 0) {
    const before = foods.length;
    foods = foods.filter((f) => {
      // Protect keep-list foods from exclusion
      if (keepSet.size > 0 && isKept(f)) {
        return true;
      }

      const nameLower = f.name.toLowerCase();
      return ![...excludeSet].some((term) => nameLower.includes(term.toLowerCase()));
    });
    logStep("Apply exclude list (keep-list protected)", before, foods.length);
  }

  // Step 2: Deduplicate measures within each food
  const before3 = foods.length;
  let totalMeasures = 0;
  let duplicateMeasures = 0;

  foods = foods.map((food) => {
    if (!food.measures || !Array.isArray(food.measures)) {
      return food;
    }

    const seenMeasures = new Map();
    const uniqueMeasures = [];

    for (const measure of food.measures) {
      const key = measure.measure;
      totalMeasures++;

      if (!seenMeasures.has(key)) {
        seenMeasures.set(key, true);
        uniqueMeasures.push(measure);
      } else {
        duplicateMeasures++;
      }
    }

    return {
      ...food,
      measures: uniqueMeasures
    };
  });

  console.log(`  2. Deduplicate measures within foods`);
  console.log(`     Total measures: ${totalMeasures} | Unique: ${totalMeasures - duplicateMeasures} | Removed: ${duplicateMeasures}`);

  // Step 3: Remove foods with no measures
  // Note: Even keep-list foods are removed if they have no measures (can't be used in app)
  const before3b = foods.length;
  const foodsWithNoMeasures = foods.filter((f) => !f.measures || f.measures.length === 0);

  // Warn if any keep-list foods are being dropped
  if (keepSet.size > 0) {
    const keptFoodsDropped = foodsWithNoMeasures.filter(isKept);
    if (keptFoodsDropped.length > 0) {
      console.log(`\n⚠️  Warning: ${keptFoodsDropped.length} keep-list food(s) have no measures and will be dropped:`);
      keptFoodsDropped.forEach(f => console.log(`     - ${f.name}`));
      console.log('');
    }
  }

  foods = foods.filter((f) => f.measures && f.measures.length > 0);
  logStep("Remove foods with no measures", before3b, foods.length);

  // Count nutrients for statistics
  let nutrientCounts = {};
  foods.forEach((food) => {
    if (food.nutrientsPer100g) {
      Object.keys(food.nutrientsPer100g).forEach((nutrient) => {
        nutrientCounts[nutrient] = (nutrientCounts[nutrient] || 0) + 1;
      });
    }
  });

  console.log(`\n📊 Nutrient Coverage:`);
  const sortedNutrients = Object.entries(nutrientCounts).sort((a, b) => b[1] - a[1]);
  sortedNutrients.slice(0, 10).forEach(([nutrient, count]) => {
    const percent = ((count / foods.length) * 100).toFixed(1);
    console.log(`   ${nutrient}: ${count} foods (${percent}%)`);
  });

  return foods;
}

// --- Main Execution ---

(async () => {
  try {
    console.log("🚀 Food Curator (Multi-Nutrient) - Starting...");

    // Load input
    if (!fs.existsSync(inputJson)) {
      console.error(`❌ Input file not found: ${inputJson}`);
      process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(inputJson, "utf-8"));

    if (!rawData.foods || !Array.isArray(rawData.foods)) {
      console.error(`❌ Invalid input format. Expected {metadata, foods: [...]} structure`);
      process.exit(1);
    }

    // Process the data
    const curatedFoods = processData(rawData);

    // Create output data structures
    const fullOutput = {
      metadata: {
        ...rawData.metadata,
        curatedAt: new Date().toISOString(),
        totalFoods: curatedFoods.length,
        description: "Curated food database with multi-nutrient support"
      },
      foods: curatedFoods
    };

    // Abridged version (same as full for now, but can be customized)
    const abridgedOutput = {
      ...fullOutput
    };

    // Save outputs
    const fullFile = `${outputBaseName}-full.json`;
    const abridgedFile = `${outputBaseName}-abridged.json`;

    fs.writeFileSync(fullFile, JSON.stringify(fullOutput, null, 2));
    fs.writeFileSync(abridgedFile, JSON.stringify(abridgedOutput, null, 2));

    const fullSize = fs.statSync(fullFile).size;
    const abridgedSize = fs.statSync(abridgedFile).size;

    console.log(`\n✅ Curation Complete!`);
    console.log(`   Full: ${fullFile} (${(fullSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   Abridged: ${abridgedFile} (${(abridgedSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   Total foods: ${curatedFoods.length}`);
    console.log("🎉 Done!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
