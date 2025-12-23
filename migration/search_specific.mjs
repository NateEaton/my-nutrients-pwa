const newDBModule = await import('../src/lib/data/foodDatabase.js');
const db = await newDBModule.getFoodDatabase();

console.log('=== BUTTER SEARCH ===');
const butter = db.filter(f => {
  const n = f.name.toLowerCase();
  return n.startsWith('butter,') && !n.includes('peanut') && !n.includes('nut');
});
butter.slice(0, 8).forEach(f => {
  const m = f.measures.find(m => m.measure.includes('100 g')) || f.measures[0];
  console.log(`${f.id}: ${f.name.substring(0, 60)} - ${m.nutrients?.calcium}mg per ${m.measure}`);
});

console.log('\n=== BROWN RICE SEARCH ===');
const rice = db.filter(f => {
  const n = f.name.toLowerCase();
  return n.includes('rice') && n.includes('brown') && !n.includes('noodle') && !n.includes('flour') && !n.includes('bran') && !n.includes('syrup') && !n.includes('cereal') && !n.includes('bar');
});
rice.slice(0, 10).forEach(f => {
  const m = f.measures.find(m => m.measure.includes('100 g')) || f.measures[0];
  console.log(`${f.id}: ${f.name.substring(0, 60)} - ${m.nutrients?.calcium}mg per ${m.measure}`);
});

console.log('\n=== BOK CHOY / PAK CHOI SEARCH ===');
const bokchoy = db.filter(f => {
  const n = f.name.toLowerCase();
  return (n.includes('bok') || n.includes('pak') || n.includes('chinese cabbage')) && !n.includes('kimchi');
});
bokchoy.forEach(f => {
  const m = f.measures.find(m => m.measure.includes('100 g')) || f.measures[0];
  console.log(`${f.id}: ${f.name.substring(0, 60)} - ${m.nutrients?.calcium}mg per ${m.measure}`);
});
