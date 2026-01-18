/*
 * My Nutrients Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// OpenFoodFacts API Configuration for My Nutrients PWA
export const OPENFOODFACTS_CONFIG = {
  // OpenFoodFacts API base URL
  API_BASE_URL: 'https://world.openfoodfacts.org/api/v2',
  PRODUCT_ENDPOINT: '/product', // Pattern: /product/{barcode}.json

  // User agent for API requests (required by OpenFoodFacts)
  USER_AGENT: 'MyNutrients/1.0 (nutrient tracking PWA)',

  // Nutrition data field mappings
  // OpenFoodFacts nutriments object uses snake_case with _100g and _serving suffixes
  NUTRITION_FIELDS: {
    // Legacy calcium fields (for backward compatibility)
    CALCIUM_100G: 'calcium_100g',
    CALCIUM_SERVING: 'calcium_serving',
    CALCIUM_UNIT: 'calcium_unit',
  },

  // Map of our nutrient IDs to OpenFoodFacts field names (without _100g/_serving suffix)
  // Values are in grams/mg depending on nutrient type
  NUTRIENT_FIELD_MAP: {
    // Macronutrients (values in g)
    protein: 'proteins',
    fiber: 'fiber',
    carbohydrates: 'carbohydrates',
    sugars: 'sugars',
    fat: 'fat',
    saturatedFat: 'saturated-fat',
    monounsaturatedFat: 'monounsaturated-fat',
    polyunsaturatedFat: 'polyunsaturated-fat',

    // Omega fatty acids (values in g)
    omega3: 'omega-3-fat',
    omega3ALA: 'alpha-linolenic-acid',
    omega3EPA: 'eicosapentaenoic-acid',
    omega3DHA: 'docosahexaenoic-acid',
    omega6: 'omega-6-fat',

    // Minerals (values often in g, need conversion to mg)
    calcium: 'calcium',
    magnesium: 'magnesium',
    potassium: 'potassium',
    iron: 'iron',
    zinc: 'zinc',

    // Vitamins (various units)
    vitaminD: 'vitamin-d',
    vitaminB12: 'vitamin-b12',
    folate: 'folate',        // Also check 'vitamin-b9'
    vitaminB6: 'vitamin-b6',
    vitaminA: 'vitamin-a',
    vitaminC: 'vitamin-c',
    vitaminK: 'vitamin-k',
  },

  // Nutrients that need g→mg conversion (minerals typically stored as grams in OFF)
  NUTRIENTS_NEEDING_MG_CONVERSION: ['calcium', 'magnesium', 'potassium', 'iron', 'zinc'],

  // Nutrients in mcg (vitamins typically stored correctly)
  NUTRIENTS_IN_MCG: ['vitaminD', 'vitaminB12', 'folate', 'vitaminA', 'vitaminK'],

  // Serving size fields
  SERVING_FIELDS: {
    QUANTITY: 'serving_quantity',      // Serving quantity (number)
    UNIT: 'serving_quantity_unit',     // Serving unit (e.g., 'g', 'ml')
    SIZE_TEXT: 'serving_size',         // Human-readable serving size
  },

  // Product info fields
  PRODUCT_FIELDS: {
    NAME: 'product_name',
    BRANDS: 'brands',
    INGREDIENTS: 'ingredients_text',
    COMPLETENESS: 'completeness',      // Data completeness score (0-1)
  },

  // Unit conversion
  UNIT_CONVERSION: {
    GRAMS_TO_MG: 1000,    // Convert grams to milligrams
    DEFAULT_UNIT: 'g',    // Default calcium unit in OpenFoodFacts

    // IMPORTANT: OpenFoodFacts has inconsistent calcium units!
    // - calcium_unit often shows "mg" but values are actually in grams (fractions like 0.158)
    // - The OpenFoodFacts website displays these as converted mg values
    // - We hardcode the conversion rather than trust calcium_unit field
    FORCE_CALCIUM_CONVERSION: true  // Always convert calcium values by 1000x
  }
};