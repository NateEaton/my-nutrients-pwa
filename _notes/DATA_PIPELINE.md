# My Nutrients - Data Pipeline Guide

**Version**: 1.1.0
**Last Updated**: December 8, 2025

---

## Overview

This guide documents the data processing pipeline for generating the multi-nutrient food database from USDA FDC JSON files.

**Data Source**: USDA FoodData Central JSON files (Foundation Foods + SR Legacy)

**Processing Approach**:
- Parse nested JSON structure
- Extract nutrients per 100g from `foodNutrients` array
- Calculate nutrients for each serving from `foodPortions` array
- Generate optimized JavaScript module for app

## Pipeline Stages

```
USDA JSON Downloads (Foundation + SR Legacy)
    ↓
JSON Parsing & Nutrient Extraction
    ↓
Portion-Based Nutrient Calculation
    ↓
Master Key Assignment (stable appIds)
    ↓
Food Curation (filtering, measures)
    ↓
Data Module Generation (minified JS)
    ↓
Application Bundle (2-3MB)
```

---

## Prerequisites

1. Node.js ≥18.0.0
2. USDA FDC JSON files downloaded (Foundation + SR Legacy)
3. JSON parsing script created (`source_data/json-parser.cjs`)
4. Existing `source_data/` pipeline scripts (master-key-assigner, food-curator, etc.)

---

## Step-by-Step Process

### Step 1: Download USDA Data

**Source**: https://fdc.nal.usda.gov/download-datasets/

**Files to download**:

1. **Foundation Foods (JSON)**
   - Zip file: `FoodData_Central_foundation_food_json_2025-04-24.zip` (452KB)
   - Unzipped: `FoodData_Central_foundation_food_json_2025-04-24.json` (6.3MB)
   - Foods: ~600 foundation foods with detailed nutrient data

2. **SR Legacy Foods (JSON)**
   - Zip file: `FoodData_Central_sr_legacy_food_json_2018-04.zip` (13MB)
   - Unzipped: `FoodData_Central_sr_legacy_food_json_2018-04.json` (201MB)
   - Foods: ~8,000 legacy USDA SR foods

**Extract files**:
```bash
cd source_data
unzip FoodData_Central_foundation_food_json_2025-04-24.zip
unzip FoodData_Central_sr_legacy_food_json_2018-04.zip
```

---

### Step 2: Create JSON Parser Script

**New file**: `source_data/json-parser.cjs`

**Purpose**: Extract foods with all nutrients and portions from JSON files

**Nutrient Code Mapping**:
```javascript
const NUTRIENT_MAP = {
  // Macronutrients
  '203': 'protein',
  '291': 'fiber',
  '205': 'carbohydrates',
  '269': 'sugars',
  '204': 'fat',
  '606': 'saturatedFat',
  '645': 'monounsaturatedFat',
  '646': 'polyunsaturatedFat',

  // Omega fatty acids
  '851': 'omega3ALA',    // α-linolenic acid
  '629': 'omega3EPA',    // Eicosapentaenoic acid
  '621': 'omega3DHA',    // Docosahexaenoic acid
  '675': 'omega6',       // Linoleic acid

  // Minerals
  '301': 'calcium',
  '304': 'magnesium',
  '306': 'potassium',
  '303': 'iron',
  '309': 'zinc',

  // Vitamins
  '328': 'vitaminD',     // mcg (prefer this over IU code 324)
  '418': 'vitaminB12',
  '435': 'folate',       // DFE
  '415': 'vitaminB6',
  '320': 'vitaminA',     // RAE (prefer this over IU code 319)
  '401': 'vitaminC',
  '430': 'vitaminK'
};
```

**Processing Logic**:
```javascript
// 1. Parse JSON file
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const foods = data.FoundationFoods || data.SRLegacyFoods;

// 2. For each food:
const output = foods.map(food => {
  // Extract nutrients per 100g
  const nutrientsPer100g = {};
  for (const nutrientData of food.foodNutrients || []) {
    const code = nutrientData.nutrient.number;
    if (NUTRIENT_MAP[code]) {
      nutrientsPer100g[NUTRIENT_MAP[code]] = nutrientData.amount || 0;
    }
  }

  // Calculate nutrients for each portion
  const measures = (food.foodPortions || []).map(portion => {
    const nutrients = {};
    const ratio = portion.gramWeight / 100;

    for (const [key, valuePer100g] of Object.entries(nutrientsPer100g)) {
      nutrients[key] = valuePer100g * ratio;
    }

    return {
      qty: portion.value,
      label: portion.measureUnit.name,
      grams: portion.gramWeight,
      modifier: portion.modifier || '',
      nutrients
    };
  });

  // Add default 100g measure if no portions exist
  if (measures.length === 0) {
    measures.push({
      qty: 100,
      label: 'g',
      grams: 100,
      modifier: '',
      nutrients: nutrientsPer100g
    });
  }

  return {
    id: food.fdcId,
    name: food.description,
    measures
  };
});

// 3. Write output
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
```

**Expected Output Format**:
```json
[
  {
    "id": 1750337,
    "name": "Hummus, commercial",
    "measures": [
      {
        "qty": 2.0,
        "label": "tablespoon",
        "grams": 33.9,
        "modifier": "",
        "nutrients": {
          "protein": 2.49,
          "fiber": 1.83,
          "calcium": 49.1,
          "magnesium": 24.1,
          "iron": 0.82,
          "vitaminB6": 0.048,
          "folate": 12.2,
          "vitaminC": 0.0
        }
      },
      {
        "qty": 1.0,
        "label": "cup",
        "grams": 246.0,
        "modifier": "",
        "nutrients": {
          "protein": 18.1,
          "fiber": 13.3,
          "calcium": 356,
          // ... more nutrients
        }
      }
    ]
  }
]
```

---

### Step 3: Process JSON Files

**Run parser on both datasets**:

```bash
cd source_data

# Process Foundation Foods
node json-parser.cjs \
  FoodData_Central_foundation_food_json_2025-04-24.json \
  foundation-parsed.json

# Process SR Legacy Foods
node json-parser.cjs \
  FoodData_Central_sr_legacy_food_json_2018-04.json \
  sr-legacy-parsed.json

# Combine into single file
cat foundation-parsed.json sr-legacy-parsed.json | \
  jq -s '.[0] + .[1]' > combined-foods.json
```

**Validation**:
```bash
# Check food count
cat combined-foods.json | jq '. | length'
# Expected: 4000-8000 foods

# Inspect first food
cat combined-foods.json | jq '.[0]'

# Check nutrients are present
cat combined-foods.json | jq '.[0].measures[0].nutrients | keys'
# Should show: ["calcium", "fiber", "protein", ...]
```

---

### Step 4: Run Existing Pipeline

Use existing `source_data/` scripts to finalize database:

```bash
cd source_data

# Step 1: Assign stable appIds (preserves IDs across updates)
node master-key-assigner.cjs combined-foods.json mastered-data.json \
  --id-field id \
  --map-file appid-mapping.json \
  --output-map appid-mapping-updated.json

# Step 2: Curate foods (filter, clean)
node food-curator.cjs mastered-data.json curated-data.json \
  --keep-list keep-list.txt \
  --exclude-list exclude-list.txt

# Step 3: Generate minified data module
node data-module-generator.cjs curated-data.json foodDatabaseData.js \
  --module --minify --minimal

# Step 4: Move to app
cp foodDatabaseData.js ../src/lib/data/

# Step 5 (Optional): Generate docs
node html-docs-generator.cjs curated-data.json ../static/database-docs.html
```

---

## Output Validation

### Check Database Size

```bash
ls -lh src/lib/data/foodDatabaseData.js
# Expected: 2-3MB (minified)
```

### Check Food Count

```bash
grep -o '"id":' src/lib/data/foodDatabaseData.js | wc -l
# Expected: 3,500-4,000 curated foods
```

### Spot-Check Nutrients

Open browser console in dev environment:

```javascript
import { getFoodDatabase } from '$lib/data/foodDatabase.js';
const db = await getFoodDatabase();

// Check a known food
const milk = db.find(f => f.name.toLowerCase().includes('milk, whole'));
console.log(milk);

// Verify multi-nutrient data
const measure = milk.measures[0];
console.log(measure.nutrients);
// Should show: { protein: X, calcium: Y, vitaminD: Z, fiber: ..., etc. }

// Verify all target nutrients are present
const expectedNutrients = [
  'protein', 'fiber', 'calcium', 'magnesium', 'potassium', 'iron', 'zinc',
  'vitaminD', 'vitaminB12', 'folate', 'vitaminB6', 'vitaminA', 'vitaminC', 'vitaminK'
];
const missingNutrients = expectedNutrients.filter(n => !(n in measure.nutrients));
console.log('Missing nutrients:', missingNutrients);
// Should be empty or minimal (some foods naturally lack certain nutrients)
```

---

## Troubleshooting

### Issue: "Cannot find module 'json-parser.cjs'"
- **Cause**: Script not created yet
- **Fix**: Create script from Step 2 template

### Issue: "No nutrients in output"
- **Cause**: Nutrient mapping incorrect
- **Fix**: Verify `NUTRIENT_MAP` codes match JSON `nutrient.number` values
- **Debug**: Print `food.foodNutrients[0].nutrient.number` to see actual codes

### Issue: "No foodPortions found"
- **Cause**: Some foods don't have portion data
- **Fix**: Parser should add default 100g measure (see Step 2 code)

### Issue: "Database too large (>5MB)"
- **Cause**: Too many foods or not minified
- **Fix**:
  - Check `--minify` flag in data-module-generator
  - Review `keep-list.txt` and `exclude-list.txt` for curation
  - Ensure only essential foods are included

### Issue: "Nutrient values seem wrong"
- **Cause**: Calculation error or missing `/100` division
- **Fix**: Verify: `nutrient_per_portion = nutrient_per_100g * (gramWeight / 100)`
- **Debug**:
  ```javascript
  // Protein per 100g should be ~7.35g for hummus
  // Protein per 2 tbsp (33.9g) should be ~2.49g
  console.log(7.35 * (33.9 / 100)); // Should equal ~2.49
  ```

---

## Updating Database

When USDA releases new data:

1. Download new JSON files (Foundation + SR Legacy)
2. Run JSON parser (Step 3)
3. Run pipeline with same scripts (Step 4)
4. `appid-mapping.json` preserves stable IDs for unchanged foods
5. Test output thoroughly before deploying
6. Update app version in `package.json`
7. Commit changes and deploy

---

## Next Steps After Pipeline

Once database is generated:

1. **Update foodDatabase.js service** to handle multi-nutrient structure
2. **Test search functionality** with new database
3. **Verify nutrient calculations** in journal entries
4. **Update UI components** to display selected nutrients
5. **Run integration tests** with real food data

See `IMPLEMENTATION_PLAN.md` Phase 1 for details.

---

## References

- **USDA FDC**: https://fdc.nal.usda.gov/
- **FDC Download Page**: https://fdc.nal.usda.gov/download-datasets/
- **JSON API Docs**: https://fdc.nal.usda.gov/api-guide.html
- **Nutrient Codes**: See `NUTRIENT_MAPPING.md`
- **Pipeline Scripts**: `/source_data/README.md` (existing scripts)
