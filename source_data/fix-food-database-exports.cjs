#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/data/foodDatabaseData.js');

console.log('📖 Reading foodDatabaseData.js...');
let content = fs.readFileSync(filePath, 'utf-8');

console.log('🔧 Fixing exports...');

// Define the rehydration key mappings
const KEYS = {
  "i": "id",
  "n": "name",
  "ms": "measures",
  "n100": "nutrientsPer100g",
  "si": "sourceId",
  "sn": "sourceName"
};

const MEASURE_KEYS = {
  "s": "measure",
  "n": "nutrients",
  "g": "gramWeight"
};

// Replace 'export const foodData' with 'export const DB'
content = content.replace(/export const foodData\s*=/g, 'export const DB =');

// Add the missing exports at the end
const additionalExports = `

// Key mappings for rehydration
export const KEYS = ${JSON.stringify(KEYS, null, 2)};

// Measure object key mappings for rehydration
export const MEASURE_KEYS = ${JSON.stringify(MEASURE_KEYS, null, 2)};

// Format flag
export const __minified__ = true;

// Database metadata
export const DATABASE_METADATA = {
  "source": "USDA FoodData Central",
  "name": "My Nutrients Food Database",
  "description": "Comprehensive multi-nutrient food database",
  "version": "1.0",
  "recordCount": 3685
};
`;

content += additionalExports;

console.log('💾 Writing fixed file...');
fs.writeFileSync(filePath, content, 'utf-8');

console.log('✅ Fixed! foodDatabaseData.js now has correct exports.');
console.log('   - DB (minified food data)');
console.log('   - KEYS (rehydration mappings)');
console.log('   - MEASURE_KEYS (measure rehydration mappings)');
console.log('   - __minified__ (format flag)');
console.log('   - DATABASE_METADATA (metadata)');
