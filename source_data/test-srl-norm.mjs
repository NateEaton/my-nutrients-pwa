import fs from 'fs';

function normalizeName(originalName) {
  if (!originalName) return "";
  let norm = originalName.toLowerCase();

  norm = norm.replace(/\b(gin|rum|vodka|whiskey|liqueur)\b/g, "distilled spirit");
  norm = norm.replace(/,?\s*all \(distilled spirit, distilled spirit, distilled spirit, distilled spirit\)/g, "");
  norm = norm.replace(/,?\s*distilled, all/g, ", distilled");
  norm = norm.replace(/alcoholic beverage, distilled, distilled spirit/g, "alcoholic beverage, distilled spirit");
  norm = norm.replace(/alcoholic beverage, distilled$/g, "alcoholic beverage, distilled spirit");
  norm = norm.replace(/\s*\[[^\]]*\]/g, "");
  norm = norm.replace(/\s*\([^)]*\)/g, "");
  norm = norm.replace(/beer, (light|regular|higher alcohol|low carb|non-alcoholic)/g, "beer");
  norm = norm.replace(/\b(\d+(\.\d+)?\s*proof)\b/g, "");
  norm = norm.replace(/,?\s*(all commercial varieties|all types|mixed species|all areas|includes crisphead types|regular pack|includes from concentrate)/g, "");
  norm = norm.replace(/,?\s*(with added vitamin a and vitamin d|vitamin d fortified|with added ca|with added calcium|calcium-fortified|protein fortified)/g, "");
  norm = norm.replace(/,?\s*(solids and liquids|drained solids|with bone|without bone)/g, "");
  norm = norm.replace(/,?\s*(with salt|without salt|salted|unsalted|low sodium|reduced sodium|no salt added)/gi, "");
  norm = norm.replace(/\b(enriched|unenriched|fortified|sweetened|unsweetened|ready-to-drink|from concentrate|chilled)\b/gi, "");
  norm = norm.replace(/\b(canned|frozen|raw|unprepared|prepared|cooked|boiled|steamed|baked|roasted|drained|fried)\b/gi, "");
  norm = norm.replace(/\b(low moisture|commercial)\b/gi, "");

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

const srlName = "Apples, raw, fuji, with skin (Includes foods for USDA's Food Distribution Program)";
const keepListEntry = "Apples, fuji, with skin, raw";

console.log("SRL name:          ", srlName);
console.log("SRL normalized:    ", normalizeName(srlName));
console.log("");
console.log("Keep-list entry:   ", keepListEntry);
console.log("Keep-list normalized:", normalizeName(keepListEntry));
console.log("");
console.log("Match:", normalizeName(srlName) === normalizeName(keepListEntry));
