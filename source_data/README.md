# Food Database Pipeline

This directory contains the data processing pipeline for generating the multi-nutrient food database used by My Nutrients PWA.

## Overview

The pipeline processes USDA FoodData Central JSON files to create an optimized, multi-nutrient database with 20+ tracked nutrients including macronutrients, vitamins, minerals, and omega fatty acids.

**Pipeline Stages:**
```
USDA JSON Files (Foundation + SR Legacy)
    ↓
[1] json-data-processor.cjs → Extract nutrients
    ↓
[2] master-key-assigner-json.cjs → Assign stable appIds
    ↓
[3] food-curator-nutrients.cjs → Filter & deduplicate
    ↓
[4] data-module-generator-nutrients.cjs → Generate app module
    ↓
[5] provenance-generator.cjs → Generate source data (optional)
    ↓
../src/lib/data/foodDatabaseData.js (ready for app)
```

**Output:** ~2-3 MB optimized JavaScript module with 3,500-4,000 foods

## Quick Start

```bash
# 1. Download USDA data (see Download section below)
cd source_data

# 2. Process JSON files
node json-data-processor.cjs \
  --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
  --output combined-nutrient-data

# 3. Assign stable IDs
node master-key-assigner-json.cjs \
  --input combined-nutrient-data.json \
  --map master-key-map.json \
  --output mastered-nutrient-data.json

# 4. Curate foods
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt \
  --exclude-list exclude-list.txt

# 5. Generate app module
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal

# 6. Generate provenance data (optional)
node provenance-generator.cjs \
  curated-nutrients-abridged.json \
  mastered-nutrient-data.json \
  ../static/data/provenance

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

**Command Line (Windows PowerShell):**
```powershell
cd source_data
Invoke-WebRequest -Uri "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-04-24.zip" -OutFile "foundation.zip"
Expand-Archive foundation.zip -DestinationPath .
Invoke-WebRequest -Uri "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip" -OutFile "srlegacy.zip"
Expand-Archive srlegacy.zip -DestinationPath .
```

## Pipeline Steps

### Step 1: Extract Multi-Nutrient Data

Processes USDA JSON files to extract all nutrients:

```bash
node json-data-processor.cjs \
  --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
  --output combined-nutrient-data
```

**Output:** `combined-nutrient-data.json` (~50-100 MB)
**Time:** 2-5 minutes

### Step 2: Assign Stable App IDs

Assigns permanent IDs to each food:

```bash
node master-key-assigner-json.cjs \
  --input combined-nutrient-data.json \
  --map master-key-map.json \
  --output mastered-nutrient-data.json
```

**Output:** `mastered-nutrient-data.json`, `master-key-map.json`
**Time:** <1 minute

### Step 3: Curate and Filter

Applies filtering, deduplication, and quality checks:

```bash
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt \
  --exclude-list exclude-list.txt
```

**Output:** `curated-nutrients-full.json`, `curated-nutrients-abridged.json`
**Time:** <1 minute

### Step 4: Generate App Module

Creates the production JavaScript module:

```bash
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal
```

**Output:** `../src/lib/data/foodDatabaseData.js` (2-3 MB)
**Time:** <1 minute

### Step 5: Generate Provenance Data (Optional)

Creates chunked JSON files for food source provenance:

```bash
node provenance-generator.cjs \
  curated-nutrients-abridged.json \
  mastered-nutrient-data.json \
  ../static/data/provenance
```

**Output:** `../static/data/provenance/provenance_0.json` through `provenance_19.json`
**Time:** <1 minute

This enables the app to show users which USDA foods were combined into each app entry.

## Configuration Files

### `usda-fdc-json-config.json`

Maps USDA nutrient codes to property names:

```json
{
  "nutrientMapping": {
    "203": "protein",
    "291": "fiber",
    "301": "calcium",
    ...
  }
}
```

### `keep-list.txt`

Foods to always include (uses normalized names):

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

## Data Formats

### Input (USDA JSON)

```json
{
  "FoundationFoods": [{
    "fdcId": 1234,
    "description": "Milk, whole",
    "foodNutrients": [{
      "nutrient": {"number": "301"},
      "amount": 276.0
    }],
    "foodPortions": [{
      "value": 1.0,
      "measureUnit": {"name": "cup"},
      "gramWeight": 244.0
    }]
  }]
}
```

### Output (App Module)

```javascript
export const foodData = [{
  i: 1,  // id
  n: "Milk, whole",  // name
  ms: [{  // measures
    s: "1 cup",  // serving
    n: { ca: 276, p: 7.7, ... }  // nutrients
  }]
}];
```

## Troubleshooting

### Memory Errors

Increase Node.js heap size:

```bash
node --max-old-space-size=4096 json-data-processor.cjs ...
```

### Missing Nutrients

- Check `usda-fdc-json-config.json` nutrient mapping
- Verify USDA JSON files contain the nutrient data
- Some foods legitimately don't have all nutrients

### File Size Too Large

- Use `--minimal` flag (strips metadata)
- Use `--minify` flag (compresses keys)
- Adjust filtering in food-curator step

### Invalid JSON Errors

- Verify download completed successfully
- Re-download the file
- Check for disk corruption

### Download Fails or Times Out

- Try downloading at a different time
- Use a download manager with resume support
- Check available disk space

## Expected Results

### Nutrient Coverage

| Nutrient | Coverage |
|----------|----------|
| Protein | 95%+ |
| Fiber | 90%+ |
| Calcium | 95%+ |
| Magnesium | 90%+ |
| Potassium | 90%+ |
| Iron | 90%+ |
| Zinc | 85%+ |
| Vitamin D | 60%+ |
| Vitamin B12 | 70%+ |
| Folate | 85%+ |

Lower coverage for vitamins is normal - not all foods are analyzed for all vitamins.

### Performance Benchmarks

| Step | Time | Output Size |
|------|------|-------------|
| JSON Processing | 2-5 min | 50-100 MB |
| ID Assignment | <1 min | ~same |
| Curation | <1 min | 10-30 MB |
| Module Generation | <1 min | 2-3 MB |
| **Total** | **5-10 min** | **2-3 MB final** |

## Updating the Database

When USDA releases new data:

1. Download latest USDA JSON files
2. Run pipeline with same `master-key-map.json`
3. Stable appIds are preserved for existing foods
4. New foods get new IDs
5. Test output thoroughly before deploying

## Scripts Reference

### Core Pipeline Scripts

- `json-data-processor.cjs` - Extract nutrients from USDA JSON
- `master-key-assigner-json.cjs` - Assign stable appIds
- `food-curator-nutrients.cjs` - Filter and deduplicate foods
- `data-module-generator-nutrients.cjs` - Generate production module
- `provenance-generator.cjs` - Generate source provenance data

### Legacy Scripts (Calcium-only)

The old CSV-based pipeline for calcium-only tracking:
- `master-key-assigner.cjs` - CSV version
- `food-curator.cjs` - Calcium-only version
- `data-module-generator.cjs` - Calcium-only version

Use the `-nutrients` versions for multi-nutrient support.

## Additional Resources

- **Parent README** - Main project documentation
- **NUTRIENT_MAPPING.md** - Complete nutrient reference (in `_notes/`)
- **USDA FDC** - https://fdc.nal.usda.gov/
- **FDC Downloads** - https://fdc.nal.usda.gov/download-datasets/
