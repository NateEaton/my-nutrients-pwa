#!/usr/bin/env node
import fs from 'fs';

const backupFile = process.argv[2] || 'nutrients-tracker-backup-2025-12-27.json';

console.log(`\n📊 Diagnosing ID confusion for -50 (Oikos) and -51 (Test)\n`);
console.log(`Reading: ${backupFile}\n`);

const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

// Check custom foods
console.log('════════════════════════════════════════════════════════');
console.log('CUSTOM FOODS DEFINITIONS');
console.log('════════════════════════════════════════════════════════\n');

const customFoods = data.customFoods || [];
const relevantFoods = customFoods.filter(f => f.id === -50 || f.id === -51 || f.id === -52 || f.name.includes('Oikos') || f.name.includes('Test'));

if (relevantFoods.length === 0) {
  console.log('❌ No relevant custom foods found!\n');
} else {
  relevantFoods.forEach(food => {
    console.log(`ID: ${food.id}`);
    console.log(`Name: ${food.name}`);
    console.log(`Measure: ${food.measure}`);
    console.log(`Nutrients:`, food.nutrients || { calcium: food.calcium });
    console.log(`Date Added: ${food.dateAdded}`);
    console.log('---');
  });
}

// Check journal entries with those IDs
console.log('\n════════════════════════════════════════════════════════');
console.log('JOURNAL ENTRIES WITH THESE IDs');
console.log('════════════════════════════════════════════════════════\n');

const journalEntries = data.journalEntries || {};
let entriesWithId50 = [];
let entriesWithId51 = [];
let entriesWithId52 = [];

for (const [date, entries] of Object.entries(journalEntries)) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.customFoodId === -50) {
      entriesWithId50.push({ date, index: i, entry });
    }
    if (entry.customFoodId === -51) {
      entriesWithId51.push({ date, index: i, entry });
    }
    if (entry.customFoodId === -52) {
      entriesWithId52.push({ date, index: i, entry });
    }
  }
}

console.log(`Entries with customFoodId = -50 (should be Oikos): ${entriesWithId50.length}`);
if (entriesWithId50.length > 0) {
  entriesWithId50.forEach(({ date, index, entry }) => {
    console.log(`  ${date}[${index}]: "${entry.name}" - ${entry.servingQuantity} ${entry.servingUnit}`);
  });
}

console.log(`\nEntries with customFoodId = -51 (should be Test): ${entriesWithId51.length}`);
if (entriesWithId51.length > 0) {
  entriesWithId51.forEach(({ date, index, entry }) => {
    console.log(`  ${date}[${index}]: "${entry.name}" - ${entry.servingQuantity} ${entry.servingUnit}`);
  });
}

console.log(`\nEntries with customFoodId = -52 (should be crackers): ${entriesWithId52.length}`);
if (entriesWithId52.length > 0) {
  entriesWithId52.forEach(({ date, index, entry }) => {
    console.log(`  ${date}[${index}]: "${entry.name}" - ${entry.servingQuantity} ${entry.servingUnit}`);
  });
}

// Check for entries that might have wrong names
console.log('\n════════════════════════════════════════════════════════');
console.log('POTENTIAL ISSUES');
console.log('════════════════════════════════════════════════════════\n');

// Check if any -50 entries have "Test" name
const id50WithTestName = entriesWithId50.filter(({ entry }) => entry.name === 'Test');
if (id50WithTestName.length > 0) {
  console.log(`❌ PROBLEM: Found ${id50WithTestName.length} entries with customFoodId=-50 but name="Test"`);
  id50WithTestName.forEach(({ date, index }) => {
    console.log(`   ${date}[${index}]`);
  });
}

// Check if any -51 entries have "Oikos" name
const id51WithOikosName = entriesWithId51.filter(({ entry }) => entry.name.includes('Oikos'));
if (id51WithOikosName.length > 0) {
  console.log(`❌ PROBLEM: Found ${id51WithOikosName.length} entries with customFoodId=-51 but name contains "Oikos"`);
  id51WithOikosName.forEach(({ date, index, entry }) => {
    console.log(`   ${date}[${index}]: "${entry.name}"`);
  });
}

// Check if there are Oikos entries without customFoodId
let oikosEntriesNoId = [];
for (const [date, entries] of Object.entries(journalEntries)) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.isCustom && entry.name.includes('Oikos') && !entry.customFoodId) {
      oikosEntriesNoId.push({ date, index: i, entry });
    }
  }
}

if (oikosEntriesNoId.length > 0) {
  console.log(`\n⚠️  Found ${oikosEntriesNoId.length} Oikos entries WITHOUT customFoodId:`);
  oikosEntriesNoId.forEach(({ date, index, entry }) => {
    console.log(`   ${date}[${index}]: "${entry.name}" - ${entry.servingQuantity} ${entry.servingUnit}`);
  });
}

console.log('\n════════════════════════════════════════════════════════\n');
