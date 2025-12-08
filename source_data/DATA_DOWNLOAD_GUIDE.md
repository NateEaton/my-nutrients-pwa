# USDA FoodData Central Data Download Guide

## Overview

For the My Nutrients application, we use JSON format files from USDA FoodData Central which contain complete nutrient information for all tracked nutrients (20+ nutrients including vitamins, minerals, macronutrients, and omega fatty acids).

## Required Files

Download the following two files from the [USDA FoodData Central Download Page](https://fdc.nal.usda.gov/download-datasets.html):

### 1. Foundation Foods (JSON)

**File**: `FoodData_Central_foundation_food_json_YYYY-MM-DD.zip`

- **Size**: ~6-7 MB compressed, ~30-40 MB uncompressed
- **Format**: JSON
- **Content**: Foundation Foods with complete nutrient profiles
- **Latest URL**: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-04-24.zip

### 2. SR Legacy Foods (JSON)

**File**: `FoodData_Central_sr_legacy_food_json_2018-04.zip`

- **Size**: ~200 MB compressed, ~800 MB+ uncompressed
- **Format**: JSON
- **Content**: SR Legacy Foods (older but comprehensive dataset)
- **Latest URL**: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip

## Download Steps

### Manual Download

1. Visit https://fdc.nal.usda.gov/download-datasets.html
2. Scroll to "Download Data" section
3. Find "Foundation Foods" and click the JSON download link
4. Find "SR Legacy" and click the JSON download link
5. Unzip both files in the `source_data/` directory

### Command Line Download (macOS/Linux)

```bash
cd source_data

# Download Foundation Foods JSON
curl -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-04-24.zip
unzip FoodData_Central_foundation_food_json_2024-04-24.zip

# Download SR Legacy JSON
curl -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
unzip FoodData_Central_sr_legacy_food_json_2018-04.zip
```

### Command Line Download (Windows PowerShell)

```powershell
cd source_data

# Download Foundation Foods JSON
Invoke-WebRequest -Uri "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-04-24.zip" -OutFile "foundation.zip"
Expand-Archive -Path foundation.zip -DestinationPath .

# Download SR Legacy JSON
Invoke-WebRequest -Uri "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip" -OutFile "srlegacy.zip"
Expand-Archive -Path srlegacy.zip -DestinationPath .
```

## Expected File Structure

After downloading and unzipping, you should have:

```
source_data/
├── FoodData_Central_foundation_food_json_2024-04-24.json  (~30-40 MB)
├── FoodData_Central_sr_legacy_food_json_2018-04.json      (~800 MB+)
└── ...other files
```

## JSON File Structure

Both JSON files follow this structure:

```json
{
  "FoundationFoods": [...]  // or "SRLegacyFoods"
}
```

Each food object contains:
- `fdcId`: Unique identifier
- `description`: Food name
- `foodNutrients`: Array of all nutrients (per 100g)
- `foodPortions`: Array of serving size options

## Next Steps

After downloading the data files:

1. **Process the JSON data**: Run the JSON data processor
   ```bash
   node json-data-processor.cjs \
     --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
     --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
     --output combined-nutrient-data
   ```

2. **Continue with the pipeline**: Follow the main README.md for the next steps (master-key-assigner, food-curator, etc.)

## File Size Warnings

**Important**: The SR Legacy JSON file is very large (~800 MB uncompressed). Processing it may take several minutes and require adequate memory (2+ GB RAM recommended).

If you encounter memory issues:
- Process Foundation Foods only for testing
- Increase Node.js heap size: `node --max-old-space-size=4096 json-data-processor.cjs ...`
- Process files separately and combine results

## Verify Downloads

After downloading, verify the files:

```bash
# Check file sizes
ls -lh FoodData_Central*.json

# Check JSON validity (first few lines)
head -20 FoodData_Central_foundation_food_json_2024-04-24.json
```

You should see valid JSON starting with `{"FoundationFoods":[` or `{"SRLegacyFoods":[`.

## Troubleshooting

### Download fails or times out
- Try downloading at a different time of day
- Use a download manager that supports resume
- Download from a mirror site if available

### Unzip fails with "corrupted file" error
- Re-download the file
- Verify the file size matches the expected size
- Try a different unzip utility

### JSON file is empty or invalid
- Re-download the file
- Check available disk space
- Verify the download completed successfully

## Version Notes

The implementation plan specifies:
- **Foundation Foods**: Latest version (2024-04-24 as of Dec 2025)
- **SR Legacy**: 2018-04 version (stable, widely used)

Always check the USDA website for the most current available versions, but note that the JSON structure should remain consistent.
