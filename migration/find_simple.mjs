import fs from 'fs';
import('./prod-foodDatabaseData.js').then(oldModule => {
  const oldDB = oldModule.DEFAULT_FOOD_DATABASE;
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
  console.log('OLD ID | OLDNAME | OLD CA | SEARCH');
  console.log('-------|---------|--------|-------');
  for (const food of unmatched) {
    const oldFood = oldDB.find(f => f.id === food.id);
    console.log(food.id + ' | ' + food.name.substring(0,40) + ' | ' + oldFood.calcium + 'mg | "' + food.search + '"');
  }
});
