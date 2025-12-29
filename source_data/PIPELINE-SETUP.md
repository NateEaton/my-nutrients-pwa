# Foundation & SR Legacy Merger - Pipeline Setup Guide

## Overview

This enhanced pipeline merges USDA Foundation Foods with SR Legacy data to provide users with:
- **Most current nutrient data** (Foundation Foods, updated regularly)
- **Practical serving portions** from both data sources
- **RACC-based synthesized portions** for foods lacking measures
- **Full provenance tracking** showing data sources and merge decisions

## What's New

### New Pipeline Steps

```
USDA JSON Files (Foundation + SR Legacy)
    ↓
[1] json-data-processor.cjs → Extract nutrients from both sources
    ↓
[2] merge-foundation-sr-legacy.cjs → Merge Foundation + SR Legacy ⭐ NEW
    ↓
[3] synthesize-portions.cjs → Add RACC-based portions ⭐ NEW
    ↓
[4] master-key-assigner-json.cjs → Assign stable appIds
    ↓
[5] food-curator-nutrients.cjs → Filter & deduplicate
    ↓
[6] data-module-generator-nutrients.cjs → Generate app module
    ↓
[7] provenance-generator.cjs → Generate provenance data
    ↓
../src/lib/data/foodDatabaseData.js (ready for app)
```

### New Features

1. **Intelligent Source Merging**
   - Fuzzy name matching with Levenshtein distance
   - Nutrient similarity verification
   - Combines portions from both sources
   - Provenance tracking for transparency

2. **RACC-Based Portion Synthesis**
   - FDA reference amounts (21 CFR 101.12)
   - Category-specific defaults
   - Pattern matching for food types
   - Clearly marked as "synthesized"

3. **Enhanced Reporting**
   - `merge-report.json` - Details of Foundation/SR Legacy merges
   - `synthesis-report.json` - Portion synthesis statistics
   - Provenance metadata in final database

## Manual Data Download (Required)

⚠️ **The USDA website blocks automated downloads. You must download data files manually.**

### Step 1: Download Foundation Foods

1. Visit: https://fdc.nal.usda.gov/download-datasets.html
2. Scroll to **Foundation Foods**
3. Click **JSON** download button
4. Save the file (e.g., `FoodData_Central_foundation_food_json_2024-04-24.zip`)
5. Move the `.zip` file to the `source_data/` directory

### Step 2: Download SR Legacy

1. On the same page, scroll to **SR Legacy**
2. Click **JSON** download button
3. Save the file (e.g., `FoodData_Central_sr_legacy_food_json_2018-04.zip`)
4. Move the `.zip` file to the `source_data/` directory

### Step 3: Extract Files

```bash
cd source_data
unzip FoodData_Central_foundation_food_json_*.zip
unzip FoodData_Central_sr_legacy_food_json_*.zip
```

You should now have two large JSON files:
- `FoodData_Central_foundation_food_json_2024-04-24.json` (~30-40 MB)
- `FoodData_Central_sr_legacy_food_json_2018-04.json` (~800 MB+)

## Running the Pipeline

### Quick Start

```bash
cd source_data
./run-pipeline.sh
```

This runs all 7 steps automatically and generates:
- `../src/lib/data/foodDatabaseData.js` - Final optimized app database
- `merge-report.json` - Merge decisions and statistics
- `synthesis-report.json` - Portion synthesis details

### Manual Pipeline Run

If you prefer to run steps individually:

```bash
# Step 1: Extract nutrients
node json-data-processor.cjs \
  --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
  --output combined-nutrient-data

# Step 2: Merge sources
node merge-foundation-sr-legacy.cjs \
  combined-nutrient-data.json \
  merged-nutrient-data.json

# Step 3: Synthesize portions
node synthesize-portions.cjs \
  merged-nutrient-data.json \
  portioned-nutrient-data.json

# Step 4: Assign stable IDs
node master-key-assigner-json.cjs \
  --input portioned-nutrient-data.json \
  --map master-key-map.json \
  --output mastered-nutrient-data.json

# Step 5: Curate foods
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt

# Step 6: Generate app module
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal

# Step 7: Generate provenance (optional)
node provenance-generator.cjs \
  curated-nutrients-abridged.json \
  mastered-nutrient-data.json \
  ../static/data/provenance
```

## Expected Results

### Merge Report Example

```json
{
  "totalMerged": 456,
  "foundationOnlyCount": 123,
  "srLegacyOnlyCount": 7814,
  "merges": [
    {
      "foundationName": "Eggs, Grade A, Large, egg whole",
      "srLegacyName": "Egg, whole, raw, fresh",
      "confidence": 0.92,
      "nameSimilarity": 0.88,
      "nutrientSimilarity": 0.96
    }
  ]
}
```

### Synthesis Report Example

```json
{
  "synthesizedCount": 234,
  "alreadyHadPortions": 3456,
  "synthesizedByReason": {
    "no_measures": 45,
    "100g_only": 189
  },
  "synthesizedByMatchType": {
    "pattern": 178,
    "category_default": 45,
    "fallback": 11
  }
}
```

## Troubleshooting

### Issue: "USDA data files not found"

**Solution:** Download files manually (see above) and extract them to `source_data/`.

### Issue: Merge confidence seems low

**Solution:** Adjust thresholds in `merge-foundation-sr-legacy.cjs`:

```bash
node merge-foundation-sr-legacy.cjs \
  combined-nutrient-data.json \
  merged-nutrient-data.json \
  --name-threshold 0.80 \
  --nutrient-threshold 0.85
```

### Issue: Too many synthesized portions

**Solution:** This is expected. Many Foundation foods only have 100g measures. Review `synthesis-report.json` to see which foods got synthesized portions.

### Issue: Pipeline runs slowly

**Solution:** The SR Legacy file is large (~800 MB). Expected runtime:
- Steps 1-3: 2-5 minutes
- Steps 4-7: 3-5 minutes
- Total: ~10 minutes on modern hardware

## Testing the Results

1. **Check the database file:**
   ```bash
   ls -lh ../src/lib/data/foodDatabaseData.js
   # Should be 2-5 MB
   ```

2. **Review merge decisions:**
   ```bash
   node -e "const r = require('./merge-report.json'); console.log('Merged:', r.totalMerged); console.log('Foundation only:', r.foundationOnlyCount);"
   ```

3. **Test in the app:**
   ```bash
   cd ..
   npm run dev
   ```

   Search for:
   - "egg" - Should see Foundation version with multiple portions
   - "flaxseed" - Should see both whole and ground variants
   - "milk" - Should see Foundation version with "1 cup" measure

## RACC Table Customization

The RACC table (`racc-table.json`) can be customized to better match your users' needs:

```json
{
  "categories": {
    "Dairy and Egg Products": {
      "patterns": {
        "egg": {
          "racc_grams": 50,
          "portion": "1 large egg"
        }
      }
    }
  }
}
```

Add patterns for specific foods or adjust portion sizes as needed.

## Files Created

| File | Size | Purpose |
|------|------|---------|
| `combined-nutrient-data.json` | ~200 MB | Raw extraction from USDA |
| `merged-nutrient-data.json` | ~180 MB | After Foundation/SR Legacy merge |
| `portioned-nutrient-data.json` | ~190 MB | After portion synthesis |
| `mastered-nutrient-data.json` | ~200 MB | With stable appIds |
| `curated-nutrients-abridged.json` | ~50 MB | After filtering/deduplication |
| `foodDatabaseData.js` | 2-5 MB | Final optimized module |
| `merge-report.json` | <1 MB | Merge statistics |
| `synthesis-report.json` | <1 MB | Synthesis statistics |

## Architecture Benefits

1. **Data Currency**
   - Foundation Foods updated regularly by USDA
   - SR Legacy provides backward compatibility
   - Automatic prioritization of Foundation data

2. **User Experience**
   - Practical serving sizes (cups, tablespoons, pieces)
   - RACC-based estimates when needed
   - Transparent provenance ("Foundation" vs "SR Legacy" badges)

3. **Maintainability**
   - Clear separation of concerns
   - Provenance tracking for debugging
   - Reproducible pipeline

## Next Steps

1. Download USDA data files manually
2. Run `./run-pipeline.sh`
3. Review `merge-report.json` and `synthesis-report.json`
4. Test the app with `npm run dev`
5. Commit `foodDatabaseData.js` and reports to git

## Support

For questions or issues:
- Review `merge-report.json` for merge decisions
- Check `synthesis-report.json` for portion additions
- Adjust thresholds in merge/synthesis scripts as needed
- See main README.md for general pipeline documentation
