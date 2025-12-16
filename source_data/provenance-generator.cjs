/**
 * provenance-generator.cjs
 * Generates chunked JSON files for food provenance (source details).
 * Replaces the old static HTML documentation generator.
 * 
 * Usage: node provenance-generator.cjs <curated-file> <master-file> <output-dir>
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CHUNK_COUNT = 20; // Split data into 20 files

// Parse args
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node provenance-generator.cjs <curated-file> <master-file> <output-dir>');
  process.exit(1);
}

const [curatedPath, masterPath, outputDir] = args;

// Helper to ensure we have an array
function ensureArray(data, filename) {
  if (Array.isArray(data)) return data;
  if (data.foods && Array.isArray(data.foods)) return data.foods;
  if (data.FoundationFoods || data.SRLegacyFoods) {
    return [...(data.FoundationFoods || []), ...(data.SRLegacyFoods || [])];
  }
  return [];
}

// Helper to format a source entry for the frontend
function formatSourceEntry(item) {
  // Determine nutrients object (handle per100g vs flat)
  const nutrients = item.nutrientsPer100g || item.nutrients || {};
  
  // Determine measure text
  // 1. Try measures array (first item)
  // 2. Try 'measure' string
  // 3. Default to 100g
  let measure = "100 g";
  if (item.measures && item.measures.length > 0) {
    measure = item.measures[0].measure;
  } else if (item.measure) {
    measure = item.measure;
  }

  return {
    fdcId: item.sourceId || item.fdcId || 0,
    description: item.name || item.description || "Unknown Food",
    nutrients: nutrients,
    measure: measure
  };
}

try {
  console.log('Loading datasets...');
  
  const rawCurated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
  const curatedData = ensureArray(rawCurated, 'curated-file');
  
  const rawMaster = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const masterData = ensureArray(rawMaster, 'master-file');

  // Create lookup map for master data by SOURCE ID (FDC ID)
  // The curated data references master data via 'sourceId', not 'appId'
  const masterMap = new Map();
  masterData.forEach(food => {
    // sourceId is usually the FDC ID in the mastered file
    const key = food.sourceId || food.fdcId;
    if (key) {
      masterMap.set(String(key), food); 
    }
  });

  console.log(`Loaded ${curatedData.length} curated foods and ${masterData.length} master records.`);

  // Initialize chunks
  const chunks = Array.from({ length: CHUNK_COUNT }, () => ({}));

  // Process
  let processedCount = 0;
  let collapsedCount = 0;

  curatedData.forEach(food => {
    // Use the stable appId to determine chunk
    const appId = food.appId || food.id;
    if (!appId) return;

    const chunkId = appId % CHUNK_COUNT;
    
    let sourceItems = [];

    // 1. Add the Primary Source
    // Look up the full master record using the sourceId
    const primarySourceId = String(food.sourceId);
    if (masterMap.has(primarySourceId)) {
      sourceItems.push(formatSourceEntry(masterMap.get(primarySourceId)));
    } else {
      // Fallback: use the curated record itself if master not found
      sourceItems.push(formatSourceEntry(food));
    }

    // 2. Add Collapsed Sources (if any)
    if (food.collapsedFrom && Array.isArray(food.collapsedFrom)) {
      food.collapsedFrom.forEach(collapsed => {
        // 'collapsed' is already an object with name, sourceId, etc.
        // We can format it directly.
        sourceItems.push(formatSourceEntry(collapsed));
        collapsedCount++;
      });
    }

    // Add to chunk if we have data
    if (sourceItems.length > 0) {
      chunks[chunkId][appId] = sourceItems;
      processedCount++;
    }
  });

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write chunks
  console.log(`Writing ${CHUNK_COUNT} chunks to ${outputDir}...`);
  chunks.forEach((chunk, index) => {
    const filePath = path.join(outputDir, `provenance_${index}.json`);
    fs.writeFileSync(filePath, JSON.stringify(chunk));
  });

  console.log(`✅ Generated provenance data for ${processedCount} foods.`);
  console.log(`   (Included ${collapsedCount} collapsed source entries)`);

} catch (err) {
  console.error('Error generating provenance data:', err.message);
  console.error(err.stack);
  process.exit(1);
}