# My Nutrients - Nutrient Mapping Reference

**Version**: 1.0.0
**Last Updated**: December 2025

---

## Overview

This document provides the complete reference for all nutrients tracked in My Nutrients, including:
- USDA FDC nutrient codes
- Units of measurement
- Default goals (RDA values for seniors 65+)
- CSV column mappings
- TypeScript property names

---

## Nutrient Reference Table

### Macronutrients

| Nutrient | USDA Code | Property Name | Unit | Default Goal | Notes |
|----------|-----------|---------------|------|--------------|-------|
| Protein | 203 | `protein` | g | 60 | RDA for seniors |
| Total Dietary Fiber | 291 | `fiber` | g | 25 | |
| Carbohydrates | 205 | `carbohydrates` | g | 130 | |
| Sugars, total | 269 | `sugars` | g | 50 | Max recommended |
| Total lipid (fat) | 204 | `fat` | g | 65 | |
| Saturated fat | 606 | `saturatedFat` | g | 20 | Max recommended |
| Monounsaturated fat | 645 | `monounsaturatedFat` | g | - | Optional tracking |
| Polyunsaturated fat | 646 | `polyunsaturatedFat` | g | - | Optional tracking |

### Omega Fatty Acids

| Nutrient | USDA Code | Property Name | Unit | Default Goal | Notes |
|----------|-----------|---------------|------|--------------|-------|
| Omega-3 (ALA) | 851 | `omega3ALA` | g | 1.6 | α-linolenic acid |
| Omega-3 (EPA) | 629 | `omega3EPA` | g | 0.25 | Eicosapentaenoic acid |
| Omega-3 (DHA) | 621 | `omega3DHA` | g | 0.25 | Docosahexaenoic acid |
| Omega-6 | 675 | `omega6` | g | 14 | Linoleic acid |

**Aggregation**: For UI display, can show combined omega-3 as `omega3ALA + omega3EPA + omega3DHA`

### Minerals

| Nutrient | USDA Code | Property Name | Unit | Default Goal | Notes |
|----------|-----------|---------------|------|--------------|-------|
| Calcium, Ca | 301 | `calcium` | mg | 1200 | Seniors 51+ |
| Magnesium, Mg | 304 | `magnesium` | mg | 420 (M) / 320 (F) | |
| Potassium, K | 306 | `potassium` | mg | 3400 | |
| Iron, Fe | 303 | `iron` | mg | 8 | |
| Zinc, Zn | 309 | `zinc` | mg | 11 (M) / 8 (F) | |

### Vitamins

| Nutrient | USDA Code | Property Name | Unit | Default Goal | Notes |
|----------|-----------|---------------|------|--------------|-------|
| Vitamin D (D2 + D3) | 328 | `vitaminD` | mcg | 20 | Seniors 71+; also available as IU (code 324) |
| Vitamin B-12 | 418 | `vitaminB12` | mcg | 2.4 | |
| Folate, DFE | 435 | `folate` | mcg DFE | 400 | Dietary Folate Equivalents |
| Vitamin B-6 | 415 | `vitaminB6` | mg | 1.7 | |
| Vitamin A, RAE | 320 | `vitaminA` | mcg RAE | 900 (M) / 700 (F) | Retinol Activity Equivalents |
| Vitamin C | 401 | `vitaminC` | mg | 90 (M) / 75 (F) | |
| Vitamin K | 430 | `vitaminK` | mcg | 120 (M) / 90 (F) | |

---

## CSV Column Mapping

**IMPORTANT**: This section will be updated once USDA FDC CSV files are downloaded and inspected.

### Expected CSV Format

USDA FDC CSV files typically have columns like:

```
fdcId, foodDescription, nutrientId, nutrientName, nutrientValue, nutrientUnit, ...
```

### Column Mapping Configuration

To be added to `source_data/usda-fdc-config.json`:

```json
{
  "sourceName": "usda-fdc",
  "sourceIdColumn": "fdcId",
  "columnMapping": {
    "foodDescription": "name",

    "PLACEHOLDER_protein_column": "protein",
    "PLACEHOLDER_fiber_column": "fiber",
    "PLACEHOLDER_calcium_column": "calcium",
    "PLACEHOLDER_magnesium_column": "magnesium",
    "PLACEHOLDER_potassium_column": "potassium",
    "PLACEHOLDER_iron_column": "iron",
    "PLACEHOLDER_zinc_column": "zinc",
    "PLACEHOLDER_vitaminD_column": "vitaminD",
    "PLACEHOLDER_vitaminB12_column": "vitaminB12",
    "PLACEHOLDER_folate_column": "folate",
    "PLACEHOLDER_vitaminB6_column": "vitaminB6",
    "PLACEHOLDER_vitaminA_column": "vitaminA",
    "PLACEHOLDER_vitaminC_column": "vitaminC",
    "PLACEHOLDER_vitaminK_column": "vitaminK",
    "PLACEHOLDER_omega3_column": "omega3",
    "PLACEHOLDER_omega6_column": "omega6",
    "PLACEHOLDER_carbs_column": "carbohydrates",
    "PLACEHOLDER_sugars_column": "sugars",
    "PLACEHOLDER_fat_column": "fat",
    "PLACEHOLDER_saturatedFat_column": "saturatedFat"
  },
  "dataTypeMapping": {
    "protein": "float",
    "fiber": "float",
    "calcium": "float",
    "magnesium": "float",
    "potassium": "float",
    "iron": "float",
    "zinc": "float",
    "vitaminD": "float",
    "vitaminB12": "float",
    "folate": "float",
    "vitaminB6": "float",
    "vitaminA": "float",
    "vitaminC": "float",
    "vitaminK": "float",
    "omega3": "float",
    "omega6": "float",
    "carbohydrates": "float",
    "sugars": "float",
    "fat": "float",
    "saturatedFat": "float"
  }
}
```

**TODO**: Replace PLACEHOLDER values with actual CSV column names after download.

---

## FDC API Nutrient Extraction

For Smart Scan barcode lookups via USDA FoodData Central API:

```typescript
// Map USDA nutrient IDs to our property names
const NUTRIENT_MAP: Record<string, string> = {
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
  '851': 'omega3ALA',
  '629': 'omega3EPA',
  '621': 'omega3DHA',
  '675': 'omega6',

  // Minerals
  '301': 'calcium',
  '304': 'magnesium',
  '306': 'potassium',
  '303': 'iron',
  '309': 'zinc',

  // Vitamins
  '328': 'vitaminD',      // mcg
  '324': 'vitaminD_IU',   // IU (convert if needed)
  '418': 'vitaminB12',
  '435': 'folate',        // DFE
  '415': 'vitaminB6',
  '320': 'vitaminA',      // RAE
  '319': 'vitaminA_IU',   // IU (convert if needed)
  '401': 'vitaminC',
  '430': 'vitaminK'
};

// Extract nutrients from FDC API response
function extractNutrients(product: FDCProduct): NutrientValues {
  const nutrients: NutrientValues = {};

  for (const [nutrientId, propertyName] of Object.entries(NUTRIENT_MAP)) {
    const nutrient = product.foodNutrients?.find(
      n => n.nutrientNumber === nutrientId || n.nutrientId === parseInt(nutrientId)
    );

    if (nutrient?.value) {
      nutrients[propertyName] = parseFloat(nutrient.value);
    }
  }

  // Special handling: Aggregate omega-3 sources if needed
  if (nutrients.omega3ALA || nutrients.omega3EPA || nutrients.omega3DHA) {
    nutrients.omega3 = (nutrients.omega3ALA || 0) +
                       (nutrients.omega3EPA || 0) +
                       (nutrients.omega3DHA || 0);
  }

  return nutrients;
}
```

---

## TypeScript Interface

```typescript
/**
 * All nutrient values in standard units
 * Macros in grams (g), micros in mg/mcg as specified
 */
export interface NutrientValues {
  // Macronutrients (g)
  protein?: number;
  fiber?: number;
  carbohydrates?: number;
  sugars?: number;
  fat?: number;
  saturatedFat?: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;

  // Omega fatty acids (g)
  omega3?: number;          // Combined (ALA + EPA + DHA)
  omega3ALA?: number;       // α-linolenic acid
  omega3EPA?: number;       // Eicosapentaenoic acid
  omega3DHA?: number;       // Docosahexaenoic acid
  omega6?: number;          // Linoleic acid

  // Minerals (mg)
  calcium?: number;
  magnesium?: number;
  potassium?: number;
  iron?: number;
  zinc?: number;

  // Vitamins (varies)
  vitaminD?: number;        // mcg
  vitaminB12?: number;      // mcg
  folate?: number;          // mcg DFE
  vitaminB6?: number;       // mg
  vitaminA?: number;        // mcg RAE
  vitaminC?: number;        // mg
  vitaminK?: number;        // mcg
}
```

---

## Default Goals (RDA for Seniors)

Based on Dietary Reference Intakes (DRIs) for adults 65+:

```typescript
export const DEFAULT_NUTRIENT_GOALS: Record<string, number> = {
  // Macronutrients
  protein: 60,              // g/day (higher for seniors to prevent sarcopenia)
  fiber: 25,                // g/day
  carbohydrates: 130,       // g/day (minimum)
  sugars: 50,               // g/day (max recommended, <10% calories)
  fat: 65,                  // g/day (based on 2000 kcal diet)
  saturatedFat: 20,         // g/day (max, <10% calories)

  // Omega fatty acids
  omega3: 1.6,              // g/day (combined ALA+EPA+DHA)
  omega6: 14,               // g/day

  // Minerals
  calcium: 1200,            // mg/day (men & women 51+)
  magnesium: 420,           // mg/day (men), 320 (women)
  potassium: 3400,          // mg/day
  iron: 8,                  // mg/day (post-menopausal)
  zinc: 11,                 // mg/day (men), 8 (women)

  // Vitamins
  vitaminD: 20,             // mcg/day (71+, higher for bone health)
  vitaminB12: 2.4,          // mcg/day
  folate: 400,              // mcg DFE/day
  vitaminB6: 1.7,           // mg/day
  vitaminA: 900,            // mcg RAE/day (men), 700 (women)
  vitaminC: 90,             // mg/day (men), 75 (women)
  vitaminK: 120             // mcg/day (men), 90 (women)
};
```

**Note**: Some goals differ by gender. For v1.0, we use the higher value as default. Future versions could add gender-based customization.

---

## UI Display Configuration

### Nutrient Labels

```typescript
export const NUTRIENT_LABELS: Record<string, string> = {
  protein: 'Protein',
  fiber: 'Fiber',
  calcium: 'Calcium',
  magnesium: 'Magnesium',
  potassium: 'Potassium',
  iron: 'Iron',
  zinc: 'Zinc',
  vitaminD: 'Vitamin D',
  vitaminB12: 'Vitamin B12',
  folate: 'Folate',
  vitaminB6: 'Vitamin B6',
  vitaminA: 'Vitamin A',
  vitaminC: 'Vitamin C',
  vitaminK: 'Vitamin K',
  omega3: 'Omega-3',
  omega6: 'Omega-6',
  carbohydrates: 'Carbohydrates',
  sugars: 'Sugars',
  fat: 'Fat',
  saturatedFat: 'Saturated Fat'
};
```

### Nutrient Units

```typescript
export const NUTRIENT_UNITS: Record<string, string> = {
  protein: 'g',
  fiber: 'g',
  calcium: 'mg',
  magnesium: 'mg',
  potassium: 'mg',
  iron: 'mg',
  zinc: 'mg',
  vitaminD: 'mcg',
  vitaminB12: 'mcg',
  folate: 'mcg',
  vitaminB6: 'mg',
  vitaminA: 'mcg',
  vitaminC: 'mg',
  vitaminK: 'mcg',
  omega3: 'g',
  omega6: 'g',
  carbohydrates: 'g',
  sugars: 'g',
  fat: 'g',
  saturatedFat: 'g'
};
```

### Nutrient Order (for UI Lists)

Suggested order for settings dialogs and dropdowns:

1. **Core 4 (Default Displayed)**:
   - Protein
   - Calcium
   - Fiber
   - Vitamin D

2. **Other Minerals**:
   - Magnesium
   - Potassium
   - Iron
   - Zinc

3. **Other Vitamins**:
   - Vitamin B12
   - Folate
   - Vitamin B6
   - Vitamin A
   - Vitamin C
   - Vitamin K

4. **Fats & Carbs** (Optional):
   - Omega-3
   - Omega-6
   - Carbohydrates
   - Sugars
   - Fat (total)
   - Saturated Fat

---

## Validation Ranges

For input validation in custom food forms and settings:

```typescript
export const NUTRIENT_RANGES: Record<string, { min: number; max: number }> = {
  protein: { min: 0, max: 500 },         // g per serving
  fiber: { min: 0, max: 100 },
  calcium: { min: 0, max: 5000 },        // mg per serving
  magnesium: { min: 0, max: 2000 },
  potassium: { min: 0, max: 10000 },
  iron: { min: 0, max: 500 },
  zinc: { min: 0, max: 500 },
  vitaminD: { min: 0, max: 200 },        // mcg per serving
  vitaminB12: { min: 0, max: 1000 },
  folate: { min: 0, max: 2000 },
  vitaminB6: { min: 0, max: 500 },
  vitaminA: { min: 0, max: 5000 },
  vitaminC: { min: 0, max: 2000 },
  vitaminK: { min: 0, max: 5000 },
  omega3: { min: 0, max: 50 },
  omega6: { min: 0, max: 100 },
  carbohydrates: { min: 0, max: 500 },
  sugars: { min: 0, max: 200 },
  fat: { min: 0, max: 200 },
  saturatedFat: { min: 0, max: 100 }
};
```

---

## Unit Conversions

### Vitamin D: IU ↔ mcg

- **1 mcg = 40 IU**
- **1 IU = 0.025 mcg**

If API returns IU (code 324), convert to mcg for storage:
```typescript
const vitaminD_mcg = vitaminD_IU * 0.025;
```

### Vitamin A: IU ↔ RAE

- **1 mcg RAE = 3.33 IU** (from retinol)
- **1 IU = 0.3 mcg RAE**

If API returns IU (code 319), convert to RAE:
```typescript
const vitaminA_RAE = vitaminA_IU * 0.3;
```

**Note**: These conversions are approximations. For precise values, use RAE/mcg fields when available.

---

## CSV Header Examples (To Be Updated)

**Placeholder**: Once CSV files are downloaded, document actual header structure here.

Example expected format:
```
fdcId, foodDescription, proteinValue, fiberValue, calciumValue, ...
```

**TODO for Day 1-2**:
1. Download USDA FDC CSV files
2. Run `head -n 1 combined_input.csv` to see headers
3. Update this section with actual column names
4. Update `usda-fdc-config.json` accordingly

---

## References

- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [USDA Nutrient Database Documentation](https://fdc.nal.usda.gov/download-datasets/)
- [DRI Tables (Dietary Reference Intakes)](https://www.nal.usda.gov/fnic/dri-calculator/)
- [RDA for Older Adults](https://health.gov/our-work/nutrition-physical-activity/dietary-guidelines)

---

## Change Log

- **2025-12-07**: Initial version, placeholders for CSV columns
- **[TBD]**: Updated with actual CSV column names after download
