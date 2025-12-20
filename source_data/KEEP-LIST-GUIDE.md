# Keep List Guide for Food Curation Pipeline

**Updated:** 2025-12-20
**Purpose:** Preserve specific foods through the curation pipeline for user data continuity

---

## What Changed

### 1. Pipeline Modification (food-curator-nutrients.cjs)

**Before:**
- All foods went through abridgement process (cooking collapse, meat cuts, etc.)
- Keep list only protected foods in steps 3-5 (industrial preps, low-nutrient, category filtering)
- Cooking variants were collapsed to raw versions even if in keep list

**After (Option 3 Implementation):**
- Foods in keep list **completely bypass abridgement**
- Keep-listed foods are split out before `applyAbridge()` runs
- They skip ALL 5 abridgement steps:
  1. ✓ Cooking method collapse
  2. ✓ Meat cut simplification
  3. ✓ Industrial prep filtering
  4. ✓ Low-nutrient 100g-only filtering
  5. ✓ Category whitelist filtering
- Kept foods are combined back unchanged with abridged foods

**Code Location:** Lines 652-673 in `food-curator-nutrients.cjs`

### 2. Keep List Updates (keep-list.txt)

**Added 21 foods** for migration continuity:

| Category | Count | Examples |
|----------|-------|----------|
| Vegetables | 5 | Zucchini cooked, Broccoli cooked, Bok choy, Arugula baby, Spinach baby |
| Legumes/Beans | 3 | Edamame, Yardlong beans, Peas edible-podded |
| Fruits | 2 | Avocado Hass, Pineapple |
| Lettuce | 2 | Romaine, Green leaf |
| Proteins | 2 | Eggs Grade A, Shiitake mushrooms |
| Grains | 2 | Mashed potatoes dehydrated, Brown rice |
| Dairy/Fats | 2 | Butter salted, Parmesan cheese |
| Nuts/Seeds | 2 | Peanut butter, Flaxseed |

---

## How to Use

### Running the Pipeline with Keep List

```bash
cd source_data

# Standard run (with keep list)
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt

# Output will show:
# [PROCESS] Keep-listed foods: 27 (will bypass abridgement)
# [PROCESS] Protected foods:
#           - Cheese, swiss
#           - Milk, whole
#           - ... (all 27 foods listed)
```

### Adding New Foods to Keep List

1. Find the **exact USDA name** from source data
2. Add to `source_data/keep-list.txt` (one per line)
3. Re-run pipeline with `--keep-list keep-list.txt`

**Important:** Use exact names as they appear in USDA source, including:
- Salt descriptors (e.g., "with salt", "without salt")
- Cooking methods (e.g., "cooked, boiled, drained")
- Preparation details (e.g., "frozen, unprepared")
- Brand specifics if applicable

### Checking If a Food Will Be Kept

The keep list uses exact name matching (case-insensitive). Foods are normalized but the original full name must match.

**Examples:**
- ✓ "Butter, salted" in keep list → will be kept
- ✗ "Butter, unsalted" in keep list → won't match "Butter, salted"
- ✓ "Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt" → exact match required

---

## Pipeline Behavior

### With Keep List (Current)

```
3751 foods (mastered)
  ↓
[Collapse duplicates by nutrients]
  ↓
3200 foods
  ↓
[Brand filtering]
  ↓
2800 foods
  ↓
[Split: 27 kept + 2773 others]
  ↓
Keep-listed: 27 (unchanged) | Others: 2773 → [abridgement] → 1500
  ↓
[Combine: 27 + 1500 = 1527 final foods]
```

### Keep-Listed Foods Bypass:
- ✓ Cooking method collapse (raw/cooked)
- ✓ Meat cut simplification
- ✓ Industrial prep removal (frozen/canned)
- ✓ Low-nutrient filtering
- ✓ Category filtering (snacks/restaurant)

### They Still Go Through:
- ✓ Duplicate collapse by nutrients (Phase 1)
- ✓ Brand filtering
- ✓ Exclude list filtering

---

## Why This Matters for Migration

### Problem We Solved

User's historical journal entries reference foods like:
- "Zucchini, cooked, boiled"
- "Broccoli, frozen, cooked"
- "Eggs, Grade A, Large"

Without keep list, pipeline would:
1. Collapse "zucchini cooked" with "zucchini raw" → keep only raw
2. User's journal shows "zucchini cooked" → can't find in new database
3. Migration marks as "unmatched" → user frustrated

### Solution

Keep list preserves these **exact foods**:
- User's journal: "Zucchini, cooked, boiled" ✓ Found in database
- Migration: Exact match → seamless transition
- User experience: All historical foods searchable

---

## Testing the Changes

### 1. Verify Keep List Loading

```bash
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt 2>&1 | grep -A 30 "Keep-listed foods"
```

Should show all 27 foods listed.

### 2. Verify Foods in Output

```bash
# After pipeline runs, check abridged output
grep -i "zucchini.*cooked" curated-nutrients-abridged.json
grep -i "broccoli.*frozen.*cooked" curated-nutrients-abridged.json
grep -i "eggs.*grade a" curated-nutrients-abridged.json
```

All should have matches.

### 3. Compare Counts

```bash
# Count before/after
echo "Before keep list:"
grep -c '"name":' curated-nutrients-abridged-OLD.json

echo "After keep list:"
grep -c '"name":' curated-nutrients-abridged.json
```

Should see ~20-30 more foods in new version.

---

## Maintenance

### When to Add Foods to Keep List

1. **User migration**: Historical journal entries need specific foods
2. **Staple foods**: Essential items that shouldn't be filtered
3. **Specific variants**: When generic version isn't adequate (e.g., "Hass avocado" vs "all avocados")
4. **Cooked variants**: When nutrient values differ significantly from raw

### When NOT to Add

1. **Branded foods**: Unless absolutely essential
2. **Duplicate entries**: If generic version already exists
3. **Minimal usage**: Foods journaled only once or twice
4. **Available alternatives**: If similar food exists with close nutrient values

### Keep List Maintenance

**Review quarterly:**
- Remove foods no longer needed
- Add new foods from user feedback
- Verify names still match USDA source data

---

## Troubleshooting

### Food in Keep List But Not in Output

**Possible causes:**
1. Name doesn't exactly match USDA source
2. Food excluded by exclude list (takes precedence)
3. Food not in mastered input data (eliminated earlier in pipeline)

**Debug:**
```bash
# Check if food in mastered data
grep -i "your food name" mastered-nutrient-data.json

# Check normalization
node -e "
const normalizeName = (name) => {
  // ... copy normalizeName function from curator script
};
console.log(normalizeName('Your Food Name'));
"
```

### Too Many Foods in Database

If database becomes too large (>5MB), consider:
1. Removing less-common foods from keep list
2. Using exclude list for broad categories
3. Relying on food ID override mapping in migration instead

---

## Related Files

- `food-curator-nutrients.cjs` - Main curation script (modified)
- `keep-list.txt` - Foods to preserve (27 entries)
- `exclude-list.txt` - Foods to remove (separate mechanism)
- `migration/food-id-overrides.json` - Alternative: map old IDs to new IDs in migration

---

## Summary

**Option 3 Implementation** ensures foods in `keep-list.txt` are preserved **exactly as they appear in USDA data**, bypassing all abridgement steps. This solves the migration continuity problem where users' historical journal entries reference specific food variants (cooked/raw, specific brands, etc.) that would otherwise be eliminated by the curation process.

**Next Steps:**
1. Run pipeline with updated keep list
2. Generate new `foodDatabaseData.js`
3. Test migration with new database
4. Verify all 21 previously unmatched foods now appear in database
