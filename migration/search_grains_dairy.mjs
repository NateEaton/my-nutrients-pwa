const newDBModule = await import('../src/lib/data/foodDatabase.js');
const db = await newDBModule.getFoodDatabase();

console.log('=== BUTTER (ACTUAL DAIRY BUTTER) ===');
const butter = db.filter(f => {
  const n = f.name.toLowerCase();
  return n.includes('butter') && !n.includes('peanut') && !n.includes('nut') && !n.includes('apple') && !n.includes('seed') && !n.includes('almond') && (n.includes('salted') || n.includes('with salt') || n.startsWith('butter,'));
});
butter.forEach(f => {
  const m = f.measures.find(m => m.measure.includes('100 g')) || f.measures[0];
  console.log(`${f.id}: ${f.name.substring(0, 65)} - ${m.nutrients?.calcium}mg per ${m.measure}`);
});

console.log('\n=== RICE, BROWN (GRAIN, NOT SNACKS) ===');
const rice = db.filter(f => {
  const n = f.name.toLowerCase();
  return n.startsWith('rice,') && n.includes('brown') && !n.includes('cake') && !n.includes('flour') && !n.includes('bran') && !n.includes('noodle');
});
rice.forEach(f => {
  const m = f.measures.find(m => m.measure.includes('100 g')) || f.measures[0];
  console.log(`${f.id}: ${f.name.substring(0, 65)} - ${m.nutrients?.calcium}mg per ${m.measure}`);
});

console.log('\n=== EDAMAME / SOYBEANS GREEN ===');
const edamame = db.filter(f => {
  const n = f.name.toLowerCase();
  return (n.includes('edamame') || (n.includes('soybean') && n.includes('green')));
});
edamame.forEach(f => {
  const m = f.measures.find(m => m.measure.includes('100 g')) || f.measures[0];
  console.log(`${f.id}: ${f.name.substring(0, 65)} - ${m.nutrients?.calcium}mg per ${m.measure}`);
});

console.log('\n=== PEANUT BUTTER (ACTUAL) ===');
const pb = db.filter(f => {
  const n = f.name.toLowerCase();
  return n.includes('peanut') && n.includes('butter') && !n.includes('candy') && !n.includes('candies') && !n.includes('granola') && !n.includes('fudge') && !n.includes('cookie');
});
pb.slice(0, 8).forEach(f => {
  const m = f.measures.find(m => m.measure.includes('100 g')) || f.measures[0];
  console.log(`${f.id}: ${f.name.substring(0, 65)} - ${m.nutrients?.calcium}mg per ${m.measure}`);
});
