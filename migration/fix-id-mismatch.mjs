#!/usr/bin/env node

/**
 * fix-id-mismatch.mjs
 *
 * Fixes journal entries that have the wrong customFoodId due to ID reuse.
 *
 * Problem: "Oikos Triple Zero Peach" was supposed to have ID -51, but it was
 * lost/deleted. Then "Test" was created and reused ID -51. Old journal entries
 * still point to ID -51 expecting Oikos, but now get Test.
 *
 * Solution: Re-match journal entries to custom foods based on name + calcium,
 * using the source backup as ground truth.
 */

import fs from 'fs';

const args = process.argv.slice(2);
let backupFile = args[0] || 'nutrients-tracker-backup-2025-12-27.json';
let sourceFile = args[1] || 'merged-output-2025-12-24.json';
let outputFile = args[2] || backupFile.replace('.json', '-fixed.json');

console.log(`\n${'='.repeat(70)}`);
console.log('🔧 FIX CUSTOM FOOD ID MISMATCHES');
console.log('='.repeat(70));
console.log(`\n📁 Current backup: ${backupFile}`);
console.log(`📁 Source backup:  ${sourceFile}`);
console.log(`📁 Output file:    ${outputFile}`);

// Load current backup
const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

// Load source backup (migration output with original correct IDs)
const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// Build lookup of source custom foods by name + calcium
const sourceCustomFoodLookup = new Map();
for (const food of source.customFoods) {
  const calcium = food.nutrients?.calcium || food.calcium || 0;
  const key = `${food.name.toLowerCase().trim()}|${Math.round(calcium)}`;
  sourceCustomFoodLookup.set(key, food);
}

console.log(`\n✅ Loaded source custom foods: ${source.customFoods.length}`);
console.log(`✅ Loaded current custom foods: ${backup.customFoods.length}`);

// Build lookup of current custom foods by ID
const currentCustomFoodById = new Map();
for (const food of backup.customFoods) {
  currentCustomFoodById.set(food.id, food);
}

// Find entries with mismatched customFoodId
let fixedCount = 0;
let unmatchedCount = 0;
const changes = [];

for (const [date, entries] of Object.entries(backup.journalEntries)) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (!entry.isCustom || !entry.customFoodId) continue;

    // Get the custom food this entry points to
    const currentFood = currentCustomFoodById.get(entry.customFoodId);

    if (!currentFood) {
      console.log(`⚠️  Entry points to non-existent custom food ID ${entry.customFoodId}: "${entry.name}" on ${date}`);
      continue;
    }

    // Check if the names match
    const entryName = entry.name.toLowerCase().trim();
    const foodName = currentFood.name.toLowerCase().trim();

    if (entryName === foodName) {
      // Names match, no problem
      continue;
    }

    // Names don't match! This is a mismatch - try to find the correct food
    const calcium = entry.nutrients?.calcium || entry.calcium || 0;
    const key = `${entryName}|${Math.round(calcium)}`;
    const correctFood = sourceCustomFoodLookup.get(key);

    if (correctFood) {
      // Found the correct food in source backup
      // Now find it in current backup by name
      const matchInCurrent = backup.customFoods.find(f =>
        f.name.toLowerCase().trim() === correctFood.name.toLowerCase().trim()
      );

      if (matchInCurrent) {
        // Found it! Update the entry
        const oldId = entry.customFoodId;
        entry.customFoodId = matchInCurrent.id;

        changes.push({
          date,
          index: i,
          entryName: entry.name,
          oldId,
          oldFood: currentFood.name,
          newId: matchInCurrent.id,
          newFood: matchInCurrent.name
        });

        fixedCount++;
      } else {
        // The correct food doesn't exist in current backup
        // This means it was deleted - remove customFoodId
        console.log(`\n⚠️  "${entry.name}" on ${date}[${i}]:`);
        console.log(`    Custom food "${correctFood.name}" was deleted`);
        console.log(`    Removing customFoodId from entry`);

        delete entry.customFoodId;
        unmatchedCount++;
      }
    } else {
      console.log(`\n❌ Could not find match for "${entry.name}" (calcium: ${calcium}) on ${date}[${i}]`);
      unmatchedCount++;
    }
  }
}

console.log(`\n${'─'.repeat(70)}`);
console.log('📊 FIX SUMMARY');
console.log('─'.repeat(70));
console.log(`\n  Entries fixed:      ${fixedCount}`);
console.log(`  Entries unmatched:  ${unmatchedCount}`);

if (changes.length > 0) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log('📝 CHANGES APPLIED');
  console.log('─'.repeat(70));

  for (const change of changes) {
    console.log(`\n${change.date}[${change.index}]: "${change.entryName}"`);
    console.log(`  OLD: customFoodId = ${change.oldId} → "${change.oldFood}"`);
    console.log(`  NEW: customFoodId = ${change.newId} → "${change.newFood}"`);
  }
}

// Save fixed backup
fs.writeFileSync(outputFile, JSON.stringify(backup, null, 2));

console.log(`\n✅ Fixed backup saved to: ${outputFile}`);
console.log(`\n${'='.repeat(70)}\n`);
