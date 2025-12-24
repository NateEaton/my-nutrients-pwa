// Check the structure of foods in the new database
const newDBModule = await import('../src/lib/data/foodDatabase.js');
const newDB = await newDBModule.getFoodDatabase();

console.log('Database loaded:', newDB.length, 'foods\n');

// Check first few foods
console.log('=== SAMPLE FOOD STRUCTURES ===\n');

for (let i = 0; i < 3 && i < newDB.length; i++) {
  const food = newDB[i];
  console.log(`Food ${i}:`, JSON.stringify(food, null, 2).substring(0, 500));
  console.log('Keys:', Object.keys(food));
  console.log();
}

// Search for a specific food to see its structure
const zucchini = newDB.find(f => f.name?.toLowerCase().includes('zucchini'));
if (zucchini) {
  console.log('=== ZUCCHINI EXAMPLE ===');
  console.log('Keys:', Object.keys(zucchini));
  console.log('Full object:', JSON.stringify(zucchini, null, 2));
}
