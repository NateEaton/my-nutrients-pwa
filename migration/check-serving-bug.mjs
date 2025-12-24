#!/usr/bin/env node
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('nutrients-restore-2025-12-18-CORRECTED.json', 'utf8'));

// Find entries with suspicious serving patterns
let examples = [];
let totalBugged = 0;
for (const [date, entries] of Object.entries(data.journalEntries)) {
  for (const entry of entries) {
    // Look for servingQuantity=1 with unit like '3 oz (85g)'
    if (entry.servingQuantity === 1 && entry.servingUnit && entry.servingUnit.match(/^\d+\s*(oz|tablespoon|cup|teaspoon)/)) {
      totalBugged++;
      if (examples.length < 10) {
        examples.push({
          date,
          name: entry.name.substring(0, 60),
          qty: entry.servingQuantity,
          unit: entry.servingUnit,
          hasAppId: !!entry.appId,
          isCustom: entry.isCustom
        });
      }
    }
  }
}

console.log('Examples of serving size bug:');
examples.forEach(ex => console.log(JSON.stringify(ex, null, 2)));
console.log('\nTotal bugged entries found:', totalBugged);

// Also check precision issue
console.log('\n--- Precision Check ---');
const sampleEntries = [];
for (const [date, entries] of Object.entries(data.journalEntries)) {
  for (const entry of entries) {
    if (entry.nutrients && entry.nutrients.protein && !entry.isCustom) {
      sampleEntries.push({
        name: entry.name.substring(0, 60),
        protein: entry.nutrients.protein,
        calcium: entry.nutrients.calcium,
        hasAppId: !!entry.appId
      });
      if (sampleEntries.length >= 5) break;
    }
  }
  if (sampleEntries.length >= 5) break;
}

console.log('Sample nutrient precision:');
sampleEntries.forEach(ex => console.log(JSON.stringify(ex, null, 2)));
