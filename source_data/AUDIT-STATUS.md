# Data Pipeline Audit Status

**Last Updated:** 2026-01-01
**Branch:** `claude/rebuild-data-pipeline-dKBip`

---

## Current Audit Results

| Metric | Value |
|--------|-------|
| Total Foods Sampled | 1,000 |
| Pass | 981 (98.1%) |
| Fail | 19 (1.9%) |
| Issue Type | `app_100g_mismatch` |

---

## Fixes Applied This Session

### 1. Audit Tool Fixes

| Fix | Description | Commit |
|-----|-------------|--------|
| Omega-3 Nutrient IDs | Changed from 619/620/621/629 to 851/629/621/675 to match `usda-fdc-json-config.json` | `2aeec43` |
| Folate Nutrient ID | Changed from 417 to 435 (DFE form) | `2aeec43` |
| Rounding Logic | Added `NUTRIENT_PRECISION` and `roundNutrientValue()` matching generator | `2aeec43` |
| Prov-to-FDC Comparison | Disabled rounding (both have original values) | `f9534cb` |

### 2. Pipeline Fix (Option 1)

| Fix | Description | Commit |
|-----|-------------|--------|
| Density Revert Source ID | When density revert occurs, now uses SR Legacy FDC ID (not just nutrients) | `8849caf` |

**What this means:** When the hybrid pipeline detects a density mismatch between Foundation Foods and SR Legacy (suggesting unreliable match), it now:
- Uses SR Legacy FDC ID (`candidate.refFDC`)
- Uses SR Legacy nutrients (`candidate.fallbackNutrients`)
- Preserves original FF ID in `originalFoundationFDC` for reference

---

## Remaining Issue: `app_100g_mismatch`

### Problem Description

19 foods (1.9%) still show mismatches between app database nutrients and provenance nutrients.

### Root Cause Analysis

The provenance generator (`provenance-generator.cjs`) looks up `food.sourceId` in the **master file** and records the master record's nutrients. However, the app database uses the **curated file's** nutrients (which may differ due to hybrid source selection).

**Data Flow:**
```
App Database: Uses curated nutrients (from serving-deriver output)
Provenance:   Looks up sourceId in master file → gets MASTER nutrients
FDC Portal:   Shows original USDA values for that FDC ID
```

When hybrid selection chooses Foundation Foods nutrients but provenance looks up from master (which may have slightly different values or be from a different analytical batch), mismatches occur.

### Failing Foods (19)

| ID | Food Name | Key Discrepancies |
|----|-----------|-------------------|
| 10166 | Squash, winter, butternut, raw | calcium (48 vs 21.7), vitaminC (21 vs 7.6) |
| 10120 | Lettuce, green leaf, raw | potassium (194 vs 277), iron (0.86 vs 0.32) |
| 12155 | Yogurt, plain, whole milk | vitaminD (0.1 vs 0.778), fat (3.3 vs 4.48) |
| 15471 | Sausage, turkey, breakfast links | carbohydrates (3.2 vs 0.93), calcium (55 vs 32) |
| 13721 | Turkey, ground, 93% lean, raw | protein (18.7 vs 17.3), fat (8.3 vs 9.59) |
| 10099 | Eggplant, raw | vitaminC (2.2 vs 0.8), fiber (3.0 vs 2.45) |
| 11055 | Nuts, pistachio nuts, raw | fiber (10.6 vs 6.97), iron (3.9 vs 3.46) |
| 15146 | Soy flour, defatted | calcium (241 vs 338), zinc (2.5 vs 4.44) |
| 9769 | Rice flour, brown | vitaminB6 (0.7 vs 0.132), zinc (2.5 vs 1.91) |
| 9963 | Melons, cantaloupe, raw | vitaminC (36.7 vs 10.9), potassium (267 vs 157) |
| 10597 | Wild rice, raw | magnesium (177 vs 108), calcium (21 vs 7.97) |
| 14817 | Blackberries, raw | zinc (0.53 vs 0.189), iron (0.62 vs 0.208) |
| 12175 | Yogurt, Greek, plain, whole milk | monounsaturatedFat (2.1 vs 0.958) |
| 9807 | Wheat flour, white, all-purpose | protein (10.3 vs 13.1), magnesium (22 vs 33.3) |
| 10785 | Nectarines, raw | potassium (201 vs 131), calcium (6 vs 2) |
| 10585 | Rice flour, white, unenriched | vitaminB6 (0.4 vs 0.052), fiber (2.4 vs 0.5) |
| 8773 | Pork, fresh, ground, raw | fat (21.2 vs 17.5), calcium (14 vs 5.86) |
| 13722 | Turkey, ground, pan-broiled | monounsaturatedFat (3.9 vs 3.78) |
| 14907 | Beef, ground, 80% lean, raw | calcium (18 vs 6.89), saturatedFat (7.6 vs 6.84) |

---

## Potential Fix Options

### Option A: Use Curated Nutrients in Provenance

Modify `provenance-generator.cjs` to use `food.nutrientsPer100g` directly instead of looking up in master file.

**Pros:**
- App ↔ Provenance always match
- Simple fix

**Cons:**
- Provenance becomes "what app uses" not "what source says"
- FDC portal link may show different values than provenance

### Option B: Ensure Pipeline Uses Consistent Source

Debug why the curated nutrients differ from master nutrients for these specific foods. Possible causes:
1. Hybrid matching using different FF record than provenance lookup
2. Master file has different version of data than what pipeline uses
3. Nutrient processing/rounding differences

**Pros:**
- Maintains data integrity (link → source → app all match)
- Addresses root cause

**Cons:**
- Requires deeper investigation
- May be complex if multiple causes

### Option C: Accept ~2% Variance

Document that ~2% of foods have minor discrepancies due to hybrid data source selection.

**Pros:**
- No code changes needed
- 98% accuracy is acceptable for many use cases

**Cons:**
- User clicking FDC link may see different values
- Defensibility concern

---

## Recommendation

Before choosing a fix, investigate one failing food end-to-end:

1. Check its provenance FDC ID
2. Look up that ID in both Foundation Foods and SR Legacy source files
3. Compare those nutrients to what's in the app database
4. Determine if the mismatch is due to:
   - Different FDC records being used
   - Same record but different processing
   - Master file vs source file differences

---

## Session Timeline

| Time | Action |
|------|--------|
| Start | Continued from previous session on hybrid pipeline implementation |
| | Created `run-pipeline.sh` orchestration script |
| | Fixed phase 3 producing 0 records (missing sourceType fields) |
| | Fixed only 1 food output (appId being set to null) |
| | Added provenance generation as stage 9 |
| | Created `data-audit.cjs` comprehensive validator |
| | Fixed audit nutrient IDs (omega-3, folate) |
| | Added rounding logic to audit tool |
| | Disabled rounding for prov-to-FDC comparison |
| | Implemented Option 1: Use SR Legacy source ID on density revert |
| Current | 98.1% pass rate, 19 foods with `app_100g_mismatch` |

---

## Files Modified

- `source_data/serving-deriver.cjs` - Density revert fix
- `source_data/data-audit.cjs` - Nutrient ID fixes, rounding logic
- `source_data/run-pipeline.sh` - Pipeline orchestration
- `source_data/master-key-assigner-json.cjs` - Preserve hybrid pipeline fields
- `source_data/candidate-generator.cjs` - Preserve appId

---

## Next Steps

1. User to test pipeline locally and re-run audit
2. If acceptable, proceed with PR and merge
3. User has separate branch for data migration work
4. Goal: Merge both branches by end of day
5. Final review of complete data solution in merged state
