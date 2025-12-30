# Food Database Pipeline

This directory contains the data processing pipeline for generating the multi-nutrient food database used by My Nutrients PWA.

## Overview

The pipeline processes USDA FoodData Central JSON files using a **Hybrid Data Strategy** that:
- Uses **Foundation Foods** for nutrient values when high-confidence matches exist (~10-12% of foods)
- Uses **SR Legacy** for serving measures and as the primary source for ~88% of foods
- Prevents raw/cooked mismatches through state filtering
- Validates density compatibility when transferring measures between sources

**Pipeline Stages:**
```
USDA JSON Files (Foundation + SR Legacy)
    ↓
[1] json-data-processor.cjs → Extract nutrients + source tagging
    ↓
[2] master-key-assigner-json.cjs → Assign stable appIds
    ↓
[3] candidate-generator.cjs → FF↔SRL matching + state filtering
    ↓
[4] ★ REVIEW: candidates_review.csv (human audit point)
    ↓
[5] serving-deriver.cjs → Measure derivation with RACC/density fallback
    ↓
[6] food-curator-nutrients.cjs → Filter & deduplicate
    ↓
[7] data-module-generator-nutrients.cjs → Generate app module + coverage report
    ↓
[8] diff-validator.cjs → Compare against previous version
    ↓
../src/lib/data/foodDatabaseData.js (ready for app)
```

**Output:** ~2-3 MB optimized JavaScript module with 3,500-4,000 foods

## Quick Start

### Automated Pipeline (Recommended)

```bash
cd source_data

# Run full pipeline with review checkpoints
./run-pipeline.sh

# Or skip to specific stage
./run-pipeline.sh --from-stage 5

# Non-interactive mode (skip review prompts)
./run-pipeline.sh --non-interactive
```

### Manual Pipeline

```bash
cd source_data

# 1. Process JSON files (with source tagging)
node json-data-processor.cjs \
  --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
  --output combined-nutrient-data

# 2. Assign stable IDs
node master-key-assigner-json.cjs \
  --input combined-nutrient-data.json \
  --map master-key-map.json \
  --output mastered-nutrient-data.json

# 3. Generate candidates (FF↔SRL matching)
node candidate-generator.cjs \
  --input mastered-nutrient-data.json \
  --output candidates \
  --threshold 0.70

# ★ REVIEW: Check candidates_review.csv for issues
#   - Focus on REVIEW actions (low-score matches)
#   - Verify density warnings
#   - Optionally add overrides

# 4. Derive serving sizes
node serving-deriver.cjs \
  --input candidates.json \
  --output derived-foods \
  --data-dir .

# 5. Curate foods
node food-curator-nutrients.cjs \
  derived-foods.json \
  curated-nutrients \
  --keep-list keep-list.txt \
  --exclude-list exclude-list.txt

# 6. Generate app module with coverage report
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal \
  --coverage coverage_report.txt

# 7. Validate against previous version
node diff-validator.cjs \
  --old ../src/lib/data/foodDatabaseData.js.bak \
  --new ../src/lib/data/foodDatabaseData.js \
  --output diff_report

echo "✅ Pipeline complete!"
```

## Prerequisites

- **Node.js**: Version 14 or higher
- **Disk space**: ~5 GB for source files and processing
- **Memory**: 4+ GB RAM recommended
- **USDA Data**: Download Foundation Foods + SR Legacy JSON files (see below)

## Downloading USDA Data

### Required Files

Download from [USDA FoodData Central](https://fdc.nal.usda.gov/download-datasets/):

1. **Foundation Foods (JSON)**
   - File: `FoodData_Central_foundation_food_json_2024-04-24.zip`
   - Size: ~6-7 MB compressed, ~30-40 MB uncompressed
   - URL: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-04-24.zip

2. **SR Legacy Foods (JSON)**
   - File: `FoodData_Central_sr_legacy_food_json_2018-04.zip`
   - Size: ~200 MB compressed, ~800 MB+ uncompressed
   - URL: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip

### Download Methods

**Manual Download:**
1. Visit https://fdc.nal.usda.gov/download-datasets.html
2. Find "Foundation Foods" → click JSON download
3. Find "SR Legacy" → click JSON download
4. Unzip both files into `source_data/`

**Command Line (macOS/Linux):**
```bash
cd source_data
curl -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-04-24.zip
unzip FoodData_Central_foundation_food_json_2024-04-24.zip
curl -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
unzip FoodData_Central_sr_legacy_food_json_2018-04.zip
```

## Pipeline Stages (Detailed)

### Stage 1: Extract Multi-Nutrient Data

Processes USDA JSON files with enhanced metadata extraction:

```bash
node json-data-processor.cjs \
  --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
  --output combined-nutrient-data
```

**New in v2.0:**
- Source type tagging (Foundation vs SR Legacy)
- Food category extraction (FDC category codes)
- Preparation state classification (raw, cooked, dry, processed)
- Water content extraction for density validation

**Output:** `combined-nutrient-data.json` (~50-100 MB)

### Stage 2: Assign Stable App IDs

Assigns permanent IDs to each food:

```bash
node master-key-assigner-json.cjs \
  --input combined-nutrient-data.json \
  --map master-key-map.json \
  --output mastered-nutrient-data.json
```

**Output:** `mastered-nutrient-data.json`, `master-key-map.json`

### Stage 3: Generate Candidates (Hybrid Matching)

Matches Foundation Foods to SR Legacy using state filtering:

```bash
node candidate-generator.cjs \
  --input mastered-nutrient-data.json \
  --output candidates \
  --threshold 0.70
```

**Key features:**
- Jaccard similarity scoring (0.70 threshold for FF match)
- State filtering (prevents raw↔cooked mismatches)
- Density compatibility checking (20% water content variance threshold)
- Generates audit CSV for human review

**Output:** `candidates.json`, `candidates_review.csv`

### Stage 4: Human Review (Audit Point) ★

Review `candidates_review.csv` before proceeding:

| Column | Description |
|--------|-------------|
| name | Food name |
| primarySource | "Foundation" or "SR Legacy" |
| primaryFDC | FDC ID for nutrient source |
| refFDC | FDC ID for serving source |
| score | Match score (0.0-1.0) or "N/A" |
| stateMatch | Whether prep states align |
| densityWarning | Potential density mismatch |
| action | ACCEPT, REVIEW, SRL_ONLY, FF_ONLY |

**Focus on:**
- Foods with action = "REVIEW" (low scores or warnings)
- Any density warnings (may need manual verification)
- Low-score matches (<0.75)

### Stage 5: Derive Serving Sizes

Derives household measures with fallback chain:

```bash
node serving-deriver.cjs \
  --input candidates.json \
  --output derived-foods \
  --data-dir .
```

**Derivation priority:**
1. Explicit household measures from Reference source
2. FDA RACC lookup (`racc_table.json`)
3. Density-based calculations (`density_defaults.json`)
4. Unit weight table (`unit_weights.json`)
5. Fallback to 100g only

**Output:** `derived-foods.json`

### Stage 6: Curate and Filter

Applies filtering, deduplication, and quality checks:

```bash
node food-curator-nutrients.cjs \
  derived-foods.json \
  curated-nutrients \
  --keep-list keep-list.txt \
  --exclude-list exclude-list.txt
```

**Output:** `curated-nutrients-full.json`, `curated-nutrients-abridged.json`

### Stage 7: Generate App Module

Creates production JavaScript module with coverage report:

```bash
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal \
  --coverage coverage_report.txt
```

**Coverage Report Example:**
```
=== Pipeline Coverage Report ===
Total foods in output: 3,847

Nutrient Sources:
  Foundation Foods primary:    423 (11.0%)
  SR Legacy primary:         3,398 (88.3%)
  SR Legacy fallback:           26 (0.7%)

Serving Sources:
  SR Legacy measures:        3,691 (95.9%)
  RACC-derived:                 72 (1.9%)
  100g only:                    42 (1.1%)
```

**Output:** `../src/lib/data/foodDatabaseData.js` (2-3 MB), `coverage_report.txt`

### Stage 8: Validate Against Previous

Compares new output against previous version:

```bash
node diff-validator.cjs \
  --old ../src/lib/data/foodDatabaseData.js.bak \
  --new ../src/lib/data/foodDatabaseData.js \
  --output diff_report \
  --verbose
```

**Threshold violations:**
| Metric | Threshold | Indicates |
|--------|-----------|-----------|
| Calorie shift per 100g | >15% | Possible raw/cooked mismatch |
| Serving weight shift | >10% | Density mismatch |
| Micronutrient drop | >50% | Foundation Foods sparsity |
| Food count change | >5% | Unexpected filtering |

**Output:** `diff_report.json`, `diff_report.txt`

## Reference Data Files

### `racc_table.json`

FDA Reference Amounts Customarily Consumed by food category:

```json
{
  "byCategory": {
    "0100": { "name": "Dairy and Egg Products", "racc": 240, "unit": "cup" },
    "1200": { "name": "Nut and Seed Products", "racc": 30, "unit": "whole" }
  }
}
```

### `density_defaults.json`

Fallback density values for volumetric foods:

```json
{
  "byTexture": {
    "liquid": { "grams_per_cup": 240, "confidence": "high" },
    "leafy_raw": { "grams_per_cup": 30, "confidence": "low" }
  }
}
```

### `unit_weights.json`

Standard weights for countable foods:

```json
{
  "eggs": { "small": 38, "medium": 44, "large": 50, "default": 50 },
  "apples": { "small": 150, "medium": 182, "large": 223, "default": 182 }
}
```

### `keep-list.txt`

Foods to always include (bypasses all filtering):

```
milk, whole
yogurt, plain
almonds
```

### `exclude-list.txt`

Terms to exclude from database:

```
baby food
pet food
restaurant
```

## Scripts Reference

### Core Pipeline Scripts

| Script | Stage | Purpose |
|--------|-------|---------|
| `json-data-processor.cjs` | 1 | Extract nutrients with source tagging |
| `master-key-assigner-json.cjs` | 2 | Assign stable appIds |
| `candidate-generator.cjs` | 3 | FF↔SRL matching with state filtering |
| `serving-deriver.cjs` | 5 | Measure derivation with fallbacks |
| `food-curator-nutrients.cjs` | 6 | Filter and deduplicate |
| `data-module-generator-nutrients.cjs` | 7 | Generate production module |
| `diff-validator.cjs` | 8 | Compare against previous version |
| `provenance-generator.cjs` | (opt) | Generate source provenance data |

### Orchestration

| Script | Purpose |
|--------|---------|
| `run-pipeline.sh` | Automated pipeline with review checkpoints |

### Reference Data

| File | Purpose |
|------|---------|
| `racc_table.json` | FDA RACC values by food category |
| `density_defaults.json` | Fallback densities for volumetric foods |
| `unit_weights.json` | Standard weights for countable foods |
| `keep-list.txt` | Foods to always include |
| `exclude-list.txt` | Terms to exclude |

## Troubleshooting

### Memory Errors

Increase Node.js heap size:

```bash
node --max-old-space-size=4096 json-data-processor.cjs ...
```

### High-Severity Issues in Diff Report

Check for:
- Raw/cooked mismatches (calorie shifts >15%)
- Density transfer errors (serving weight shifts >10%)
- FF nutrient sparsity (micronutrient drops >50%)

### Low Match Scores

Foods with scores <0.70 use SR Legacy for nutrients. If a specific food should use Foundation Foods:
1. Verify the food names are similar enough
2. Check that preparation states match
3. Consider adjusting the threshold or adding to keep-list

### Coverage Below Targets

Target: ≥95% of foods with non-100g servings

If below target:
- Check RACC table coverage for missing categories
- Add density defaults for uncovered food types
- Review unit weights for countable foods

## Expected Results

### Coverage Targets

| Metric | Target |
|--------|--------|
| Foods with household measures | ≥95% |
| Foundation Foods nutrients | 10-12% |
| appId stability | 100% (no changes for existing foods) |

### Nutrient Coverage

| Nutrient | Coverage |
|----------|----------|
| Protein | 95%+ |
| Calcium | 95%+ |
| Fiber | 90%+ |
| Vitamin D | 60%+ |

### Performance Benchmarks

| Step | Time | Output Size |
|------|------|-------------|
| JSON Processing | 2-5 min | 50-100 MB |
| Candidate Generation | <1 min | 30-50 MB |
| Serving Derivation | <1 min | 30-50 MB |
| Curation | <1 min | 10-30 MB |
| Module Generation | <1 min | 2-3 MB |
| **Total** | **5-10 min** | **2-3 MB final** |

## Additional Resources

- **Specification**: `rebuild-data-pipeline-final.md` (detailed design)
- **NUTRIENT_MAPPING.md**: Complete nutrient reference (in `_notes/`)
- **USDA FDC**: https://fdc.nal.usda.gov/
- **FDC Downloads**: https://fdc.nal.usda.gov/download-datasets/
- **FDA RACC**: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.12
