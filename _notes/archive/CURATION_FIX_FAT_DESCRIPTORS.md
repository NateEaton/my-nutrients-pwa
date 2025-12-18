# Curation Fix: Preserve Nutritionally Significant Fat Descriptors

**Date**: December 12, 2025
**Issue**: Normalization logic was collapsing nutritionally distinct foods
**File Modified**: `source_data/food-curator-nutrients.cjs`

---

## Problem

The original normalization function (line 93) removed ALL fat content descriptors:

```javascript
norm = norm.replace(/\b(low fat|reduced fat|fat free|nonfat|part-skim|whole milk|low moisture|lean only|lean and fat|commercial)\b/gi, "");
```

This caused foods with very different nutritional profiles to be collapsed together:
- "Milk, whole, 3.25% milkfat" (149 cal, 7.9g fat per cup)
- "Milk, reduced fat, 2%" (122 cal, 4.8g fat per cup)
- "Milk, nonfat" (83 cal, 0.2g fat per cup)

These are **nutritionally distinct** and should NOT be normalized into a single entry.

---

## Solution

Modified line 93-95 to ONLY remove non-nutritional descriptors:

```javascript
// NOTE: Preserve nutritionally significant fat descriptors (whole milk, low fat, nonfat, lean only, etc.)
// Only remove non-nutritional descriptors
norm = norm.replace(/\b(low moisture|commercial)\b/gi, "");
```

**Now Preserved** (nutritionally significant):
- `whole milk` - full fat dairy
- `low fat` - reduced fat content
- `reduced fat` - reduced fat content (often 2%)
- `fat free` - no fat
- `nonfat` - no fat
- `part-skim` - partially skimmed (for cheese)
- `lean only` - lean cuts of meat (no visible fat)
- `lean and fat` - meat with fat included

**Still Removed** (not nutritionally significant):
- `commercial` - just a source descriptor
- `low moisture` - texture/processing detail, minimal nutritional impact

---

## Expected Impact

After regenerating the database:
- **More food entries**: Distinct fat variants will no longer collapse
- **Better accuracy**: Users can select the exact fat content they consumed
- **Example**: Searching "milk" will show:
  - Milk, whole, 3.25% milkfat
  - Milk, reduced fat, 2%
  - Milk, lowfat, 1%
  - Milk, nonfat (skim)

Instead of one collapsed "Milk" entry.

---

## Database Regeneration Required

To apply this fix, regenerate the database:

```bash
cd source_data

# Step 1: Re-curate with updated normalization logic
node food-curator-nutrients.cjs mastered-nutrient-data.json curated-nutrients-abridged.json

# Step 2: Regenerate final database module
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal

# Step 3: Verify output
ls -lh ../src/lib/data/foodDatabaseData.js
```

**Expected Results**:
- Food count will increase (less collapsing)
- Distinct fat variants will be searchable
- Nutritional accuracy improved

---

## Git Commit

```bash
git add source_data/food-curator-nutrients.cjs _notes/CURATION_FIX_FAT_DESCRIPTORS.md
git commit -m "fix: Preserve nutritionally significant fat descriptors in curation

- Modified normalization to keep whole milk, low fat, nonfat, lean only, etc.
- Only remove non-nutritional terms (commercial, low moisture)
- Prevents collapsing of nutritionally distinct food variants
- Requires database regeneration to take effect"
```

---

## Related Files

- `source_data/food-curator-nutrients.cjs` - Curation script (modified)
- `_notes/DATABASE_COMPARISON.md` - Original database analysis
- `_notes/DATA_PIPELINE.md` - Pipeline documentation

---

## Testing

After regeneration, verify:
1. Search for "whole milk" - should find specific entries
2. Search for "2% milk" - should find reduced fat variants
3. Search for "nonfat milk" - should find fat-free variants
4. Check that collapsed entries still work (e.g., alcoholic beverages)
5. Verify total food count increased by 50-100 foods
