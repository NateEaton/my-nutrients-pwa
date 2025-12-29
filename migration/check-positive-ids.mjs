#!/usr/bin/env node
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('nutrients-restore-2025-12-24.json', 'utf8'));

// Find entries with positive customFoodId
let positiveIds = new Map();
for (const [date, entries] of Object.entries(data.journalEntries)) {
  for (const entry of entries) {
    if (entry.isCustom && entry.customFoodId > 0) {
      const key = entry.customFoodId;
      if (!positiveIds.has(key)) {
        positiveIds.set(key, []);
      }
      positiveIds.get(key).push({
        date,
        name: entry.name,
        calcium: entry.nutrients?.calcium || entry.calcium
      });
    }
  }
}

console.log('Positive customFoodId values found in journal entries:');
console.log('=====================================================\n');
for (const [id, entries] of Array.from(positiveIds.entries()).sort((a,b) => a[0]-b[0])) {
  const sample = entries[0];
  console.log(`ID ${id}: ${entries.length} entries`);
  console.log(`  Example: "${sample.name}" (calcium: ${sample.calcium})`);

  // Try to find matching custom food by name
  const matchByName = data.customFoods.find(f =>
    f.name.toLowerCase() === sample.name.toLowerCase()
  );
  if (matchByName) {
    console.log(`  ✓ Found in custom foods: ID=${matchByName.id}, Name="${matchByName.name}"`);
  } else {
    console.log(`  ✗ NOT found in custom foods list`);
  }
  console.log();
}
