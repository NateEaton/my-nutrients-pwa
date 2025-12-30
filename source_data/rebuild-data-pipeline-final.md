# Design Specification: Rebuilding the Food Curation Pipeline
## Final Consolidated Draft — v3.0

**Document Status**: Final Draft for Review
**Date**: December 2025
**Supersedes**: rebuild-data-pipeline.md (v1.0), rebuild-data-pipeline-2.md (v2.0)

---

## 1. Purpose & Scope

This document specifies a ground-up redesign of the food curation pipeline used by My Nutrients PWA. The primary goal is to implement a **Hybrid Data Strategy** that maximizes both nutrient accuracy and serving size usability by intelligently combining two USDA data sources.

### 1.1 Core Objectives

1. **Systematic Hybridization**: Use Foundation Foods for nutrient values where available; use SR Legacy for household measures universally
2. **Expanded Coverage**: Retain SR Legacy as a *primary* source for the ~7,300 foods not represented in Foundation Foods
3. **Physical Fidelity**: Ensure density (grams per volume) is consistent when transferring measures across datasets
4. **Auditability**: Introduce intermediate artifacts for human review before final build
5. **External Validation**: Optionally validate heuristics against independent interpretation APIs

### 1.2 Compatibility Guarantees

The output remains fully compatible with:
- `src/lib/data/foodDatabaseData.js` (existing export structure)
- Existing IndexedDB schemas
- Existing provenance display and metadata dialogs
- Current `--keep-list` and `--exclude-list` functionality

No changes to the application runtime schema are required.

---

## 2. Guiding Principles

### Principle 1: Foundation-First for Nutrients (When Available)
Foundation Foods provide lab-analyzed nutrient values with documented methodology. When a high-confidence Foundation Foods match exists, its nutrient data takes precedence.

### Principle 2: SR Legacy for Comprehensive Coverage
SR Legacy contains 7,793 foods versus Foundation Foods' ~450. SR Legacy is the **primary source** for:
- Foods not represented in Foundation Foods
- Household measures and portion data (for all foods)
- Density information implicit in gram weights

### Principle 3: Food Concepts are Primary
Internal "App Foods" are stable identities independent of any single USDA entry. A single App Food may use:
- One FDC ID for nutrients (Foundation Foods)
- A different FDC ID for serving definitions (SR Legacy)
- Or a single FDC ID for both (SR Legacy-only foods)

### Principle 4: Strict State Matching
"Raw" must never match "Cooked." "Dry" must never match "Boiled." Text token overlap is insufficient; semantic state must match.

### Principle 5: Grams are the Contract
The pipeline never imports "cups" directly. It imports the **gram weight** associated with "1 cup" from the source. All nutrient calculations derive from gram weights.

### Principle 6: Trust but Verify
Matching algorithms are heuristics. The pipeline must output human-readable audit artifacts before generating the final database.

---

## 3. Data Source Coverage Model

### 3.1 The Coverage Reality

| Dataset | Food Count | Nutrient Quality | Serving Data | Update Status |
|---------|------------|------------------|--------------|---------------|
| Foundation Foods | ~450 | Excellent (lab-analyzed) | Sparse | Active (v12.4, March 2025) |
| SR Legacy | 7,793 | Good (mixed methods) | Rich | Frozen (April 2018) |

**Critical Understanding**: Foundation Foods covers approximately **6%** of the foods in SR Legacy. The hybrid strategy must treat SR Legacy as a first-class data source, not merely a fallback.

### 3.2 Expected Coverage Distribution

After pipeline execution, the database should reflect:

| Source Strategy | Expected % | Description |
|-----------------|------------|-------------|
| **FF Nutrients + SRL Measures** | 8-12% | Foods with high-confidence FF match |
| **SRL Nutrients + SRL Measures** | 85-90% | Foods without FF equivalent |
| **FF Only** | 1-2% | New FF foods not in SRL |
| **RACC-Derived Measures** | 2-5% | Foods lacking household measures |

### 3.3 Coverage Tracking Requirement

Every pipeline run must generate a coverage report:

```
=== Pipeline Coverage Report ===
Total foods in output: 3,847

Nutrient Sources:
  Foundation Foods primary:    423 (11.0%)
  SR Legacy primary:         3,398 (88.3%)
  SR Legacy fallback:           26 (0.7%)

Serving Sources:
  SR Legacy measures:        3,691 (95.9%)
  Foundation Foods measures:    42 (1.1%)
  RACC-derived:                 72 (1.9%)
  100g only:                    42 (1.1%)
```

---

## 4. Conceptual Model

### 4.1 The Food Concept

A **Food Concept** is the internal representation of a real-world food, independent of any single USDA entry.

Examples:
- "Egg, whole, raw"
- "Milk, whole"
- "Rice, brown, long-grain, cooked"

Each Food Concept:
- Has one stable `appId`
- May reference one or two USDA foods (for nutrients vs. measures)
- Owns its serving definitions
- Preserves provenance metadata

### 4.2 Analytical Realizations

Each Food Concept is constructed from potentially two distinct USDA entries:

| Role | Source | Purpose | Selection Rule |
|------|--------|---------|----------------|
| **Primary** | Foundation Foods | Nutrient values | Used if equivalence score ≥ threshold |
| **Reference** | SR Legacy | Serving sizes & density | Used for household measures (almost always) |
| **Fallback** | SR Legacy | Nutrients | Used if no FF match exists OR equivalence is low |

**Important**: For the ~88% of foods without a Foundation Foods equivalent, SR Legacy serves as *both* Primary and Reference.

### 4.3 State Classification

Every food is classified by preparation state to prevent invalid matches:

| State Category | Keywords | Incompatible With |
|----------------|----------|-------------------|
| Raw | raw, fresh, uncooked | cooked, boiled, baked, fried, roasted |
| Cooked | cooked, boiled, baked, fried, roasted, steamed | raw, dry, uncooked |
| Dry | dry, dried, dehydrated, uncooked | cooked, boiled, rehydrated |
| Processed | canned, frozen, prepared | (context-dependent) |

---

## 5. Pipeline Architecture

### 5.1 Pipeline Stages

```
[Inputs]
   │
   ├── USDA Foundation Foods JSON
   ├── USDA SR Legacy JSON
   ├── master-key-map.json (stable App IDs)
   ├── racc_table.json (FDA serving sizes)
   ├── density_defaults.json (fallback densities)
   ├── keep-list.txt (protected foods)
   └── exclude-list.txt (filtered terms)
   │
   ▼
[1] DATA LOADER & CATEGORIZER
    - Load both USDA datasets
    - Extract nutrients using nutrient mapping
    - Group by FDC food category
    - Tag each food with source type
   │
   ▼
[2] STABLE ID ASSIGNMENT
    - Apply master-key-map.json
    - Assign new appIds for new foods
    - Preserve existing mappings
   │
   ▼
[3] CANDIDATE GENERATOR
    - For each SR Legacy food:
      a. Apply State Filtering (stop words)
      b. Find potential FF matches in same category
      c. Calculate equivalence scores
      d. Select Primary (FF) if score ≥ threshold
      e. Mark Reference (SRL) for measures
    - For FF-only foods (no SRL equivalent):
      a. Use FF for both nutrients and measures
      b. Flag for RACC/density-derived serving if needed
   │
   ▼
[4] AUDIT STEP ★
    - Output: candidates_review.csv
    - Columns: AppID, Name, Primary_Source, Primary_FDC,
               Ref_FDC, Score, State_Match, Density_Warning
    - Pipeline can pause here for human review
    - Accept manual override configuration
   │
   ▼
[5] SERVING DERIVATION ENGINE
    - For each Food Concept:
      a. Import household measures from Reference source
      b. Apply Density Transfer Rule (with safety check)
      c. Fall back to RACC table if no measures
      d. Fall back to density defaults if no RACC
      e. Ensure at least one non-100g serving when meaningful
   │
   ▼
[6] CONCEPT BUILDER
    - Merge nutrients (from Primary) with servings (from Reference)
    - Calculate per-serving nutrients: (grams / 100) × nutrients_per_100g
    - Apply nutrient rounding rules
    - Attach provenance metadata
   │
   ▼
[7] CURATOR / DEDUPLICATOR
    - Apply keep-list protections
    - Apply exclude-list filtering
    - Collapse nutritionally similar foods
    - Prefer unsalted variants when collapsing
    - Apply abridgement rules (cooking methods, meat cuts, etc.)
   │
   ▼
[8] MODULE GENERATOR
    - Generate foodDatabaseData.js
    - Apply key minification (--minify)
    - Strip metadata (--minimal)
    - Output coverage report
   │
   ▼
[9] PROVENANCE GENERATOR
    - Generate chunked provenance JSON files
    - Include source FDC IDs, roles, scores
    - Enable app-level "view source" functionality
   │
   ▼
[10] DIFF VALIDATION ★
    - Compare NEW vs OLD foodDatabaseData.js
    - Alert on threshold violations
    - Generate migration safety report
```

### 5.2 New Pipeline Steps (★)

Two steps are new compared to the current pipeline:

1. **Audit Step (Stage 4)**: Generates human-reviewable CSV before final curation
2. **Diff Validation (Stage 10)**: Compares output against previous version

---

## 6. Nutrient Source Selection Rules

### 6.1 Candidate Generation Logic

For each food in the combined dataset:

```
1. CATEGORY LOCK
   Filter candidates to strict FDC foodCategory matches
   Example: "Dairy and Egg Products" only matches same category

2. STATE FILTERING (Stop Words)
   IF food contains {raw, dry, uncooked}:
     EXCLUDE candidates with {cooked, boiled, baked, fried, roasted}
   IF food contains {cooked, boiled, baked}:
     EXCLUDE candidates with {raw, dry, uncooked}

3. TOKEN SCORING
   Calculate normalized name token overlap:
   - Tokenize both names (split on spaces, commas, parentheses)
   - Remove common stop words (the, and, with, etc.)
   - Calculate Jaccard similarity: |A ∩ B| / |A ∪ B|

4. THRESHOLD CHECK
   IF best Foundation Foods score ≥ 0.70:
     SELECT as Primary source for nutrients
   ELSE:
     USE SR Legacy as Primary (nutrient source)

5. REFERENCE ASSIGNMENT
   ALWAYS prefer SR Legacy for serving measures if available
   (Foundation Foods foodPortions are often sparse)
```

### 6.2 Nutrient Backfilling Policy

**Strict Mode (Default)**: No merging across sources.

If Primary is Foundation Foods, *only* FF nutrients are used. Missing nutrients remain missing rather than being backfilled from SR Legacy.

**Rationale**: Prevents "Franken-foods" where values from different analytical samples are incorrectly combined.

### 6.3 SR Legacy as Primary Source

For the majority of foods (~88%), no suitable Foundation Foods match exists. In these cases:

```
Primary Source: SR Legacy (nutrients)
Reference Source: SR Legacy (measures)
Fallback Source: N/A
```

This is the expected case, not an exception.

---

## 7. Serving Model

### 7.1 Serving Archetypes

Each food is classified into exactly one serving archetype:

| Archetype | Examples | Derivation Priority |
|-----------|----------|---------------------|
| **Countable** | Eggs, apples, slices | 1. Unit weight table |
| **Volumetric Liquid** | Milk, juice, oil | 1. Reference measures → 2. Density table |
| **Volumetric Solid** | Rice, flour, shredded cheese | 1. Reference measures → 2. Density table |
| **Amorphous** | Butter, yogurt, spreads | 1. Reference measures → 2. RACC |
| **Regulatory** | Packaged foods | 1. FDA RACC grams |
| **Fallback** | Exotic herbs, spices | 100g only |

### 7.2 Serving Derivation Priority

For each Food Concept, serving options are generated in order:

```
1. EXPLICIT HOUSEHOLD MEASURE
   Source: SR Legacy foodPortions (preferred)
   Source: Foundation Foods foodPortions (if SRL unavailable)

2. FDA RACC LOOKUP
   Source: racc_table.json
   Condition: If no household measure AND food category maps to RACC

3. DENSITY-BASED VOLUME
   Source: density_defaults.json
   Condition: If volumetric food without explicit measure

4. UNIT WEIGHT TABLE
   Source: unit_weights.json (e.g., "large egg" = 50g)
   Condition: If countable food

5. FALLBACK
   Default: 100g only
   Condition: When no other derivation is possible
```

### 7.3 Density Transfer Rule

When Primary (FF) differs from Reference (SRL), serving gram weights must be validated:

```
1. Look up "1 cup" in Reference (SRL)
2. Extract gram weight: e.g., 150g
3. Validate density compatibility:
   - Compare water content between Primary and Reference
   - IF |FF_water - SRL_water| / max(FF_water, SRL_water) > 0.20:
       FLAG as "Density Mismatch"
       REVERT to SR Legacy for both nutrients and measures
4. If validated, apply to Primary:
   - Create serving "1 cup" = 150g
   - Calculate nutrients: (150 / 100) × Primary_Nutrients_per_100g
```

### 7.4 Density Safety Validators

Water content comparison works for most foods but not all. Extended validators:

| Food Type | Validation Method | Threshold |
|-----------|-------------------|-----------|
| Default | Water content difference | 20% |
| Oils & Fats | Fat content check | Must be >85% fat |
| Nuts & Seeds | Carb-to-fiber ratio | Within 2.5x |
| Dried Goods | Moisture expectation | Must be <15% water |

---

## 8. Deduplication & Collapsing

### 8.1 Collapsing Rules

Foods may be collapsed when:
- Normalized names are equivalent (after removing preparation details)
- Primary nutrients (protein, calcium, fiber) differ by <5%
- Differences are limited to optional attributes (e.g., sodium from salt)

### 8.2 Collapse Preferences

When collapsing, prefer:
1. **Unsalted variants** ("without salt" over "with salt")
2. **Raw variants** (when cooking method is the only difference)
3. **Foundation Foods source** (when nutrient values are equivalent)

### 8.3 Provenance Preservation

Collapsed foods must:
- Preserve links to all source FDC IDs
- Store alternate names in `collapsedFrom` metadata
- Display differences in provenance dialog

---

## 9. Audit & Validation

### 9.1 Candidate Audit CSV

Generated at Stage 4, before final curation:

```csv
appId,name,primarySource,primaryFDC,refFDC,score,stateMatch,densityWarning,action
1001,"Milk, whole",Foundation,2346721,171265,0.92,true,false,ACCEPT
1002,"Rice, brown, cooked",Foundation,2346890,168878,0.78,true,true,REVIEW
1003,"Beef, ground, raw",SR Legacy,171513,171513,N/A,N/A,false,SRL_ONLY
```

**Column Definitions**:
- `primarySource`: "Foundation" or "SR Legacy"
- `score`: Equivalence score (0.0-1.0) or "N/A" for SRL-only
- `stateMatch`: Whether preparation states align
- `densityWarning`: Whether density transfer may be unsafe
- `action`: Suggested action (ACCEPT, REVIEW, SRL_ONLY, REJECT)

### 9.2 Diff Script Thresholds

Post-build validation comparing NEW vs OLD output:

| Metric | Threshold | Indicates |
|--------|-----------|-----------|
| Calorie shift per 100g | >15% | Possible raw/cooked mismatch |
| Serving weight shift | >10% | Density mismatch |
| Micronutrient drop | >50% | Foundation Foods sparsity |
| Food count change | >5% | Unexpected filtering |

### 9.3 Validation Workflow

```
1. Run pipeline (Stages 1-9)
2. Review candidates_review.csv
   - Focus on REVIEW actions
   - Check low-score matches (<0.75)
   - Verify density warnings
3. Run Diff Script
   - Address any threshold violations
4. Manual spot-check
   - Top 20 most-logged foods (from app analytics)
   - All keep-listed foods
5. Deploy if validation passes
```

---

## 10. External Validation (Optional)

### 10.1 Purpose

Use a limited number of calls to an external nutrition API (e.g., Avocavo) to evaluate and refine the food concept normalization and serving-derivation heuristics.

**This is a development-time validation tool, not a runtime dependency.**

### 10.2 Scope and Constraints

- Limited to ~500 API calls (free tier)
- Run only during major pipeline redesigns
- Results inform heuristic tuning; no automatic data merging
- Skipped entirely in routine rebuilds

### 10.3 Sampling Strategy

Stratified sampling across:

1. **Confidence Tiers**
   - High (30%): Trusted unit weights (egg, apple)
   - Medium (45%): SR Legacy household measures
   - Low (25%): RACC-derived or heuristic

2. **Food Categories**
   - Dairy (15%), Produce (20%), Meat (15%)
   - Grains (15%), Nuts (10%), Other (25%)

3. **Preparation Ambiguity**
   - Raw vs. cooked
   - With/without salt
   - Generic vs. specific

### 10.4 Comparison Metrics

For each sampled food:

| Metric | Calculation | Classification |
|--------|-------------|----------------|
| **Concept Alignment** | Same food identity? | Aligned / Near / Misaligned |
| **Serving Variance** | (API_grams - derived_grams) / derived_grams | <5% Strong, 5-15% Acceptable, >15% Divergent |
| **FDC ID Match** | Same USDA source? | True / False / Not Provided |

### 10.5 Validation Script

Standalone Node.js script (not part of production pipeline):

```
source_data/avocavo-validator/
├── validate.cjs           # Main entry point
├── sampler.cjs            # Stratified sampling
├── compare.cjs            # Metric calculations
├── report-generator.cjs   # Output formatting
├── config.json            # Sampling configuration
└── cache/                 # Cached API responses
```

**Outputs**:
1. Summary report (Markdown): alignment rates, variance statistics
2. Detailed report (JSON): per-food comparisons
3. Needs-review CSV: foods with >15% variance

### 10.6 Interpretation

Results are interpreted qualitatively:
- Where do heuristics consistently disagree with external interpretation?
- Do confidence tiers meaningfully predict ambiguity?
- Are disagreements explainable and acceptable?

**Outcomes feed back into**:
- Serving derivation rules
- Naming normalization
- Confidence scoring thresholds

---

## 11. Artifact Definitions

### 11.1 Input Artifacts

#### `racc_table.json`
Maps FDC food category IDs to FDA RACC gram values:

```json
{
  "0100": { "name": "Dairy and Egg Products", "racc": 240, "unit": "cup" },
  "0500": { "name": "Poultry Products", "racc": 85, "unit": "cooked" },
  "0900": { "name": "Fruits and Fruit Juices", "racc": 140, "unit": "pieces" },
  "1100": { "name": "Vegetables and Vegetable Products", "racc": 85, "unit": "cooked" },
  "1200": { "name": "Nut and Seed Products", "racc": 30, "unit": "whole" }
}
```

#### `density_defaults.json`
Fallback densities by food texture:

```json
{
  "liquid": { "grams_per_cup": 240, "confidence": "high" },
  "powder": { "grams_per_cup": 130, "confidence": "medium" },
  "granular": { "grams_per_cup": 200, "confidence": "medium" },
  "shredded": { "grams_per_cup": 110, "confidence": "medium" },
  "leafy": { "grams_per_cup": 30, "confidence": "low" },
  "dense_solid": { "grams_per_cup": 225, "confidence": "low" }
}
```

#### `unit_weights.json`
Standard weights for countable foods:

```json
{
  "egg": {
    "small": 38,
    "medium": 44,
    "large": 50,
    "extra_large": 56,
    "jumbo": 63,
    "default": 50
  },
  "apple": {
    "small": 150,
    "medium": 180,
    "large": 220,
    "default": 180
  }
}
```

### 11.2 Output Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| `candidates_review.csv` | `source_data/` | Human audit of FF↔SRL matches |
| `coverage_report.txt` | `source_data/` | Source distribution statistics |
| `foodDatabaseData.js` | `src/lib/data/` | Production app database |
| `provenance_*.json` | `static/data/provenance/` | Source attribution data |
| `diff_report.json` | `source_data/` | NEW vs OLD comparison |

---

## 12. Migration Strategy

### 12.1 Parallel Pipeline Approach

```
Week 1: Build new pipeline stages (1-6)
        Run OLD pipeline → output_old.js
        Run NEW pipeline → output_new.js

Week 2: Compare outputs
        - Food count delta
        - Nutrient value shifts
        - Serving weight changes

Week 3: Investigate discrepancies
        - Tune thresholds
        - Add to keep-list as needed
        - Document intentional changes

Week 4: Validate with app
        - Load new database in dev
        - Test search functionality
        - Verify nutrient calculations

Week 5: Deploy
        - Replace production database
        - Monitor for user-reported issues
```

### 12.2 Rollback Plan

The old pipeline and its artifacts are preserved:
- `foodDatabaseData.js.bak` (pre-migration backup)
- `master-key-map.json` (unchanged—IDs are stable)
- Git history of all pipeline scripts

Rollback: `cp foodDatabaseData.js.bak src/lib/data/foodDatabaseData.js`

---

## 13. Implementation Phases

| Phase | Description | Effort | Dependencies |
|-------|-------------|--------|--------------|
| **0** | Create `racc_table.json` from FDA data | 1-2 days | FDA CFR 101.12 |
| **1** | Build Data Loader with source tagging | 2-3 days | USDA JSON files |
| **2** | Implement Candidate Generator with State Filtering | 3-5 days | Phase 1 |
| **3** | Build Serving Derivation Engine | 2-3 days | Phase 2, RACC table |
| **4** | Add Audit CSV generation | 1 day | Phase 2 |
| **5** | Implement Density Safety Checks | 1-2 days | Phase 3 |
| **6** | Build Diff Script | 1-2 days | Existing database |
| **7** | Parallel run: old vs new | 2-3 days | Phases 1-6 |
| **8** | Manual validation of top foods | 1 day | Phase 7 |
| **9** | (Optional) Avocavo validation script | 2-3 days | Phase 7 |

**Total Estimated Effort**: 14-22 days

---

## 14. Backward Compatibility

The following are explicitly preserved:

| Element | Guarantee |
|---------|-----------|
| `appId` stability | Existing IDs never change |
| `foodDatabaseData.js` shape | Same exports: KEYS, MEASURE_KEYS, DB, __minified__, DATABASE_METADATA |
| Measure structure | `{ s: "1 cup", n: { ca: 276, p: 7.7 }, g: 244 }` |
| Nutrient key minification | Same abbreviations (ca, p, f, vd, etc.) |
| IndexedDB compatibility | No schema changes required |
| Keep-list behavior | Protected foods bypass all filtering |

Any new metadata must be removable via `--minimal` build flag.

---

## 15. Non-Goals

This specification explicitly does not:

- **Achieve perfect USDA equivalence**: Some interpretation is inherent
- **Eliminate SR Legacy**: SRL remains essential for 88%+ of foods
- **Automate cultural serving norms**: RACC provides US-centric defaults only
- **Replace human judgment**: Audit steps exist precisely because automation is imperfect
- **Create runtime API dependencies**: All external validation is development-only

---

## 16. Success Criteria

The rebuilt pipeline is successful when:

1. **Coverage**: ≥95% of foods have at least one non-100g serving
2. **Accuracy**: Foundation Foods nutrients used for ≥10% of database
3. **Stability**: Zero appId changes for existing foods
4. **Auditability**: Every FF↔SRL match is reviewable in CSV
5. **Performance**: Pipeline completes in <15 minutes
6. **Diff Clean**: No threshold violations vs. current production database (after intentional changes are documented)

---

## 17. Summary

This specification redesigns the food curation pipeline to:

1. **Maximize nutrient accuracy** by preferring Foundation Foods when high-confidence matches exist
2. **Maintain comprehensive coverage** by treating SR Legacy as a first-class data source for the majority of foods
3. **Ensure serving usability** by systematically deriving household measures with explicit fallback chains
4. **Enable verification** through audit CSVs, diff scripts, and optional external validation
5. **Preserve all guarantees** the application depends on

The pipeline moves from treating USDA datasets as interchangeable peers to a principled hybrid strategy that leverages the strengths of each source while maintaining full backward compatibility.

---

## Appendix A: File Reference

### New Scripts (to be created)

| Script | Purpose |
|--------|---------|
| `candidate-generator.cjs` | Stage 3: FF↔SRL matching with state filtering |
| `serving-deriver.cjs` | Stage 5: Measure derivation with RACC/density fallback |
| `audit-generator.cjs` | Stage 4: Generate candidates_review.csv |
| `diff-validator.cjs` | Stage 10: Compare NEW vs OLD output |
| `avocavo-validator/*.cjs` | Optional external validation suite |

### Modified Scripts

| Script | Changes |
|--------|---------|
| `json-data-processor.cjs` | Add source type tagging |
| `food-curator-nutrients.cjs` | Integrate with Concept Builder |
| `data-module-generator-nutrients.cjs` | Add coverage report output |

### New Data Files

| File | Purpose |
|------|---------|
| `racc_table.json` | FDA RACC values by food category |
| `density_defaults.json` | Fallback density table |
| `unit_weights.json` | Standard weights for countable foods |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Food Concept** | Abstract food identity with stable appId |
| **Primary Source** | USDA dataset providing nutrient values |
| **Reference Source** | USDA dataset providing serving measures |
| **Realization** | Concrete USDA food entry backing a Food Concept |
| **Equivalence Score** | 0.0-1.0 measure of name/category similarity |
| **State Filtering** | Excluding candidates with incompatible preparation states |
| **Density Transfer** | Applying gram weights from Reference to Primary |
| **RACC** | FDA Reference Amounts Customarily Consumed |
| **Collapse** | Merging nutritionally similar foods under one entry |

---

## Appendix C: References

- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [FoodData Central Downloads](https://fdc.nal.usda.gov/download-datasets/)
- [Foundation Foods Documentation](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/)
- [FDA RACC Guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-reference-amounts-customarily-consumed-list-products-each-product-category)
- [21 CFR 101.12 - RACC Table](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.12)

---

*End of Specification*
