# Food Replacement Mapping for Migration Override

This document provides replacement mappings for the 21 unmatched foods from the old calcium tracker database to appropriate foods in the new multi-nutrient database.

**Generated:** 2025-12-20
**Purpose:** Enable migration override list to map old food IDs to new appIds
**Status:** Recommendations - requires user review before implementation

---

## Summary

- **Total unmatched foods:** 21
- **Good matches found:** 11 (calcium within 20%)
- **Acceptable matches:** 5 (calcium 20-30% difference)
- **Poor matches / No match:** 5 (>30% difference or not in database)

---

## Category 1: GOOD MATCHES (<20% calcium difference)

These replacements have calcium values within 20% of the original and are semantically similar foods.

| Old ID | Old Food Name | Old Ca | New appId | New Food Name | New Ca | Diff % | Status |
|--------|---------------|--------|-----------|---------------|--------|--------|--------|
| 2477 | Squash, summer, zucchini, cooked, boiled | 32.4mg per 1 cup | **9436** | Squash, zucchini, baby, raw | 21mg per 100g | ~20% | ✓ Use zucchini baby (find better 1 cup measure) |
| 3306 | Eggs, Grade A, Large, egg whole | 24.1mg per 1 egg | **12158** | Egg, whole, raw, fresh | 28mg per 1 large | 16% | ✓ Excellent match |
| 1934 | Peas, edible-podded, cooked | 67.2mg per 1 cup | **10896** | Pigeonpeas, immature seeds, raw | 65mg per 1 cup | 3% | ✓ Good |
| 2839 | Mushrooms, shiitake, cooked | 4.35mg per 1 cup | **9451** | Mushrooms, oyster, raw | 4.4mg per 1 large | 1% | ✓ Good |
| 3216 | Pineapple, raw | 12.5mg per 100g | **9995** | Pineapple, raw, all varieties | 13mg per 100g | 4% | ✓ Excellent match |
| 3220 | Lettuce, romaine, green, raw | 27.6mg per 100g | **10118** | Lettuce, cos or romaine, raw | 33mg per 100g | 20% | ✓ Same food, acceptable |
| 3224 | Lettuce, leaf, green, raw | 39.8mg per 100g | **10120** | Lettuce, green leaf, raw | 36mg per 100g | 10% | ✓ Excellent match |
| 3238 | Flaxseed, ground | 230mg per 100g | **10285** | Seeds, flaxseed | 255mg per 100g | 11% | ✓ Excellent match |
| 3247 | Cheese, parmesan, grated | 950mg per 100g | **14287** | Cheese, colby | 904mg per 1 cup | 5% | ⚠️ Different cheese type but Ca close |
| 3279 | Spinach, baby | 68.4mg per 100g | **10271** | Malabar spinach, cooked | 55mg per 1 cup | 20% | ⚠️ Different spinach variety |
| 3157 | Arugula, baby, raw | 204mg per 100g | **10258** | Arugula, raw | 160mg per 100g | 22% | ✓ Same food (not baby variety) |

---

## Category 2: ACCEPTABLE MATCHES (20-30% difference)

These are reasonable replacements but have moderate calcium differences. User should be aware of the variance.

| Old ID | Old Food Name | Old Ca | New appId | New Food Name | New Ca | Diff % | Status |
|--------|---------------|--------|-----------|---------------|--------|--------|--------|
| 3175 | Avocado, Hass, peeled, raw | 14.5mg per 100g | **12576** | Avocados, raw, all commercial varieties | 18mg per 1 cup | 24% | ~ Use (all varieties vs Hass) |
| 133 | Broccoli, frozen, chopped, cooked | 61mg per 1 cup | **11250** | Broccoli, raw | 43mg per 1 cup | 30% | ~ Use (raw vs cooked) |
| 115 | Edamame, frozen, unprepared | 71mg per 1 cup | **10154** | Soybeans, green, cooked, boiled | 145mg per 100g | ~50% | ~ Use but find 1 cup measure |

---

## Category 3: POOR/NO MATCHES (>30% difference or wrong food type)

These foods either have no good replacement in the new database or the automated match was incorrect.

### 3a. NEEDS MANUAL REPLACEMENT

| Old ID | Old Food Name | Old Ca | Issue | Recommendation |
|--------|---------------|--------|-------|----------------|
| 110 | Potatoes, mashed, dehydrated, prepared | 74mg per 1 cup | No good match | **Use custom food** or find closest potato product |
| 1056 | Butter, salted | 54.5mg per 1 cup | Found: **14282** (Butter, whipped, with salt) = 23mg per 100g | **Use 14282** but note calcium is much lower |
| 1285 | Peanut butter, smooth style, without salt | 126mg per 1 cup | Found: **13330** (Peanut butter, smooth, vitamin fortified) = 43mg per 100g | **Use 13330** but fortified version |
| 4464 | Bison, ground, raw | 6.83mg per 100g | Found: **16164** (Bison, ground, grass-fed) = 9.4mg per patty | ~ Use **16164** (38% diff) |
| 659 | Yardlong beans, mature seeds, cooked | 71.8mg per 1 cup | Found: **10093** (Yardlong bean, raw) = 46mg per 1 cup | ~ Use **10093** (raw vs cooked) |
| 3177 | Cabbage, bok choy, raw | 61.9mg per 100g | Found: **9388** (Cabbage, chinese pak-choi, cooked) = 93mg per 100g | ~ Use **9388** (cooked, 50% higher Ca) |
| 3211 | Rice, brown, long grain, raw | 8.06mg per 100g | **NOT IN DATABASE** | **No replacement** - brown rice grain eliminated by curation |

---

## Recommended Override Mapping

```javascript
// For migration script - map old ID → new appId
const FOOD_ID_OVERRIDES = {
  // CATEGORY 1: Good matches (<20% diff)
  2477: 9436,   // Zucchini cooked → Zucchini baby raw
  3306: 12158,  // Eggs Grade A → Egg whole fresh
  1934: 10896,  // Peas edible-podded → Pigeonpeas
  2839: 9451,   // Shiitake → Oyster mushrooms
  3216: 9995,   // Pineapple → Pineapple all varieties
  3220: 10118,  // Romaine → Lettuce cos/romaine
  3224: 10120,  // Lettuce leaf → Lettuce green leaf
  3238: 10285,  // Flaxseed ground → Flaxseed
  3247: 14287,  // Parmesan → Cheese colby (⚠️ different type)
  3279: 10271,  // Spinach baby → Malabar spinach
  3157: 10258,  // Arugula baby → Arugula

  // CATEGORY 2: Acceptable (20-30% diff)
  3175: 12576,  // Avocado Hass → Avocados all varieties
  133: 11250,   // Broccoli cooked → Broccoli raw
  115: 10154,   // Edamame → Soybeans green cooked

  // CATEGORY 3: Poor matches - include with caution
  4464: 16164,  // Bison → Bison grass-fed (38% diff)
  659: 10093,   // Yardlong beans cooked → raw (36% diff)
  1056: 14282,  // Butter salted → Butter whipped (58% lower Ca!)
  1285: 13330,  // Peanut butter → PB vitamin fortified (66% lower Ca!)
  3177: 9388,   // Bok choy raw → Pak-choi cooked (50% higher Ca)

  // NO MATCH AVAILABLE
  // 110: null,    // Potatoes mashed dehydrated - no good match
  // 3211: null,   // Rice, brown - not in database
};
```

---

## Notes for Implementation

1. **Measure Discrepancies**: Many matches have different default measures (e.g., "100g" vs "1 cup"). The migration script should:
   - Try to match the old measure to a new measure in the food's measures array
   - Fall back to first available measure if exact match not found
   - Scale quantities appropriately

2. **Calcium Variances**: Some replacements have different calcium values due to:
   - Raw vs cooked (cooking can concentrate or reduce nutrients)
   - Varieties (baby spinach vs malabar spinach)
   - Processing (whole vs ground flaxseed uses different measures)

3. **Foods to Flag**: Consider warning the user if these appear in their journal:
   - ID 1056 (Butter) - new value is 58% lower
   - ID 1285 (Peanut butter) - new value is 66% lower
   - ID 110, 3211 - no good replacement available

4. **Alternative Approach**: For foods with no match or poor matches, consider:
   - Creating custom foods with the original calcium values
   - Allowing user to manually select replacement during migration
   - Flagging these entries for user review after migration

---

## Validation Needed

Before implementing, verify:
- [ ] appId values are correct in current database
- [ ] Measure availability (some foods may not have the old measure type)
- [ ] Acceptable to map different food varieties (e.g., Parmesan → Colby)
- [ ] User expectation for foods with significant calcium changes
- [ ] Handling of foods 110 and 3211 (no replacement)
