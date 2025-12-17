# My Nutrients - Data Pipeline Guide

## Overview

This guide documents the complete data processing pipeline for My Nutrients v1.0, which extracts multi-nutrient data from USDA FoodData Central and generates an optimized application database.

## Pipeline Architecture

```
USDA JSON Files
    ↓
[1] json-data-processor.cjs         → Extract all nutrients from JSON
    ↓
combined-nutrient-data.json
    ↓
[2] master-key-assigner-json.cjs    → Assign stable appIds
    ↓
mastered-nutrient-data.json
    ↓
[3] food-curator-nutrients.cjs      → Filter and deduplicate
    ↓
curated-nutrients-abridged.json
    ↓
[4] data-module-generator-nutrients.cjs  → Generate app module
    ↓
foodDatabaseData.js (ready for app)
    ↓
[5] provenance-generator.cjs (optional)  → Generate source provenance
    ↓
provenance/*.json (food source details)
```

## Prerequisites

1. **Node.js**: Version 14 or higher
2. **Disk space**: ~5 GB for source files and processing
3. **Memory**: 4+ GB RAM recommended (for processing large JSON files)
4. **USDA Data Files**: See DATA_DOWNLOAD_GUIDE.md

## Step-by-Step Instructions

### Step 0: Download USDA Data

Follow the instructions in `DATA_DOWNLOAD_GUIDE.md` to download:
- Foundation Foods JSON (~30-40 MB uncompressed)
- SR Legacy JSON (~800 MB+ uncompressed)

Place the downloaded files in the `source_data/` directory.

### Step 1: Extract Multi-Nutrient Data

Process the USDA JSON files to extract all nutrient information:

```bash
cd source_data

node json-data-processor.cjs \
  --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
  --output combined-nutrient-data
```

**What this does:**
- Reads both Foundation and SR Legacy JSON files
- Extracts 20+ nutrients per food using nutrient mapping
- Calculates nutrient values for each portion/serving size
- Combines all foods into a single JSON file

**Output:**
- `combined-nutrient-data.json` (~50-100 MB)

**Expected time:** 2-5 minutes (depending on system)

### Step 2: Assign Stable App IDs

Assign permanent, stable IDs to each food for consistent references:

```bash
node master-key-assigner-json.cjs \
  --input combined-nutrient-data.json \
  --map master-key-map.json \
  --output mastered-nutrient-data.json
```

**What this does:**
- Assigns permanent appId to each food
- Creates/updates mapping file for future updates
- Preserves IDs across database regenerations

**Output:**
- `mastered-nutrient-data.json`
- `master-key-map.json` (updated)

**Expected time:** <1 minute

### Step 3: Curate and Filter

Apply filtering, deduplication, and quality checks:

```bash
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt \
  --exclude-list exclude-list.txt
```

**What this does:**
- Applies keep list (protected foods)
- Applies exclude list (filtered terms)
- Deduplicates measures within foods
- Removes foods with no valid measures
- Generates statistics on nutrient coverage

**Output:**
- `curated-nutrients-full.json` (complete data)
- `curated-nutrients-abridged.json` (optimized)

**Expected time:** <1 minute

### Step 4: Generate App Module

Create the production JavaScript module:

```bash
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module \
  --minify \
  --minimal
```

**What this does:**
- Converts JSON to JavaScript module
- Minifies keys to reduce bundle size
- Strips metadata (--minimal) for production
- Exports foodData array and helper functions

**Output:**
- `../src/lib/data/foodDatabaseData.js` (2-3 MB)

**Expected time:** <1 minute

### Step 5: Generate Provenance Data (Optional)

Create chunked JSON files for food source provenance:

```bash
node provenance-generator.cjs \
  curated-nutrients-abridged.json \
  mastered-nutrient-data.json \
  ../static/data/provenance
```

**What this does:**
- Uses **abridged curated data** to determine which foods are in the app
- Uses **mastered data** to retrieve full source details and collapsed food information
- Generates 20 chunked JSON files for efficient on-demand loading
- Enables the app to show users which USDA foods were combined into each app entry

**Output:**
- `../static/data/provenance/provenance_0.json` through `provenance_19.json`
- Each chunk contains provenance data for foods with matching appId % 20

**Expected time:** <1 minute

**Note:** This replaces the old static HTML documentation approach with dynamic JSON lookup.

### Step 6: Application Integration

The generated files are already in the correct locations:
- `src/lib/data/foodDatabaseData.js` - Main database
- `static/data/provenance/*.json` - Source provenance data (if generated)

The application will automatically load these files when needed.

## Complete Pipeline Command

Run all steps in sequence:

```bash
cd source_data

# Step 1: Extract nutrients
node json-data-processor.cjs \
  --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
  --output combined-nutrient-data

# Step 2: Assign IDs
node master-key-assigner-json.cjs \
  --input combined-nutrient-data.json \
  --map master-key-map.json \
  --output mastered-nutrient-data.json

# Step 3: Curate
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt \
  --exclude-list exclude-list.txt

# Step 4: Generate module
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module \
  --minify \
  --minimal

# Step 5 (Optional): Generate provenance data
node provenance-generator.cjs \
  curated-nutrients-abridged.json \
  mastered-nutrient-data.json \
  ../static/data/provenance

echo "✅ Pipeline complete! foodDatabaseData.js is ready."
```

## Configuration Files

### usda-fdc-json-config.json

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

Add or remove nutrients by editing this file.

### keep-list.txt

Foods to always include, even if they would be filtered out:

```
milk, whole
yogurt, plain
almonds
```

Uses normalized names (lowercase, simplified).

### exclude-list.txt

Terms to exclude from the database:

```
baby food
pet food
restaurant
```

Case-insensitive substring matching.

## Data Format

### Input (USDA JSON)

```json
{
  "FoundationFoods": [
    {
      "fdcId": 1234,
      "description": "Milk, whole",
      "foodNutrients": [
        {
          "nutrient": {"number": "301"},
          "amount": 276.0
        }
      ],
      "foodPortions": [
        {
          "value": 1.0,
          "measureUnit": {"name": "cup"},
          "gramWeight": 244.0
        }
      ]
    }
  ]
}
```

### Output (App Module)

```javascript
export const foodData = [
  {
    i: 1,  // id
    n: "Milk, whole",  // name
    ms: [  // measures
      {
        s: "1 cup",  // serving
        n: {  // nutrients
          ca: 276,  // calcium
          p: 7.7,   // protein
          ...
        }
      }
    ]
  }
];
```

## Troubleshooting

### Memory Errors

If Node.js runs out of memory:

```bash
# Increase heap size to 4GB
node --max-old-space-size=4096 json-data-processor.cjs ...
```

### Missing Nutrients

If some foods are missing nutrients:
- Check `usda-fdc-json-config.json` nutrient mapping
- Verify USDA JSON files contain the nutrient data
- Some foods legitimately don't have all nutrients

### File Size Too Large

To reduce bundle size:
- Use `--minimal` flag (strips metadata)
- Use `--minify` flag (compresses keys)
- Adjust filtering in food-curator step

### Invalid JSON Errors

If you get JSON parse errors:
- Verify download completed successfully
- Re-download the file
- Check for disk corruption

## Nutrient Coverage

Expected nutrient coverage in final database:

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

## Updating the Database

To update with new USDA data:

1. Download latest USDA JSON files
2. Run pipeline with same `master-key-map.json`
3. Stable appIds will be preserved
4. New foods get new IDs
5. Existing foods keep their IDs

## Performance Benchmarks

Typical processing times on modern hardware:

| Step | Time | Output Size |
|------|------|-------------|
| JSON Processing | 2-5 min | 50-100 MB |
| ID Assignment | <1 min | ~same |
| Curation | <1 min | 10-30 MB |
| Module Generation | <1 min | 2-3 MB |
| **Total** | **5-10 min** | **2-3 MB final** |

## Legacy CSV Pipeline

The old CSV-based pipeline (for calcium only) is still available:
- `master-key-assigner.cjs` (CSV version)
- `food-curator.cjs` (calcium-only)
- `data-module-generator.cjs` (calcium-only)

Use the `-nutrients` versions for multi-nutrient support.

## Migration

To migrate existing My Calcium backups to My Nutrients format:

```bash
node migrate-calcium-to-nutrients.cjs \
  --input calcium-backup-2025-12-01.json \
  --output nutrients-backup-2025-12-01.json
```

See migration script for details.

## Additional Resources

- **NUTRIENT_MAPPING.md** - Complete nutrient reference
- **DATA_DOWNLOAD_GUIDE.md** - USDA data download instructions
- **ARCHITECTURE.md** - Overall app architecture
- **USDA FDC Documentation** - https://fdc.nal.usda.gov/

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the documentation files
3. Check USDA FDC data format hasn't changed
4. Verify all dependencies are installed

## Change Log

- **2025-12-08**: Initial multi-nutrient pipeline documentation
- **2025-12-08**: Added JSON processing support
- **2025-12-08**: Created nutrient-specific scripts
