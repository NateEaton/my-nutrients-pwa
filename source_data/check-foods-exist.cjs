#!/usr/bin/env node

/**
 * Diagnostic script to check if specific foods exist in the pipeline at various stages
 */

const fs = require('fs');

// Foods to search for
const searchFoods = [
  { term: 'zucchini.*cooked', desc: 'Zucchini, cooked' },
  { term: 'eggs.*grade a.*large', desc: 'Eggs, Grade A, Large' },
  { term: 'broccoli.*frozen.*cooked', desc: 'Broccoli, frozen, cooked' },
  { term: 'butter.*salted', desc: 'Butter, salted' },
  { term: 'peanut butter.*smooth', desc: 'Peanut butter, smooth' },
  { term: 'rice.*brown.*long', desc: 'Rice, brown, long grain' }
];

// Check which data files exist
const files = [
  { name: 'combined-nutrient-data.json', desc: 'Combined source data (after json-parser)' },
  { name: 'mastered-nutrient-data.json', desc: 'After master-key-assigner' },
  { name: 'curated-nutrients-full.json', desc: 'After curator (full)' },
  { name: 'curated-nutrients-abridged.json', desc: 'After curator (abridged)' }
];

console.log('=== CHECKING WHICH PIPELINE FILES EXIST ===\n');

const availableFiles = [];
files.forEach(f => {
  const exists = fs.existsSync(f.name);
  console.log(`${exists ? '✓' : '✗'} ${f.name}`);
  if (exists) {
    const stats = fs.statSync(f.name);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    availableFiles.push(f);
  }
});

if (availableFiles.length === 0) {
  console.log('\n❌ No pipeline data files found!');
  console.log('\nYou need to run the pipeline first:');
  console.log('  1. node master-key-assigner-json.cjs combined-nutrient-data.json mastered-nutrient-data.json');
  console.log('  2. node food-curator-nutrients.cjs mastered-nutrient-data.json curated-nutrients --keep-list keep-list.txt');
  process.exit(1);
}

console.log('\n=== SEARCHING FOR FOODS ===\n');

availableFiles.forEach(file => {
  console.log(`\n📄 ${file.desc} (${file.name}):`);
  console.log('─'.repeat(70));

  const content = fs.readFileSync(file.name, 'utf-8');

  searchFoods.forEach(search => {
    const regex = new RegExp(search.term, 'i');
    const matches = content.match(regex);

    if (matches) {
      // Count how many times it appears
      const globalRegex = new RegExp(search.term, 'gi');
      const allMatches = content.match(globalRegex);
      console.log(`  ✓ ${search.desc}: Found ${allMatches ? allMatches.length : 0} occurrence(s)`);

      // Try to extract the actual food name
      const nameRegex = new RegExp(`"name"\\s*:\\s*"([^"]*${search.term}[^"]*)"`, 'i');
      const nameMatch = content.match(nameRegex);
      if (nameMatch) {
        console.log(`    → "${nameMatch[1]}"`);
      }
    } else {
      console.log(`  ✗ ${search.desc}: NOT FOUND`);
    }
  });
});

console.log('\n\n=== RECOMMENDATIONS ===\n');

if (availableFiles.some(f => f.name === 'curated-nutrients-abridged.json')) {
  console.log('✓ You have curated output - checking if foods survived curation...\n');

  const curatedContent = fs.readFileSync('curated-nutrients-abridged.json', 'utf-8');
  const curatedData = JSON.parse(curatedContent);
  const foods = curatedData.foods || curatedData;

  console.log(`  Total foods in curated database: ${Array.isArray(foods) ? foods.length : 'unknown'}`);

  // Check if any of our search foods exist
  const found = [];
  const missing = [];

  if (Array.isArray(foods)) {
    searchFoods.forEach(search => {
      const regex = new RegExp(search.term, 'i');
      const matchedFood = foods.find(f => regex.test(f.name || ''));
      if (matchedFood) {
        found.push({ search: search.desc, food: matchedFood });
      } else {
        missing.push(search.desc);
      }
    });

    if (found.length > 0) {
      console.log('\n  ✓ Foods found in curated database:');
      found.forEach(item => {
        console.log(`    - ${item.food.name}`);
        console.log(`      appId: ${item.food.appId || item.food.id}`);
      });
    }

    if (missing.length > 0) {
      console.log('\n  ✗ Foods missing from curated database:');
      missing.forEach(desc => console.log(`    - ${desc}`));
      console.log('\n  → These foods were filtered out during curation!');
      console.log('  → Check if they exist in mastered-nutrient-data.json');
    }
  }
} else {
  console.log('You need to run the curator to see if foods survive:\n');
  console.log('  node food-curator-nutrients.cjs mastered-nutrient-data.json curated-nutrients --keep-list keep-list.txt');
}

console.log('\n✅ Diagnostic complete!\n');
