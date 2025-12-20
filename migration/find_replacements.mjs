import fs from 'fs';

// Load old database to get calcium values
import('./prod-foodDatabaseData.js').then(async oldModule => {
  const oldDB = oldModule.DEFAULT_FOOD_DATABASE;

  // Load new database
  const newDBContent = fs.readFileSync('../src/lib/data/foodDatabaseData.js', 'utf8');

  // Parse new database
  const dbMatch = newDBContent.match(/export const DB = (\[[\s\S]*?\]);/);
  const keysMatch = newDBContent.match(/export const KEYS = (\{[\s\S]*?\});/);

  if (!dbMatch || !keysMatch) {
    console.log('Could not parse new database');
    return;
  }

  const DB = eval(dbMatch[1]);
  const KEYS = eval(keysMatch[1]);

  // Helper to rehydrate minified food
  function rehydrateFood(minFood) {
    const food = {};
    for (const [key, value] of Object.entries(minFood)) {
      const fullKey = KEYS[key] || key;
      food[fullKey] = value;
    }
    return food;
  }

  const unmatched = [
    { id: 2477, name: 'Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt' },
    { id: 3306, name: 'Eggs, Grade A, Large, egg whole' },
    { id: 4464, name: 'Bison, ground, raw' },
    { id: 110, name: 'Potatoes, mashed, dehydrated, prepared from granules with milk' },
    { id: 115, name: 'Edamame, frozen, unprepared' },
    { id: 133, name: 'Broccoli, frozen, chopped, cooked, boiled, drained, without salt' },
    { id: 659, name: 'Yardlong beans, mature seeds, cooked, boiled, with salt' },
    { id: 1056, name: 'Butter, salted' },
    { id: 1285, name: 'Peanut butter, smooth style, without salt' },
    { id: 1934, name: 'Peas, edible-podded, cooked, boiled, drained, with salt' },
    { id: 2839, name: 'Mushrooms, shiitake, cooked, without salt' },
    { id: 3157, name: 'Arugula, baby, raw' },
    { id: 3175, name: 'Avocado, Hass, peeled, raw' },
    { id: 3177, name: 'Cabbage, bok choy, raw' },
    { id: 3211, name: 'Rice, brown, long grain, unenriched, raw' },
    { id: 3216, name: 'Pineapple, raw' },
    { id: 3220, name: 'Lettuce, romaine, green, raw' },
    { id: 3224, name: 'Lettuce, leaf, green, raw' },
    { id: 3238, name: 'Flaxseed, ground' },
    { id: 3247, name: 'Cheese, parmesan, grated, refrigerated' },
    { id: 3279, name: 'Spinach, baby' }
  ];

  console.log('=== FINDING REPLACEMENTS FOR 21 UNMATCHED FOODS ===\n');

  for (const food of unmatched) {
    const oldFood = oldDB.find(f => f.id === food.id);
    const oldCalcium = oldFood?.calcium || 'unknown';
    const oldMeasure = oldFood?.measure || 'unknown';

    console.log(food.name);
    console.log('  Old:', oldCalcium + 'mg per', oldMeasure);

    // Search strategy
    const searchTerm = food.name.toLowerCase()
      .replace(/\b(cooked|boiled|raw|frozen|baby|grade a|large|hass|peeled|prepared|drained|with salt|without salt|salted|smooth style|grated|refrigerated|dehydrated|unprepared|chopped)\b/gi, '')
      .replace(/,\s+includes skin/, '')
      .split(',')[0].trim();

    const candidates = DB.filter(f => {
      const rehydrated = rehydrateFood(f);
      return rehydrated.name && rehydrated.name.toLowerCase().includes(searchTerm);
    }).map(f => {
      const rehydrated = rehydrateFood(f);
      return {
        appId: rehydrated.appId,
        name: rehydrated.name,
        measures: rehydrated.measures || []
      };
    });

    if (candidates.length > 0) {
      // Pick best match (shortest name usually = most generic)
      const best = candidates.sort((a, b) => a.name.length - b.name.length)[0];

      // Get calcium from first measure
      const newCalcium = best.measures[0]?.nutrients?.calcium || 'N/A';
      const newMeasure = best.measures[0]?.measure || 'N/A';

      console.log('  New: appId', best.appId + ',', best.name);
      console.log('      ', newCalcium + 'mg per', newMeasure);

      if (typeof newCalcium === 'number' && typeof oldCalcium === 'number') {
        const diff = Math.abs(newCalcium - oldCalcium);
        const pct = ((diff / oldCalcium) * 100).toFixed(0);
        console.log('       Diff:', diff.toFixed(1) + 'mg (' + pct + '%)');
      }
    } else {
      console.log('  → NOT FOUND in new database');
    }
    console.log();
  }
});
