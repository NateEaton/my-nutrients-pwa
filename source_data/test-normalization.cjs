// Debug script to test keep list normalization

const fs = require('fs');

// Copy of normalizeName from curator script
function normalizeName(originalName) {
  if (!originalName) return "";
  let norm = originalName.toLowerCase();

  // Stage 1: Handle alcoholic beverages
  norm = norm.replace(/\b(gin|rum|vodka|whiskey|liqueur)\b/g, "distilled spirit");
  norm = norm.replace(/,?\s*all \(distilled spirit, distilled spirit, distilled spirit, distilled spirit\)/g, "");
  norm = norm.replace(/,?\s*distilled, all/g, ", distilled");
  norm = norm.replace(/alcoholic beverage, distilled, distilled spirit/g, "alcoholic beverage, distilled spirit");
  norm = norm.replace(/alcoholic beverage, distilled$/g, "alcoholic beverage, distilled spirit");

  // Stage 2: Remove parenthetical and bracketed content
  norm = norm.replace(/\s*\[[^\]]*\]/g, "");
  norm = norm.replace(/\s*\([^)]*\)/g, "");

  // Stage 3: Other broad replacements
  norm = norm.replace(/beer, (light|regular|higher alcohol|low carb|non-alcoholic)/g, "beer");

  // Stage 4: Remove nutritional/preparation details
  norm = norm.replace(/\b(\d+(\.\d+)?\s*proof)\b/g, "");
  norm = norm.replace(/,?\s*(all commercial varieties|all types|mixed species|all areas|includes crisphead types|regular pack|includes from concentrate)/g, "");
  norm = norm.replace(/,?\s*(with added vitamin a and vitamin d|vitamin d fortified|with added ca|with added calcium|calcium-fortified|protein fortified)/g, "");
  norm = norm.replace(/,?\s*(solids and liquids|drained solids|with bone|without bone)/g, "");
  norm = norm.replace(/,?\s*(with salt|without salt|salted|unsalted|low sodium|reduced sodium|no salt added)/gi, "");
  norm = norm.replace(/\b(enriched|unenriched|fortified|sweetened|unsweetened|ready-to-drink|from concentrate|chilled)\b/gi, "");
  norm = norm.replace(/\b(canned|frozen|raw|unprepared|prepared|cooked|boiled|steamed|baked|roasted|drained|fried)\b/gi, "");
  norm = norm.replace(/\b(low moisture|commercial)\b/gi, "");

  // Stage 5: Final cleanup
  norm = norm
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .replace(/,\s*$/g, "")
    .replace(/^\s*,/g, "")
    .replace(/\s\s+/g, " ")
    .trim();

  return norm;
}

// Test the problematic foods
const testFoods = [
  "Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt",
  "Eggs, Grade A, Large, egg whole",
  "Broccoli, frozen, chopped, cooked, boiled, drained, without salt",
  "Butter, salted",
  "Peanut butter, smooth style, without salt"
];

console.log('=== TESTING NORMALIZATION ===\n');
testFoods.forEach(name => {
  const normalized = normalizeName(name);
  console.log('Original:  ', name);
  console.log('Normalized:', normalized);
  console.log();
});

// Load and check keep list
console.log('=== KEEP LIST CONTENTS ===\n');
const keepList = fs.readFileSync('keep-list.txt', 'utf-8')
  .split(/\r?\n/)
  .filter(l => l.trim() && !l.trim().startsWith('#'));

console.log('Raw entries:', keepList.length);
keepList.forEach((entry, i) => {
  const normalized = normalizeName(entry);
  console.log(`${i + 1}. "${entry}"`);
  console.log(`   → "${normalized}"`);
});
