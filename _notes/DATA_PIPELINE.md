# My Nutrients - Data Pipeline Guide

**Version**: 1.0.0
**Last Updated**: December 2025

---

## Overview

This guide documents the data processing pipeline for generating the multi-nutrient food database from USDA FDC CSV files.

## Pipeline Stages

```
USDA CSV Downloads
    ↓
Combined CSV (Foundation + SR Legacy)
    ↓
Master Key Assignment (stable appIds)
    ↓
Food Curation (filtering, measures)
    ↓
Data Module Generation (minified JS)
    ↓
Application Bundle
```

---

## Prerequisites

1. Node.js ≥18.0.0
2. USDA FDC CSV files downloaded
3. `source_data/` scripts configured

---

## Step-by-Step Process

### Step 1: Download USDA Data

**Source**: https://fdc.nal.usda.gov/download-datasets/

**Files needed**:
- Foundation Foods (CSV)
- SR Legacy Foods (CSV)

**Size**: ~500MB + ~200MB

**TODO**: Document exact filenames after download

---

### Step 2: Combine CSV Files

**macOS/Linux**:
```bash
cd source_data
cat "Foundation_Foods.csv" "SR_Legacy_Foods.csv" | grep -v '"Data Type"' > combined_input.csv
```

**Windows**:
```bash
cd source_data
type "Foundation_Foods.csv" "SR_Legacy_Foods.csv" | findstr /v /c:"\"Data Type\"" > combined_input.csv
```

**Validation**:
```bash
wc -l combined_input.csv  # Should be 100k+ lines
head -n 1 combined_input.csv  # Check header row
```

---

### Step 3: Update Configuration

**File**: `source_data/usda-fdc-config.json`

**Add nutrient column mappings**:

```json
{
  "sourceName": "usda-fdc",
  "sourceIdColumn": "fdcId",
  "columnMapping": {
    "foodDescription": "name",
    "[PROTEIN_COLUMN]": "protein",
    "[FIBER_COLUMN]": "fiber",
    "[CALCIUM_COLUMN]": "calcium",
    "[MAGNESIUM_COLUMN]": "magnesium",
    "[POTASSIUM_COLUMN]": "potassium",
    "[IRON_COLUMN]": "iron",
    "[ZINC_COLUMN]": "zinc",
    "[VITAMIND_COLUMN]": "vitaminD",
    "[VITAMINB12_COLUMN]": "vitaminB12",
    "[FOLATE_COLUMN]": "folate",
    "[VITAMINB6_COLUMN]": "vitaminB6",
    "[VITAMINA_COLUMN]": "vitaminA",
    "[VITAMINC_COLUMN]": "vitaminC",
    "[VITAMINK_COLUMN]": "vitaminK",
    "[OMEGA3_COLUMN]": "omega3",
    "[OMEGA6_COLUMN]": "omega6",
    "[CARBS_COLUMN]": "carbohydrates",
    "[SUGARS_COLUMN]": "sugars",
    "[FAT_COLUMN]": "fat",
    "[SATURATED_FAT_COLUMN]": "saturatedFat"
  },
  "dataTypeMapping": {
    "protein": "float",
    "fiber": "float",
    "calcium": "float",
    ...
  }
}
```

**TODO**: Replace [PLACEHOLDER] values with actual CSV column names

---

### Step 4: Run Data Pipeline

**Command sequence**:

```bash
cd source_data

# Step 1: Assign stable appIds
node master-key-assigner.cjs combined_input.csv mastered-data \
  --config usda-fdc-config.json \
  --map-file appid-mapping.json \
  --output-map appid-mapping-updated.json

# Step 2: Curate data
node food-curator.cjs mastered-data.json curated-data \
  --keep-list keep-list.txt \
  --exclude-list exclude-list.txt

# Step 3: Generate app module
node data-module-generator.cjs curated-data-abridged.json foodDatabaseData.js \
  --module --minify --minimal

# Step 4: Move to app
mv foodDatabaseData.js ../src/lib/data/

# Step 5: Generate docs (optional)
node html-docs-generator.cjs curated-data-abridged.json static/database-docs.html
```

---

## Output Validation

### Check Database Size

```bash
ls -lh src/lib/data/foodDatabaseData.js
# Expected: 2-3MB
```

### Check Food Count

```bash
grep -o '"id":' src/lib/data/foodDatabaseData.js | wc -l
# Expected: ~3,800
```

### Spot-Check Nutrients

Load in browser console:
```javascript
import { getFoodDatabase } from '$lib/data/foodDatabase.js';
const db = await getFoodDatabase();

// Check a known food
const milk = db.find(f => f.name.includes('Milk, whole'));
console.log(milk.measures[0].nutrients);
// Should show: { calcium: 276, protein: 7.7, vitaminD: 2.5, ... }
```

---

## Troubleshooting

### Issue: "Column not found"
- **Cause**: Column name mismatch in config
- **Fix**: Check CSV header, update config

### Issue: "No nutrients in output"
- **Cause**: Column mapping incorrect
- **Fix**: Verify dataTypeMapping in config

### Issue: "Database too large (>5MB)"
- **Cause**: Too many foods or not minified
- **Fix**: Check --minify flag, review keep/exclude lists

---

## Updating Database

When USDA releases new data:

1. Download new CSV files
2. Run pipeline with same config
3. `appid-mapping.json` preserves stable IDs
4. Test output before deploying
5. Update app version

---

## References

- Pipeline README: `/source_data/README.md`
- Config file: `/source_data/usda-fdc-config.json`
- USDA FDC: https://fdc.nal.usda.gov/
