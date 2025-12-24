// Manual search for better matches for the poor automated results
const newDBModule = await import('../src/lib/data/foodDatabase.js');
const newDB = await newDBModule.getFoodDatabase();

// Load old database
import('./prod-foodDatabaseData.js').then(oldModule => {
  const oldDB = oldModule.DEFAULT_FOOD_DATABASE;

  // Foods that need better matches
  const needsBetter = [
    { id: 110, name: 'Potatoes, mashed, dehydrated', search: ['potato', 'mashed'], oldCa: 74 },
    { id: 115, name: 'Edamame, frozen', search: ['edamame', 'soybean'], oldCa: 71 },
    { id: 1056, name: 'Butter, salted', search: ['butter, salted', 'butter, with salt'], oldCa: 54.5 },
    { id: 1285, name: 'Peanut butter', search: ['peanut butter', 'peanuts'], oldCa: 126 },
    { id: 3157, name: 'Arugula, baby', search: ['arugula'], oldCa: 204, oldMeasure: '100 g' },
    { id: 3177, name: 'Cabbage, bok choy', search: ['bok choy', 'pak choy', 'chinese cabbage'], oldCa: 61.9, oldMeasure: '100 g' },
    { id: 3211, name: 'Rice, brown, long grain', search: ['rice, brown', 'rice, long-grain brown'], oldCa: 8.06, oldMeasure: '100 g' },
    { id: 3216, name: 'Pineapple, raw', search: ['pineapple, raw', 'pineapple, fresh'], oldCa: 12.5, oldMeasure: '100 g' },
    { id: 3220, name: 'Lettuce, romaine', search: ['lettuce, romaine', 'lettuce, cos'], oldCa: 27.6, oldMeasure: '100 g' },
    { id: 3224, name: 'Lettuce, leaf, green', search: ['lettuce, green leaf', 'lettuce, leaf'], oldCa: 39.8, oldMeasure: '100 g' },
    { id: 3238, name: 'Flaxseed, ground', search: ['flaxseed', 'seeds, flaxseed'], oldCa: 230, oldMeasure: '100 g' },
  ];

  console.log('=== MANUAL SEARCH FOR BETTER MATCHES ===\n');

  for (const food of needsBetter) {
    console.log(`\n${food.name} (old ID ${food.id})`);
    console.log(`  Old calcium: ${food.oldCa}mg per ${food.oldMeasure || 'serving'}`);

    // Search with each pattern
    let allCandidates = [];
    for (const pattern of food.search) {
      const matches = newDB.filter(f =>
        f.name?.toLowerCase().includes(pattern.toLowerCase())
      );
      allCandidates.push(...matches);
    }

    // Deduplicate by id
    const uniqueCandidates = Array.from(
      new Map(allCandidates.map(f => [f.id, f])).values()
    );

    console.log(`  Found ${uniqueCandidates.length} candidates:`);

    // Show top 5 candidates with calcium values
    uniqueCandidates
      .slice(0, 8)
      .forEach(candidate => {
        if (!candidate.measures || candidate.measures.length === 0) return;

        // Show first measure with 100g if available
        const measure100g = candidate.measures.find(m => m.measure.includes('100 g'));
        const firstMeasure = measure100g || candidate.measures[0];

        const ca = firstMeasure.nutrients?.calcium || 0;
        const diff = food.oldCa > 0 ? Math.abs(ca - food.oldCa) : 0;
        const pct = food.oldCa > 0 ? ((diff / food.oldCa) * 100).toFixed(0) : '0';

        console.log(`    ${candidate.id}: ${candidate.name}`);
        console.log(`         ${ca}mg per ${firstMeasure.measure} (diff: ${diff.toFixed(1)}mg, ${pct}%)`);
      });
  }
});
