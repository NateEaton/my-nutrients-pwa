import fs from 'fs';

// Load old database to get calcium values
import('./prod-foodDatabaseData.js').then(async oldModule => {
  const oldDB = oldModule.DEFAULT_FOOD_DATABASE;

  // Load new database using the rehydration module
  const newDBModule = await import('../src/lib/data/foodDatabase.js');
  const newDB = await newDBModule.getFoodDatabase();

  console.log('Loaded new database:', newDB.length, 'foods\n');

  const unmatched = [
    { id: 2477, name: 'Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt', search: 'zucchini' },
    { id: 3306, name: 'Eggs, Grade A, Large, egg whole', search: 'egg, whole' },
    { id: 4464, name: 'Bison, ground, raw', search: 'bison' },
    { id: 110, name: 'Potatoes, mashed, dehydrated, prepared from granules with milk', search: 'potato' },
    { id: 115, name: 'Edamame, frozen, unprepared', search: 'edamame' },
    { id: 133, name: 'Broccoli, frozen, chopped, cooked, boiled, drained, without salt', search: 'broccoli' },
    { id: 659, name: 'Yardlong beans, mature seeds, cooked, boiled, with salt', search: 'yardlong' },
    { id: 1056, name: 'Butter, salted', search: 'butter' },
    { id: 1285, name: 'Peanut butter, smooth style, without salt', search: 'peanut butter' },
    { id: 1934, name: 'Peas, edible-podded, cooked, boiled, drained, with salt', search: 'peas, edible' },
    { id: 2839, name: 'Mushrooms, shiitake, cooked, without salt', search: 'shiitake' },
    { id: 3157, name: 'Arugula, baby, raw', search: 'arugula' },
    { id: 3175, name: 'Avocado, Hass, peeled, raw', search: 'avocado' },
    { id: 3177, name: 'Cabbage, bok choy, raw', search: 'bok choy' },
    { id: 3211, name: 'Rice, brown, long grain, unenriched, raw', search: 'rice, brown' },
    { id: 3216, name: 'Pineapple, raw', search: 'pineapple' },
    { id: 3220, name: 'Lettuce, romaine, green, raw', search: 'romaine' },
    { id: 3224, name: 'Lettuce, leaf, green, raw', search: 'lettuce, green' },
    { id: 3238, name: 'Flaxseed, ground', search: 'flaxseed' },
    { id: 3247, name: 'Cheese, parmesan, grated, refrigerated', search: 'parmesan' },
    { id: 3279, name: 'Spinach, baby', search: 'spinach' }
  ];

  console.log('=== FINDING REPLACEMENTS FOR 21 UNMATCHED FOODS ===\n');

  const replacements = [];

  for (const food of unmatched) {
    const oldFood = oldDB.find(f => f.id === food.id);
    const oldCalcium = oldFood?.calcium || 0;
    const oldMeasure = oldFood?.measure || 'unknown';

    console.log(`\n${food.name}`);
    console.log(`  Old: ${oldCalcium}mg per ${oldMeasure}`);

    // Search strategy: try multiple search patterns
    const searchPatterns = [
      food.search,
      food.name.split(',')[0].toLowerCase(),
      food.name.split(',')[0].toLowerCase().replace(/\b(baby|grade a|large|hass)\b/gi, '').trim()
    ];

    let bestMatch = null;
    let bestScore = 0;

    for (const pattern of searchPatterns) {
      const candidates = newDB.filter(f => {
        const name = f.name?.toLowerCase() || '';
        return name.includes(pattern.toLowerCase());
      });

      for (const candidate of candidates) {
        // Score based on name length (shorter = more generic = better)
        // and calcium similarity
        if (!candidate.measures || candidate.measures.length === 0) continue;

        const newCalcium = candidate.measures[0]?.nutrients?.calcium || 0;

        // Calculate similarity
        const nameLengthScore = 1000 / (candidate.name.length + 1);
        const calciumDiff = Math.abs(newCalcium - oldCalcium);
        const calciumScore = oldCalcium > 0 ? 100 - (calciumDiff / oldCalcium * 100) : 50;

        const totalScore = nameLengthScore + calciumScore;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = {
            appId: candidate.id,  // In new DB, id IS the appId
            name: candidate.name,
            measure: candidate.measures[0].measure,
            calcium: newCalcium
          };
        }
      }
    }

    if (bestMatch) {
      console.log(`  New: appId ${bestMatch.appId} - ${bestMatch.name}`);
      console.log(`       ${bestMatch.calcium}mg per ${bestMatch.measure}`);

      if (oldCalcium > 0) {
        const diff = Math.abs(bestMatch.calcium - oldCalcium);
        const pct = ((diff / oldCalcium) * 100).toFixed(0);
        const status = pct < 10 ? '✓ GOOD' : pct < 30 ? '~ OK' : '✗ POOR';
        console.log(`       Diff: ${diff.toFixed(1)}mg (${pct}%) ${status}`);
      }

      replacements.push({
        oldId: food.id,
        oldName: food.name,
        oldCalcium: oldCalcium,
        oldMeasure: oldMeasure,
        newAppId: bestMatch.appId,
        newName: bestMatch.name,
        newCalcium: bestMatch.calcium,
        newMeasure: bestMatch.measure,
        diff: Math.abs(bestMatch.calcium - oldCalcium),
        diffPercent: oldCalcium > 0 ? ((Math.abs(bestMatch.calcium - oldCalcium) / oldCalcium) * 100).toFixed(1) : '0'
      });
    } else {
      console.log('  → NO MATCH FOUND');
      replacements.push({
        oldId: food.id,
        oldName: food.name,
        oldCalcium: oldCalcium,
        oldMeasure: oldMeasure,
        newAppId: null,
        newName: null,
        newCalcium: null,
        newMeasure: null,
        diff: null,
        diffPercent: null
      });
    }
  }

  // Write results to JSON file
  fs.writeFileSync(
    './food-replacements-mapping.json',
    JSON.stringify(replacements, null, 2)
  );

  console.log('\n\n=== SUMMARY ===');
  console.log(`Total unmatched: ${replacements.length}`);
  console.log(`Found replacements: ${replacements.filter(r => r.newAppId !== null).length}`);
  console.log(`No match found: ${replacements.filter(r => r.newAppId === null).length}`);
  console.log('\nResults written to: food-replacements-mapping.json');
});
