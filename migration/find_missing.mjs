// Search for the foods that returned 0 candidates
const newDBModule = await import('../src/lib/data/foodDatabase.js');
const newDB = await newDBModule.getFoodDatabase();

const searches = [
  { name: 'Butter, salted', patterns: ['butter'], exclude: ['peanut', 'apple', 'almond', 'nut'], oldCa: 54.5 },
  { name: 'Cabbage, bok choy', patterns: ['cabbage'], exclude: ['kimchi'], oldCa: 61.9 },
  { name: 'Rice, brown', patterns: ['rice'], exclude: ['noodle', 'flour', 'bran', 'cake'], oldCa: 8.06 },
];

console.log('=== TARGETED SEARCH ===\n');

for (const search of searches) {
  console.log(`\n${search.name} (old calcium: ${search.oldCa}mg per 100g)`);

  let candidates = [];

  for (const pattern of search.patterns) {
    const matches = newDB.filter(f => {
      const name = f.name?.toLowerCase() || '';
      if (!name.includes(pattern.toLowerCase())) return false;

      // Exclude unwanted terms
      for (const excl of search.exclude) {
        if (name.includes(excl.toLowerCase())) return false;
      }

      return true;
    });
    candidates.push(...matches);
  }

  // Deduplicate
  const uniqueCandidates = Array.from(
    new Map(candidates.map(f => [f.id, f])).values()
  );

  console.log(`  Found ${uniqueCandidates.length} candidates (showing top 10):`);

  uniqueCandidates
    .slice(0, 10)
    .forEach(candidate => {
      if (!candidate.measures || candidate.measures.length === 0) return;

      // Prefer 100g measure if available
      const measure100g = candidate.measures.find(m => m.measure.includes('100 g'));
      const firstMeasure = measure100g || candidate.measures[0];

      const ca = firstMeasure.nutrients?.calcium || 0;
      const diff = Math.abs(ca - search.oldCa);
      const pct = ((diff / search.oldCa) * 100).toFixed(0);

      console.log(`    ${candidate.id}: ${candidate.name.substring(0, 60)}`);
      console.log(`         ${ca}mg per ${firstMeasure.measure} (diff: ${diff.toFixed(1)}mg, ${pct}%)`);
    });
}
