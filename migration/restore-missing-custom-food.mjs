#!/usr/bin/env node

/**
 * restore-missing-custom-food.mjs
 *
 * Restores a missing custom food from the source backup and re-links journal entries.
 *
 * This specifically fixes the "Oikos Triple Zero Peach" issue where the custom food
 * was lost/deleted but journal entries still reference it.
 */

import fs from 'fs';

const args = process.argv.slice(2);
let backupFile = args[0] || 'nutrients-tracker-backup-2025-12-27.json';
let sourceFile = args[1] || 'merged-output-2025-12-24.json';
let outputFile = args[2] || backupFile.replace('.json', '-restored.json');

console.log(`\n${'='.repeat(70)}`);
console.log('🔧 RESTORE MISSING CUSTOM FOOD');
console.log('='.repeat(70));
console.log(`\n📁 Current backup: ${backupFile}`);
console.log(`📁 Source backup:  ${sourceFile}`);
console.log(`📁 Output file:    ${outputFile}`);

// Load current backup
const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

// Load source backup (migration output with original correct IDs)
const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// Find "Oikos Triple Zero Peach" in source
const oikosTripleZero = source.customFoods.find(f =>
  f.name.toLowerCase().includes('oikos triple zero peach')
);

if (!oikosTripleZero) {
  console.log('\n❌ Could not find "Oikos Triple Zero Peach" in source backup');
  process.exit(1);
}

console.log(`\n✅ Found in source: ID ${oikosTripleZero.id}, "${oikosTripleZero.name}"`);
console.log(`   Calcium: ${oikosTripleZero.nutrients?.calcium || oikosTripleZero.calcium}`);

// Check if it exists in current backup
const existsInCurrent = backup.customFoods.find(f =>
  f.name.toLowerCase() === oikosTripleZero.name.toLowerCase()
);

if (existsInCurrent) {
  console.log(`\n✅ Already exists in current backup as ID ${existsInCurrent.id}`);
  console.log(`   No need to restore - just need to fix journal entry IDs`);

  // Fix journal entries to point to existing ID
  let fixedCount = 0;
  for (const [date, entries] of Object.entries(backup.journalEntries)) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.isCustom &&
          entry.name.toLowerCase().includes('oikos triple zero peach') &&
          entry.customFoodId !== existsInCurrent.id) {

        const oldId = entry.customFoodId;
        entry.customFoodId = existsInCurrent.id;
        console.log(`  Fixed ${date}[${i}]: ${oldId} → ${existsInCurrent.id}`);
        fixedCount++;
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} journal entries`);
} else {
  console.log(`\n⚠️  Does not exist in current backup - will restore it`);

  // Find the next available negative ID
  const minId = Math.min(...backup.customFoods.map(f => f.id));
  const newId = minId - 1;

  console.log(`   Assigning new ID: ${newId}`);

  // Add to custom foods
  const restoredFood = {
    ...oikosTripleZero,
    id: newId
  };

  backup.customFoods.push(restoredFood);

  console.log(`\n✅ Added to custom foods with ID ${newId}`);

  // Fix journal entries
  let fixedCount = 0;
  for (const [date, entries] of Object.entries(backup.journalEntries)) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (entry.isCustom &&
          entry.name.toLowerCase().includes('oikos triple zero peach')) {

        const oldId = entry.customFoodId || 'none';
        entry.customFoodId = newId;
        entry.isCustom = true;
        console.log(`  Fixed ${date}[${i}]: ${oldId} → ${newId}`);
        fixedCount++;
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} journal entries`);
}

// Save restored backup
fs.writeFileSync(outputFile, JSON.stringify(backup, null, 2));

console.log(`\n✅ Restored backup saved to: ${outputFile}`);
console.log(`\n${'='.repeat(70)}\n`);
