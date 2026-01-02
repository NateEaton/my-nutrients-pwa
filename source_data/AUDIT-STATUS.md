# Data Pipeline Audit Status

**Last Updated:** 2026-01-01 (Bison case study added)
**Branch:** `claude/rebuild-data-pipeline-dKBip`
**Status:** Ready for PR/merge, with known ~2% variance pending pipeline re-run

---

## Executive Summary

This session implemented a comprehensive data audit system and fixed several pipeline issues. The hybrid data pipeline now produces **98.1% verifiable data** (981/1000 foods pass audit). The remaining 1.9% (19 foods) have `app_100g_mismatch` issues where app nutrients differ from provenance - a known limitation of the hybrid approach that requires further investigation.

**Key Achievement:** When users click an FDC link in provenance, the values they see on the USDA portal should match the app data for 98% of foods.

---

## Hybrid Pipeline Overview

The pipeline implements a "Hybrid Data Strategy":
- **Foundation Foods (FF):** Higher quality, more recent analytical data (~450 foods)
- **SR Legacy (SRL):** More comprehensive serving measures (cups, tablespoons, etc.) (~7000+ foods)

**Goal:** Use FF nutrients when available, with SRL serving measures.

### Pipeline Stages

```
Stage 1: json-data-processor.cjs      → combined-nutrient-data.json
Stage 2: master-key-assigner-json.cjs → mastered-nutrient-data.json
Stage 3: candidate-generator.cjs      → candidates.json (matches FF↔SRL)
Stage 4: serving-deriver.cjs          → derived-foods.json
Stage 5: food-curator-nutrients.cjs   → curated-nutrients-abridged.json
Stage 6: data-module-generator.cjs    → foodDatabaseData.js
Stage 7: diff-validator.cjs           → (validation)
Stage 8: (reserved)
Stage 9: provenance-generator.cjs     → provenance_*.json chunks
```

Run with: `./run-pipeline.sh [--from-stage N] [--non-interactive]`

---

## Current Audit Results

| Metric | Value |
|--------|-------|
| Total Foods Sampled | 1,000 |
| **Pass** | **981 (98.1%)** |
| Fail | 19 (1.9%) |
| Issue Type | `app_100g_mismatch` |

### Running the Audit

```bash
cd source_data

# Full audit (all ~4000 foods)
node data-audit.cjs

# Sample audit (faster)
node data-audit.cjs --sample 100

# With FDC source files for prov→FDC validation
node data-audit.cjs \
  --foundation FoodData_Central_foundation_food_json_2025-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json
```

**Output:** `audit_report.txt` (human-readable) and `audit_report.json` (detailed)

---

## Fixes Applied This Session

### 1. Audit Tool Creation & Fixes

| Fix | Description | Commit |
|-----|-------------|--------|
| Created audit tool | `data-audit.cjs` - comprehensive validator | `22bc10b` |
| Omega-3 Nutrient IDs | Changed 619/620/629→851/629/621 to match config | `2aeec43` |
| Omega-6 Nutrient ID | Changed 618→675 to match config | `2aeec43` |
| Folate Nutrient ID | Changed 417→435 (DFE form) | `2aeec43` |
| Rounding Logic | Added `NUTRIENT_PRECISION` matching generator | `2aeec43` |
| Prov-to-FDC Comparison | Disabled rounding (both have original values) | `f9534cb` |

### 2. Pipeline Fixes

| Fix | Description | Commit |
|-----|-------------|--------|
| Missing fields | `master-key-assigner-json.cjs` now preserves `sourceType`, `prepState`, `foodCategory`, `waterContent` | (earlier) |
| Null appId | `candidate-generator.cjs` now preserves appId instead of setting null | `4507c39` |
| Provenance path | Fixed output directory to `static/data/provenance` | `f86f1f7` |
| Density revert | **Option 1 implemented** - uses SRL FDC ID when density revert occurs | `8849caf` |

### 3. Density Revert Fix (Option 1) - Key Decision

**Problem:** When density mismatch detected between FF and SRL (suggesting unreliable match), pipeline reverted to SRL nutrients but kept FF FDC ID. This meant:
- User clicks provenance link → sees FF values on USDA portal
- App shows SRL values → **MISMATCH**

**Solution:** When density revert occurs, now use SRL for EVERYTHING:
- `primaryFDC` = `candidate.refFDC` (SRL FDC ID)
- `primaryNutrients` = `candidate.fallbackNutrients` (SRL nutrients)
- `primarySource` = `'SR Legacy'`
- `originalFoundationFDC` preserved for reference

**Rationale:** Data integrity > data quality. Better to show verifiable SRL data than unverifiable FF data.

---

## Remaining Issue: `app_100g_mismatch`

### Problem Description

19 foods (1.9%) show mismatches between app database nutrients and provenance nutrients.

### Root Cause

The provenance generator looks up `food.sourceId` in the **master file** and records those nutrients. But the app database uses **curated file** nutrients. For hybrid-matched foods, these can differ.

```
┌─────────────────────────────────────────────────────────┐
│ App Database    → curated nutrients (post-pipeline)    │
│ Provenance      → master lookup nutrients (pre-hybrid) │
│ FDC Portal      → original USDA values                 │
│                                                         │
│ When these differ, user can't verify app data          │
└─────────────────────────────────────────────────────────┘
```

### Failing Foods (19)

| ID | Food Name | Notable Discrepancies |
|----|-----------|----------------------|
| 10166 | Squash, winter, butternut, raw | calcium 48→21.7, vitaminC 21→7.6 |
| 10120 | Lettuce, green leaf, raw | potassium 194→277, iron 0.86→0.32 |
| 12155 | Yogurt, plain, whole milk | vitaminD 0.1→0.778, fat 3.3→4.48 |
| 9963 | Melons, cantaloupe, raw | vitaminC 36.7→10.9, potassium 267→157 |
| 9769 | Rice flour, brown | vitaminB6 0.7→0.132 |
| ... | (14 more in audit_report.txt) | |

---

## Case Study: Bison (appId 16164)

**Investigated:** 2026-01-01

This case study demonstrates the exact root cause of `app_100g_mismatch` failures.

### The Discrepancy

| Source | Calcium per 100g | FDC ID |
|--------|------------------|--------|
| **App database** | **11 mg** | (uses SR Legacy nutrients) |
| **Provenance data** | 6.83 mg | #2727571 (Foundation Foods) |
| **FDC portal page** | 7 mg | #2727571 (Foundation Foods) |

Provenance and FDC portal match (6.83 ≈ 7mg), but app has different value (11mg).

### Root Cause Analysis

**Master Key Map entries:**
```
SR Legacy_175293    → appId 16164  ← App uses this source
Foundation_2727571  → appId 16497
usda-fdc_2727571    → appId 8056
```

**What happened:**
1. Pipeline matched Foundation Foods bison (#2727571) with SR Legacy bison (#175293) as "same food"
2. During serving derivation, nutrients reverted to SR Legacy (density mismatch or other reason)
3. **BUG:** `sourceId` was NOT updated to SR Legacy FDC ID (#175293)
4. Provenance generator used the stale `sourceId` (#2727571) → wrong FDC link

### Nutrient Comparison

| Nutrient | App (SRL #175293) | Provenance (FF #2727571) |
|----------|-------------------|--------------------------|
| Calcium | **11 mg** | 6.83 mg |
| Protein | 20.2g | 19.9g |
| Fat | 7.2g | 8.88g |
| Iron | 2.8mg | 2.17mg |

Significant differences across multiple nutrients confirm different sources.

### Expected Fix

Re-running the pipeline with the density revert fix (`8849caf`) should:
1. Detect density mismatch between FF and SRL
2. Revert to SRL nutrients AND update `sourceId` to #175293
3. Provenance will link to SR Legacy page showing 11mg calcium

**Verification:** After pipeline re-run, check that:
- Provenance for appId 16164 shows `fdcId: 175293`
- Provenance calcium matches app calcium (11mg)

---

## Potential Future Fixes

### Option A: Use Curated Nutrients in Provenance (Simple)

Modify `provenance-generator.cjs` to use `food.nutrientsPer100g` directly:

```javascript
// Instead of:
sourceItems.push(formatSourceEntry(masterMap.get(primarySourceId)));

// Use:
sourceItems.push(formatSourceEntry(food));  // Uses curated nutrients
```

**Trade-off:** App↔Provenance always match, but FDC portal link may show different values.

### Option B: Debug Pipeline Consistency (Thorough)

Investigate why curated differs from master for these foods:
1. Is it using different FF records?
2. Is there nutrient processing/transformation?
3. Is the master file out of sync?

### Option C: Accept ~2% Variance (Pragmatic)

Document the limitation and move on. 98% accuracy is acceptable for nutrition tracking.

---

## Data Integrity Discussion

**User's Goal:** "If the user clicks the link on Provenance page to go out and look at the actual data in the FDC online portal, what's in the app will align to that."

**Current State:**
- 98.1% of foods: FDC link → portal values match app ✓
- 1.9% of foods: FDC link → portal values may differ ✗

**Decision Made:** Prioritize accuracy over completeness. When match quality is uncertain (density revert), use the verifiable SRL source rather than potentially-inaccurate FF source.

---

## Audit Acceptance Threshold

- ≥97% of foods must have app ↔ provenance ↔ portal agreement
- Remaining discrepancies must be explainable by documented hybrid logic
- No silent corruption or non-deterministic variance permitted

---

## Key Files Reference

### Pipeline Scripts
- `run-pipeline.sh` - Orchestration script with stages
- `json-data-processor.cjs` - Parses USDA JSON files
- `master-key-assigner-json.cjs` - Assigns stable appIds
- `candidate-generator.cjs` - Matches FF↔SRL foods
- `serving-deriver.cjs` - Derives serving sizes, **handles density revert**
- `food-curator-nutrients.cjs` - Filters and cleans foods
- `data-module-generator-nutrients.cjs` - Generates final JS module
- `provenance-generator.cjs` - Generates provenance data

### Validation
- `data-audit.cjs` - Comprehensive audit tool
- `diff-validator.cjs` - Pipeline diff validation

### Output
- `src/lib/data/foodDatabaseData.js` - Final app database
- `static/data/provenance/provenance_*.json` - Provenance chunks

### Config
- `usda-fdc-json-config.json` - Nutrient ID mappings (source of truth)

---

## Commits This Session

| Commit | Description |
|--------|-------------|
| `22bc10b` | feat: Add comprehensive data audit script |
| `f86f1f7` | fix: Correct provenance output directory |
| `506a32b` | feat: Add provenance generation as stage 9 |
| `4507c39` | fix: Preserve appId in candidate-generator |
| `2aeec43` | fix: Correct audit tool nutrient IDs and add rounding |
| `f9534cb` | fix: Disable rounding in prov-to-FDC comparison |
| `8849caf` | fix: Use SR Legacy source ID when density revert occurs |

---

## Next Steps (Future Session)

1. **Investigate remaining 19 failures** - Trace one food end-to-end to understand root cause
2. **Decide on fix approach** - Option A (quick) vs Option B (thorough) vs Option C (accept)
3. **Consider audit improvements** - Add more detailed diagnostics for mismatch cases
4. **Integration testing** - Verify provenance page in app shows correct links

---

## Related Work

User has a separate branch in progress for:
- Data migration refinements
- Journal food ID handling (appId for database foods, custom ID for custom foods)
- Upgrading from August version to current
- Ensuring June journal data imports correctly

Both branches planned for merge, then final review of complete data solution.
