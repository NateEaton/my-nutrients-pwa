#!/usr/bin/env node

/**
 * master-key-assigner-json.cjs
 *
 * JSON-compatible version of master-key-assigner
 * Assigns permanent, stable app IDs to food records from JSON data sources.
 * Designed to work with output from json-data-processor.cjs
 */

const fs = require("fs");
const path = require("path");

// --- Argument Parsing ---
const args = process.argv.slice(2);
let inputFile = null;
let mapFile = null;
let outputFile = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "--input":
      inputFile = args[++i];
      break;
    case "--map":
      mapFile = args[++i];
      break;
    case "--output":
      outputFile = args[++i];
      break;
    default:
      if (!arg.startsWith("--")) {
        if (!inputFile) inputFile = arg;
        else if (!mapFile) mapFile = arg;
        else if (!outputFile) outputFile = arg;
      }
      break;
  }
}

// Set default files if not provided
if (!mapFile) {
  mapFile = "master-key-map.json";
  console.log(`📁 Using default map file: ${mapFile}`);
}

if (!inputFile) {
  console.error("Usage: node master-key-assigner-json.cjs --input <file.json> [--map <master-key-map.json>] [--output <output.json>]");
  console.error("   or: node master-key-assigner-json.cjs <file.json> [master-key-map.json] [output.json]");
  console.error("   Map file defaults to 'master-key-map.json' if not specified");
  console.error("   Output file defaults to 'mastered-<input>.json' if not specified");
  process.exit(1);
}

// Set default output file
if (!outputFile) {
  const baseName = path.basename(inputFile, path.extname(inputFile));
  outputFile = `mastered-${baseName}.json`;
}

// --- Helper Functions ---

function loadMasterKeyMap(mapPath) {
  if (!fs.existsSync(mapPath)) {
    console.log(`📁 Creating new master key map: ${mapPath}`);
    return { nextAppId: 1, mappings: {} };
  }
  return JSON.parse(fs.readFileSync(mapPath, "utf8"));
}

function saveMasterKeyMap(mapPath, keyMap) {
  fs.writeFileSync(mapPath, JSON.stringify(keyMap, null, 2));
}

function createExternalKey(sourceName, sourceId) {
  return `${sourceName}_${sourceId}`;
}

// --- Main Processing Function ---

function assignMasterKeys(inputData, keyMap) {
  console.log(`📊 Processing ${inputData.foods.length} foods...`);

  const masteredFoods = [];
  let newKeysAssigned = 0;

  for (const food of inputData.foods) {
    // Extract source information
    const sourceId = food.id || food.sourceId;
    const sourceName = food.source || inputData.metadata?.sourceName || 'unknown';

    if (!sourceId) {
      console.warn(`⚠️ Missing source ID for food, skipping:`, food.name);
      continue;
    }

    const externalKey = createExternalKey(sourceName, sourceId);

    // Get or assign app ID
    let appId;
    if (keyMap.mappings[externalKey]) {
      appId = keyMap.mappings[externalKey];
    } else {
      appId = keyMap.nextAppId++;
      keyMap.mappings[externalKey] = appId;
      newKeysAssigned++;
    }

    // Create mastered food record with appId
    const masteredFood = {
      appId,
      id: appId, // Alias for consistency
      sourceId,
      sourceName,
      name: food.name,
      measures: food.measures,
      nutrientsPer100g: food.nutrientsPer100g
    };

    masteredFoods.push(masteredFood);
  }

  console.log(`🔑 Assigned ${newKeysAssigned} new app IDs`);
  console.log(`📈 Total mappings: ${Object.keys(keyMap.mappings).length}`);
  console.log(`🎯 Next available app ID: ${keyMap.nextAppId}`);

  return masteredFoods;
}

// --- Main Execution ---

(async () => {
  try {
    console.log("🚀 Master Key Assigner (JSON) - Starting...");

    // Load input JSON
    console.log(`📖 Reading JSON file: ${inputFile}`);
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Input file not found: ${inputFile}`);
      process.exit(1);
    }

    const inputData = JSON.parse(fs.readFileSync(inputFile, "utf-8"));

    if (!inputData.foods || !Array.isArray(inputData.foods)) {
      console.error(`❌ Invalid input format. Expected {metadata, foods: [...]} structure`);
      process.exit(1);
    }

    console.log(`📋 Source: ${inputData.metadata?.sourceName || 'unknown'}`);
    console.log(`📦 Input foods: ${inputData.foods.length}`);

    // Load or create key map
    const keyMap = loadMasterKeyMap(mapFile);

    // Assign master keys
    const masteredFoods = assignMasterKeys(inputData, keyMap);

    // Save updated key map
    saveMasterKeyMap(mapFile, keyMap);
    console.log(`💾 Updated master key map: ${mapFile}`);

    // Create output object with metadata and data
    const output = {
      metadata: {
        ...inputData.metadata,
        masteredAt: new Date().toISOString(),
        totalFoods: masteredFoods.length
      },
      foods: masteredFoods
    };

    // Save mastered data
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

    const fileSize = fs.statSync(outputFile).size;
    console.log(`✅ Mastered data saved: ${outputFile}`);
    console.log(`📊 Total records: ${masteredFoods.length}`);
    console.log(`📦 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log("🎉 Master key assignment complete!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
