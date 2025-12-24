import fs from 'fs';
import('./prod-foodDatabaseData.js').then(module => {
  const oldDB = module.DEFAULT_FOOD_DATABASE;
  console.log('=== ORIGINAL 5 FAVORITES ===\n');
  const original = JSON.parse(fs.readFileSync('./calcium-tracker-backup-2025-12-18.json', 'utf8'));
  const favoriteNames = [];
  original.favorites.forEach(id => {
    const food = oldDB.find(f => f.id === id);
    if (food) {
      console.log('ID', id + ':', food.name);
      favoriteNames.push({ id, name: food.name });
    }
  });
  console.log('\n=== IN MIGRATED JOURNAL ===\n');
  const finalRestore = JSON.parse(fs.readFileSync('./nutrients-restore-2025-12-18-CORRECTED.json', 'utf8'));
  favoriteNames.forEach(({ id, name }) => {
    console.log(name, '(old ID', id + ')');
    let found = [];
    for (const [date, entries] of Object.entries(finalRestore.journalEntries)) {
      for (const entry of entries) {
        if (entry.name === name) {
          found.push({ date, appId: entry.appId, customFoodId: entry.customFoodId, name: entry.name });
          if (found.length >= 1) break;
        }
      }
      if (found.length >= 1) break;
    }
    if (found.length > 0) {
      const e = found[0];
      if (e.appId) {
        console.log('  → Migrated to: appId', e.appId);
        const inNewFavs = finalRestore.favorites.includes(e.appId);
        console.log('  → In new favorites?', inNewFavs ? 'YES ✅' : 'NO ❌');
      } else if (e.customFoodId) {
        console.log('  → Migrated to: customFoodId', e.customFoodId);
      } else {
        console.log('  → Migrated to: unmatched (calcium-only)');
      }
    } else {
      console.log('  → NOT FOUND in any journal entry');
    }
    console.log();
  });
});
