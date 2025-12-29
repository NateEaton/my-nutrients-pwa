#!/usr/bin/env node

/**
 * csv-to-mapping.mjs
 *
 * Converts filled-in CSV from analyze-journal-ids.mjs to JSON mapping format
 * for use with cleanup-journal-ids.mjs
 *
 * Usage:
 *   node csv-to-mapping.mjs <input.csv> <output.json>
 */

import fs from 'fs';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node csv-to-mapping.mjs <input.csv> <output.json>');
  console.error('');
  console.error('Converts filled-in CSV to JSON mapping format for cleanup script.');
  console.error('');
  console.error('CSV should have columns: name, targetAppId, convertToCustom');
  console.error('Fill in either targetAppId OR convertToCustom=TRUE for each food.');
  process.exit(1);
}

const [inputCsv, outputJson] = args;

// Read CSV
let csvContent;
try {
  csvContent = fs.readFileSync(inputCsv, 'utf8');
} catch (error) {
  console.error(`❌ Error reading CSV file: ${error.message}`);
  process.exit(1);
}

// Parse CSV
const lines = csvContent.split('\n').filter(line => line.trim());
const header = lines[0].split(',');

// Find column indices
const nameIdx = header.indexOf('name');
const targetAppIdIdx = header.indexOf('targetAppId');
const convertToCustomIdx = header.indexOf('convertToCustom');

if (nameIdx === -1 || targetAppIdIdx === -1 || convertToCustomIdx === -1) {
  console.error('❌ Error: CSV missing required columns (name, targetAppId, convertToCustom)');
  process.exit(1);
}

// Build mapping object
const mapping = {
  databaseFoodMappings: {}
};

let mappedCount = 0;
let customCount = 0;
let skippedCount = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  // Parse CSV line (handle quoted strings)
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current); // Add last column

  const name = cols[nameIdx].replace(/^"|"$/g, ''); // Remove surrounding quotes
  const targetAppId = cols[targetAppIdIdx]?.trim();
  const convertToCustom = cols[convertToCustomIdx]?.trim().toUpperCase();

  if (!name) continue;

  // Check if either field is filled in
  if (targetAppId && targetAppId !== '') {
    mapping.databaseFoodMappings[name] = {
      targetAppId: parseInt(targetAppId, 10)
    };
    mappedCount++;
  } else if (convertToCustom === 'TRUE' || convertToCustom === 'T' || convertToCustom === 'YES' || convertToCustom === 'Y') {
    mapping.databaseFoodMappings[name] = {
      convertToCustom: true
    };
    customCount++;
  } else {
    skippedCount++;
  }
}

// Write JSON
try {
  fs.writeFileSync(outputJson, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`✅ Conversion complete!`);
  console.log(`   Mapped to appId: ${mappedCount}`);
  console.log(`   Convert to custom: ${customCount}`);
  console.log(`   Skipped (no mapping): ${skippedCount}`);
  console.log(`\n📁 Output: ${outputJson}`);
  console.log(`\n📝 Next step:`);
  console.log(`   node cleanup-journal-ids.mjs --input <backup.json> --output <output.json> --db-food-mapping ${outputJson}`);
} catch (error) {
  console.error(`❌ Error writing JSON file: ${error.message}`);
  process.exit(1);
}
