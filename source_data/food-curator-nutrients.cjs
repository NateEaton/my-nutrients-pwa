#!/usr/bin/env node

/**
 * food-curator-nutrients.cjs
 *
 * **Multi-Nutrient Version - Full Featured**
 * Adapted from original calcium-only food-curator.cjs with all filtering logic preserved.
 * - Sophisticated brand filtering
 * - Food collapsing based on nutrient similarity
 * - Cooking method collapsing
 * - Meat cut simplification
 * - Industrial prep filtering
 * - Category whitelisting
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

// --- Name Normalization (from original) ---

function normalizeName(originalName) {
  if (!originalName) return "";
  let norm = originalName.toLowerCase();

  // Stage 1: Handle alcoholic beverages
  norm = norm.replace(/\b(gin|rum|vodka|whiskey|liqueur)\b/g, "distilled spirit");
  norm = norm.replace(/,?\s*all \(distilled spirit, distilled spirit, distilled spirit, distilled spirit\)/g, "");
  norm = norm.replace(/,?\s*distilled, all/g, ", distilled");
  norm = norm.replace(/alcoholic beverage, distilled, distilled spirit/g, "alcoholic beverage, distilled spirit");
  norm = norm.replace(/alcoholic beverage, distilled$/g, "alcoholic beverage, distilled spirit");

  // Stage 2: Remove parenthetical and bracketed content
  norm = norm.replace(/\s*\[[^\]]*\]/g, "");
  norm = norm.replace(/\s*\([^)]*\)/g, "");

  // Stage 3: Other broad replacements
  norm = norm.replace(/beer, (light|regular|higher alcohol|low carb|non-alcoholic)/g, "beer");

  // Stage 4: Remove nutritional/preparation details
  norm = norm.replace(/\b(\d+(\.\d+)?\s*proof)\b/g, "");
  norm = norm.replace(/,?\s*(all commercial varieties|all types|mixed species|all areas|includes crisphead types|regular pack|includes from concentrate)/g, "");
  norm = norm.replace(/,?\s*(with added vitamin a and vitamin d|vitamin d fortified|with added ca|with added calcium|calcium-fortified|protein fortified)/g, "");
  norm = norm.replace(/,?\s*(solids and liquids|drained solids|with bone|without bone)/g, "");
  norm = norm.replace(/,?\s*(with salt|without salt|salted|unsalted|low sodium|reduced sodium|no salt added)/gi, "");
  norm = norm.replace(/\b(enriched|unenriched|fortified|sweetened|unsweetened|ready-to-drink|from concentrate|chilled)\b/gi, "");
  norm = norm.replace(/\b(canned|frozen|raw|unprepared|prepared|cooked|boiled|steamed|baked|roasted|drained|fried)\b/gi, "");
  norm = norm.replace(/\b(low fat|reduced fat|fat free|nonfat|part-skim|whole milk|low moisture|lean only|lean and fat|commercial)\b/gi, "");

  // Stage 5: Final cleanup
  norm = norm
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .replace(/,\s*$/g, "")
    .replace(/^\s*,/g, "")
    .replace(/\s\s+/g, " ")
    .trim();

  return norm;
}

// --- Load Keep/Exclude Lists ---

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
        .map((n) => n.toLowerCase().trim())
        .filter(Boolean)
    )
  : new Set();

// --- Load Input Data ---

if (!fs.existsSync(inputJson)) {
  console.error(`❌ Input file not found: ${inputJson}`);
  process.exit(1);
}

const inputData = JSON.parse(fs.readFileSync(inputJson, "utf-8"));
let records, metadata;

if (Array.isArray(inputData)) {
  records = inputData;
  metadata = null;
  console.log(`📖 Loaded ${records.length} records (legacy array format)`);
} else if (inputData.foods && Array.isArray(inputData.foods)) {
  records = inputData.foods;
  metadata = inputData.metadata;
  console.log(`📖 Loaded ${records.length} records from ${inputJson}`);
  if (metadata) {
    console.log(`📋 Source metadata: ${metadata.name || metadata.sourceName}`);
  }
} else {
  console.error(`❌ Invalid input format`);
  process.exit(1);
}

if (!Array.isArray(records)) {
  console.error(`❌ Records is not an array`);
  process.exit(1);
}

// --- Context-Aware Serving Selection (from original) ---

const unitPriorities = {
  liquid: ["cup", "fl oz", "bottle", "can", "tablespoon", "tbsp"],
  dairy: ["oz", "slice", "cup", "container", "stick"],
  produce: ["fruit", "cup", "piece", "spear", "slice", "oz"],
  bakery: ["slice", "oz", "piece", "roll", "bun"],
  meat_fish: ["oz", "fillet", "piece", "drumstick", "wing", "thigh", "slice", "patty", "link"],
  generic: ["oz", "serving", "piece", "slice", "tablespoon", "tbsp", "cup"],
};

const liquidRegex = /\b(milk|juice|water|tea|coffee|soda|drink|beverage)\b/i;
const dairyRegex = /\b(cheese|yogurt|butter|cream|sour cream)\b/i;
const produceRegex = /\b(fruit|apple|orange|banana|berry|melon|lettuce|carrot|broccoli|vegetable|tomato|potato|onion|peas|beans|corn)\b/i;
const bakeryRegex = /\b(bread|cake|muffin|biscuit|roll|bun|cracker|pancake|waffle|pastry)\b/i;
const meatFishRegex = /\b(beef|pork|veal|lamb|goat|chicken|turkey|bison|game|meat|fish)\b/i;

function getFoodCategory(name) {
  if (liquidRegex.test(name)) return "liquid";
  if (dairyRegex.test(name)) return "dairy";
  if (meatFishRegex.test(name)) return "meat_fish";
  if (bakeryRegex.test(name)) return "bakery";
  if (produceRegex.test(name)) return "produce";
  return "generic";
}

function chooseBestServing(group) {
  // Sort by data source priority
  group.sort((a, b) => {
    const order = { Foundation: 1, "SR Legacy": 2, "abridged pub": 3 };
    const aSource = a.sourceName || a.subset || "unknown";
    const bSource = b.sourceName || b.subset || "unknown";
    return (order[aSource] || 99) - (order[bSource] || 99);
  });

  const category = getFoodCategory(group[0].name);
  const preferredUnits = unitPriorities[category] || unitPriorities.generic;

  // Filter to reasonable serving sizes (30g - 300g)
  const reasonableServings = group.filter((r) => {
    // Check if we have measures array
    if (r.measures && r.measures.length > 0) {
      const weight = r.measures[0].gramWeight || 100;
      return weight >= 30 && weight <= 300;
    }
    return true;
  });

  const sourceGroup = reasonableServings.length > 0 ? reasonableServings : group;

  // Try to find preferred unit
  for (const unit of preferredUnits) {
    const matchingMeasures = sourceGroup.filter((r) => {
      if (r.measures && r.measures[0]) {
        return r.measures[0].measure && r.measures[0].measure.toLowerCase().includes(unit);
      }
      return false;
    });

    if (matchingMeasures.length > 0) {
      if (matchingMeasures.length === 1) return matchingMeasures[0];
      // Choose closest to 100g
      return matchingMeasures.reduce((a, b) => {
        const a_weight = a.measures[0]?.gramWeight || 100;
        const b_weight = b.measures[0]?.gramWeight || 100;
        const a_diff = Math.abs(a_weight - 100);
        const b_diff = Math.abs(b_weight - 100);
        return a_diff <= b_diff ? a : b;
      });
    }
  }

  // Prefer non-100g measures
  const non100 = sourceGroup.filter((r) => {
    if (r.measures && r.measures[0]) {
      return r.measures[0].measure !== "100 g";
    }
    return false;
  });

  if (non100.length > 0) {
    return non100.reduce((a, b) => {
      const a_weight = a.measures[0]?.gramWeight || 100;
      const b_weight = b.measures[0]?.gramWeight || 100;
      return a_weight < b_weight ? a : b;
    });
  }

  // Default to smallest serving
  return group.reduce((a, b) => {
    const a_weight = a.measures[0]?.gramWeight || 100;
    const b_weight = b.measures[0]?.gramWeight || 100;
    return a_weight < b_weight ? a : b;
  });
}

// --- Brand Filtering (from original) ---

function containsBrand(foodName, keepSet) {
  if (keepSet.has(normalizeName(foodName))) {
    return false; // Keep-list foods are exempt
  }

  const knownBrandBases = new Set([
    "Vitasoy", "Nabisco", "Archway", "Mission Foods", "Kraft", "Pillsbury",
    "Hormel", "Lean Pockets", "Hot Pockets", "Campbell's", "DiGiorno",
    "KFC", "McDonald's", "Burger King", "Taco Bell", "Pizza Hut",
    "Arby's", "Denny's", "Subway", "Domino's", "Papa John's",
    "Little Caesars", "Wendy's", "Olive Garden", "Cracker Barrel",
    "Applebee's", "Chick-fil-A", "Oscar Mayer", "Pepperidge Farm",
    "Martha White", "Silk", "Nestle", "Snackwell", "York",
    "Reddi Wip", "Schar", "Rudi's", "Heinz", "Clif Z",
  ]);

  for (const brand of knownBrandBases) {
    const brandRegex = new RegExp(`\\b${brand}\\b`, "i");
    if (brandRegex.test(foodName)) return true;
  }

  // All-caps check
  const allCapsRegex = /\b([A-Z]{3,})\b/;
  const nonBrandAllCaps = new Set([
    "NEW", "YORK", "USA", "US", "UK", "GRADE", "PRIME", "CHOICE",
    "SELECT", "ORGANIC", "NATURAL", "FRESH", "FROZEN", "RAW", "COOKED",
    "LARGE", "SMALL", "MEDIUM", "EXTRA", "SUPER", "LIGHT", "HEAVY",
    "LEAN", "FAT",
  ]);

  const allCapsMatches = foodName.match(allCapsRegex);
  if (allCapsMatches) {
    for (const match of allCapsMatches) {
      if (!nonBrandAllCaps.has(match)) return true;
    }
  }

  // Corporate suffixes
  const corporateRegex = /\b(Inc|Corp|LLC|Ltd|GmbH|Co\.|& Co\.|Pty)\b/i;
  if (corporateRegex.test(foodName)) return true;

  return false;
}

// --- Data Processing Steps ---

function groupBySourceKey(recs) {
  console.log(`[GROUP] Grouping ${recs.length} records by sourceId...`);

  const groupedBySourceKey = {};
  recs.forEach((r) => {
    const key = r.sourceId || r.appId || r.id;
    if (!groupedBySourceKey[key]) groupedBySourceKey[key] = [];
    groupedBySourceKey[key].push(r);
  });

  const groupedRecords = [];
  let measuresCollected = 0;

  for (const [sourceKey, variations] of Object.entries(groupedBySourceKey)) {
    if (variations.length > 1) {
      console.log(`[GROUP] SourceKey ${sourceKey}: ${variations.length} variations`);
      measuresCollected += variations.length - 1;
    }

    // All variations should already have measures arrays from json-data-processor
    // Just use the first one (they're the same food, just duplicate records)
    groupedRecords.push(variations[0]);
  }

  console.log(`[GROUP] Deduplicated to ${groupedRecords.length} unique foods`);
  return groupedRecords;
}

function deduplicateByAppId(recs) {
  console.log(`[DEDUPE] Deduplicating ${recs.length} records by appId...`);

  const groupedByAppId = {};
  recs.forEach((r) => {
    if (!groupedByAppId[r.appId]) groupedByAppId[r.appId] = [];
    groupedByAppId[r.appId].push(r);
  });

  const deduplicatedRecords = [];
  let duplicatesFound = 0;

  for (const [appId, foodVariations] of Object.entries(groupedByAppId)) {
    if (foodVariations.length > 1) {
      console.log(`[DEDUPE] AppId ${appId}: ${foodVariations.length} variations`);
      duplicatesFound += foodVariations.length - 1;
    }

    if (foodVariations.length === 1) {
      deduplicatedRecords.push(foodVariations[0]);
    } else {
      // Merge measures from all variations
      const primaryFood = chooseBestServing(foodVariations);
      const allMeasures = [];

      for (const food of foodVariations) {
        if (food.measures && Array.isArray(food.measures)) {
          allMeasures.push(...food.measures);
        }
      }

      // Deduplicate measures
      const seenMeasures = new Map();
      const uniqueMeasures = [];
      for (const measure of allMeasures) {
        const key = measure.measure;
        if (!seenMeasures.has(key)) {
          seenMeasures.set(key, true);
          uniqueMeasures.push(measure);
        }
      }

      deduplicatedRecords.push({
        ...primaryFood,
        measures: uniqueMeasures
      });
    }
  }

  console.log(`[DEDUPE] Removed ${duplicatesFound} duplicates, ${deduplicatedRecords.length} remaining`);
  return deduplicatedRecords;
}

function collapseDuplicates(recs) {
  console.log(`[COLLAPSE] Collapsing similar foods...`);

  const groupedByName = {};
  recs.forEach((r) => {
    const normName = normalizeName(r.name);
    if (!groupedByName[normName]) groupedByName[normName] = [];
    groupedByName[normName].push(r);
  });

  const finalResult = [];

  // Key nutrients for similarity comparison (most important ones)
  const KEY_NUTRIENTS = ['protein', 'calcium', 'fiber'];
  const NUTRIENT_TOLERANCE = 0.05; // 5% variance allowed

  for (const [normName, group] of Object.entries(groupedByName)) {
    if (group.length > 1) {
      console.log(`[COLLAPSE] "${normName}": ${group.length} foods`);
    }

    // Create buckets based on nutrient similarity
    const buckets = [];

    for (const food of group) {
      let foundBucket = false;

      for (const bucket of buckets) {
        // Check if this food is nutritionally similar to the bucket
        const bucketAnchor = bucket[0];
        let isSimilar = true;

        // Compare key nutrients
        for (const nutrient of KEY_NUTRIENTS) {
          const foodValue = food.nutrientsPer100g?.[nutrient] || 0;
          const bucketValue = bucketAnchor.nutrientsPer100g?.[nutrient] || 0;

          // Skip if both are zero
          if (foodValue === 0 && bucketValue === 0) continue;

          // Calculate variance
          const divisor = Math.max(Math.abs(foodValue), Math.abs(bucketValue), 1);
          const variance = Math.abs(foodValue - bucketValue) / divisor;

          if (variance > NUTRIENT_TOLERANCE) {
            isSimilar = false;
            break;
          }
        }

        if (isSimilar) {
          bucket.push(food);
          foundBucket = true;
          break;
        }
      }

      if (!foundBucket) {
        buckets.push([food]);
      }
    }

    // Process each bucket
    for (const bucket of buckets) {
      const chosen = chooseBestServing(bucket);

      // Check if foods were actually collapsed (different sourceIds)
      const uniqueSourceIds = new Set(bucket.map(item => item.sourceId));
      const hasCollapsedFoods = uniqueSourceIds.size > 1;

      let appName = chosen.name;
      if (hasCollapsedFoods) {
        // Find common prefix
        const names = bucket.map((f) => f.name);
        let commonPrefix = names.reduce((a, b) => {
          let i = 0;
          while (i < a.length && a[i] === b[i]) i++;
          return a.substring(0, i);
        });

        commonPrefix = commonPrefix.replace(/[\s,]+$/, "").trim();
        appName = commonPrefix
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase());
        appName += "*";
      }

      // Create entry
      const entry = {
        appId: chosen.appId,
        name: chosen.name,
        appName: appName,
        measures: chosen.measures || [],
        nutrientsPer100g: chosen.nutrientsPer100g || {},
        sourceId: chosen.sourceId,
        sourceName: chosen.sourceName,
        subset: chosen.subset,
      };

      // Add collapsed metadata if applicable
      if (hasCollapsedFoods) {
        const collapsed = bucket.filter((r) => r.sourceId !== chosen.sourceId);
        if (collapsed.length > 0) {
          entry.collapsedFrom = collapsed.map((r) => ({
            sourceId: r.sourceId,
            name: r.name,
            measures: r.measures || [],
            nutrientsPer100g: r.nutrientsPer100g || {},
            subset: r.subset,
          }));
        }
      }

      finalResult.push(entry);
    }
  }

  console.log(`[COLLAPSE] Collapsed to ${finalResult.length} unique foods`);
  return finalResult;
}

function applyAbridge(data) {
  console.log(`[ABRIDGE] Starting abridgement with ${data.length} foods`);

  let filtered = [...data];
  const logStep = (step, before, after) => {
    console.log(`[ABRIDGE] ${step}: ${before} → ${after} (-${before - after})`);
  };

  const stapleFoodRegex = /\b(milk|cheese|yogurt|fruit|vegetable|juice|melon|bread|egg|butter)\b/i;

  // Step 1: Collapse cooking methods
  const methodWords = /\b(roasted|boiled|fried|grilled|braised|steamed|baked|cooked|broiled|raw|pan-fried|not breaded|breaded)\b/gi;
  let before = filtered.length;
  const groupedByCooking = {};

  filtered.forEach((f) => {
    const baseName = f.name
      .replace(methodWords, "")
      .replace(/\(\)/g, "")
      .replace(/, ,/g, ",")
      .replace(/,+/g, ",")
      .replace(/,\s*$/g, "")
      .replace(/\s\s+/g, " ")
      .trim();
    const norm = normalizeName(baseName);
    if (!groupedByCooking[norm]) groupedByCooking[norm] = [];
    groupedByCooking[norm].push(f);
  });

  filtered = Object.values(groupedByCooking).map(
    (g) => g.find((f) => /raw/i.test(f.name)) || g[0]
  );
  logStep("Collapse cooking methods", before, filtered.length);

  // Step 2: Simplify meat cuts
  const meatFoods = filtered.filter((f) => meatFishRegex.test(f.name));
  const otherFoods = filtered.filter((f) => !meatFishRegex.test(f.name));
  const cutWords = /\b(blade|bone-in|boneless|picnic|trimmed|shoulder|arm|sirloin|leg|rib|loin|round|cubed for stew|separable lean only|separable lean and fat|whole|composite of trimmed retail cuts|separable fat|top round|ground)\b/gi;

  before = meatFoods.length;
  const groupedCuts = {};

  meatFoods.forEach((f) => {
    const simplerName = f.name
      .replace(cutWords, "")
      .replace(/\(\)/g, "")
      .replace(/,+/g, ",")
      .replace(/,\s*$/g, "")
      .replace(/\s\s+/g, " ")
      .trim();
    const norm = normalizeName(simplerName);
    if (!groupedCuts[norm]) groupedCuts[norm] = [];
    groupedCuts[norm].push(f);
  });

  const simplifiedMeat = Object.values(groupedCuts).map((g) => {
    if (g.length === 1) return g[0];
    const groundRaw = g.find((f) => /ground/i.test(f.name) && /raw/i.test(f.name));
    const groundCooked = g.find((f) => /ground/i.test(f.name));
    const raw = g.find((f) => /raw/i.test(f.name));
    return groundRaw || groundCooked || raw || g.sort((a, b) => a.name.length - b.name.length)[0];
  });

  logStep("Simplify meat cuts", before, simplifiedMeat.length);
  filtered = [...otherFoods, ...simplifiedMeat];

  // Step 3: Remove industrial preps
  const prepWords = /\b(frozen|canned|prepared|rehydrated|packaged)\b/i;
  before = filtered.length;
  filtered = filtered.filter((f) => {
    const normName = normalizeName(f.name);
    if (keepSet.has(normName) || stapleFoodRegex.test(normName)) return true;
    return !prepWords.test(f.name);
  });
  logStep("Remove industrial preps", before, filtered.length);

  // Step 4: Drop low-nutrient 100g-only foods
  // (Adapt: use protein or calcium as proxy for "substance")
  before = filtered.length;
  filtered = filtered.filter((f) => {
    const normName = normalizeName(f.name);
    if (keepSet.has(normName) || stapleFoodRegex.test(normName)) return true;

    // Check if only has 100g measure
    const only100g = f.measures && f.measures.length === 1 && f.measures[0].measure === "100 g";
    if (!only100g) return true;

    // Check if it has significant nutrients
    const calcium = f.nutrientsPer100g?.calcium || 0;
    const protein = f.nutrientsPer100g?.protein || 0;

    // Keep if it has decent calcium OR protein content
    if (calcium >= 50 || protein >= 5) return true;

    return false;
  });
  logStep("Drop low-nutrient 100g-only", before, filtered.length);

  // Step 5: Category whitelist
  const disallowed = /\b(infant formula|restaurant|snack|pet food)\b/i;
  before = filtered.length;
  filtered = filtered.filter((f) => {
    const normName = normalizeName(f.name);
    if (keepSet.has(normName)) return true;
    return !disallowed.test(f.name) || stapleFoodRegex.test(normName);
  });
  logStep("Category whitelist", before, filtered.length);

  console.log(`[ABRIDGE] Completed: ${filtered.length} foods remaining`);
  return filtered;
}

// --- Main Execution ---

console.log(`[PROCESS] Starting with ${records.length} mastered records`);

// Step 1A: Group by sourceKey
const groupedRecords = groupBySourceKey(records);

// Step 1B: Deduplicate by appId
const dedupedRecords = deduplicateByAppId(groupedRecords);

// Step 2: Collapse by name and nutrient similarity
let full = collapseDuplicates(dedupedRecords);
console.log(`[PROCESS] After collapsing: ${full.length} foods`);

// Step 3: Apply exclude list
if (excludeSet.size > 0) {
  const beforeCount = full.length;
  const excludeTerms = [...excludeSet];
  full = full.filter((food) => {
    // Protect keep-list foods
    if (keepSet.has(normalizeName(food.name))) return true;
    return !excludeTerms.some((term) => food.name.toLowerCase().includes(term));
  });
  console.log(`[PROCESS] Exclude list: ${beforeCount} → ${full.length} (-${beforeCount - full.length})`);
}

// Step 4: Brand filtering
const beforeBrandFilter = full.length;
full = full.filter((food) => !containsBrand(food.name, keepSet));
console.log(`[PROCESS] Brand filter: ${beforeBrandFilter} → ${full.length} (-${beforeBrandFilter - full.length})`);

// Step 5: Abridgement
let abridged = applyAbridge(full);

// Sort by appId
full.sort((a, b) => a.appId - b.appId);
abridged.sort((a, b) => a.appId - b.appId);

// Ensure asterisks on collapsed foods
abridged = abridged.map((food) => {
  if (food.collapsedFrom && food.collapsedFrom.length > 0 && !food.appName.endsWith("*")) {
    return { ...food, appName: food.appName + "*" };
  }
  return food;
});

// Clean up
full.forEach((f) => delete f.id);
abridged.forEach((f) => delete f.id);

// Create metadata
const curatedNotes = "Curated from USDA FoodData Central with multi-nutrient support. Branded foods filtered, cooking methods collapsed, nutritionally similar foods merged.";

const updatedMetadata = metadata ? {
  ...metadata,
  notes: curatedNotes
} : {
  source: "USDA-FDC",
  name: "Curated Multi-Nutrient Database",
  description: "Curated food database with 20+ nutrients",
  notes: curatedNotes
};

const fullOutput = {
  metadata: updatedMetadata,
  foods: full,
};

const abridgedOutput = {
  metadata: updatedMetadata,
  foods: abridged,
};

// Write outputs
fs.writeFileSync(
  `${outputBaseName}-full.json`,
  JSON.stringify(fullOutput, null, 2)
);

fs.writeFileSync(
  `${outputBaseName}-abridged.json`,
  JSON.stringify(abridgedOutput, null, 2)
);

const fullSize = fs.statSync(`${outputBaseName}-full.json`).size;
const abridgedSize = fs.statSync(`${outputBaseName}-abridged.json`).size;

console.log(`\n✅ Curation Complete!`);
console.log(`   Full: ${outputBaseName}-full.json (${(fullSize / 1024 / 1024).toFixed(2)} MB, ${full.length} foods)`);
console.log(`   Abridged: ${outputBaseName}-abridged.json (${(abridgedSize / 1024 / 1024).toFixed(2)} MB, ${abridged.length} foods)`);
console.log("🎉 Done!");
