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

/**
 * Nutrient metadata and default configuration
 */

export interface NutrientMetadata {
  id: string;
  label: string;
  unit: string;
  defaultGoal: number;
  category: 'macro' | 'mineral' | 'vitamin' | 'fat';
  fdcNutrientId: string; // USDA FDC nutrient ID
  description?: string;
}

/**
 * Default daily goals for nutrients
 * Based on RDA/DV values for adults (adjusted for seniors where applicable)
 */
export const DEFAULT_NUTRIENT_GOALS: Record<string, number> = {
  // Macronutrients (g)
  protein: 60,
  fiber: 25,
  carbohydrates: 275,
  sugars: 50,
  fat: 78,
  saturatedFat: 20,
  monounsaturatedFat: 0, // No established RDA
  polyunsaturatedFat: 0, // No established RDA

  // Omega fatty acids (g)
  omega3: 1.6, // Combined ALA + EPA + DHA
  omega3ALA: 1.6, // α-linolenic acid
  omega3EPA: 0.25, // Eicosapentaenoic acid
  omega3DHA: 0.25, // Docosahexaenoic acid
  omega6: 17, // Linoleic acid

  // Minerals (mg)
  calcium: 1200, // Increased for seniors (65+)
  magnesium: 420, // For men; 320 for women
  potassium: 3400,
  iron: 8,
  zinc: 11, // For men; 8 for women

  // Vitamins
  vitaminD: 20, // mcg (seniors)
  vitaminB12: 2.4, // mcg
  folate: 400, // mcg DFE
  vitaminB6: 1.7, // mg
  vitaminA: 900, // mcg RAE (men); 700 for women
  vitaminC: 90, // mg (men); 75 for women
  vitaminK: 120, // mcg (men); 90 for women
};

/**
 * Complete nutrient metadata
 */
export const NUTRIENT_METADATA: NutrientMetadata[] = [
  // Macronutrients
  {
    id: 'protein',
    label: 'Protein',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.protein,
    category: 'macro',
    fdcNutrientId: '203',
    description: 'Essential for muscle growth and repair'
  },
  {
    id: 'fiber',
    label: 'Fiber',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.fiber,
    category: 'macro',
    fdcNutrientId: '291',
    description: 'Supports digestive health'
  },
  {
    id: 'carbohydrates',
    label: 'Carbohydrates',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.carbohydrates,
    category: 'macro',
    fdcNutrientId: '205',
    description: 'Primary energy source'
  },
  {
    id: 'sugars',
    label: 'Sugars',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.sugars,
    category: 'macro',
    fdcNutrientId: '269',
    description: 'Simple carbohydrates'
  },
  {
    id: 'fat',
    label: 'Total Fat',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.fat,
    category: 'fat',
    fdcNutrientId: '204',
    description: 'Essential for hormone production'
  },
  {
    id: 'saturatedFat',
    label: 'Saturated Fat',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.saturatedFat,
    category: 'fat',
    fdcNutrientId: '606',
    description: 'Limit intake for heart health'
  },
  {
    id: 'monounsaturatedFat',
    label: 'Monounsaturated Fat',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.monounsaturatedFat,
    category: 'fat',
    fdcNutrientId: '645',
    description: 'Heart-healthy fat'
  },
  {
    id: 'polyunsaturatedFat',
    label: 'Polyunsaturated Fat',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.polyunsaturatedFat,
    category: 'fat',
    fdcNutrientId: '646',
    description: 'Heart-healthy fat'
  },

  // Omega fatty acids
  {
    id: 'omega3',
    label: 'Omega-3',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.omega3,
    category: 'fat',
    fdcNutrientId: '851', // Combined omega-3
    description: 'Anti-inflammatory fatty acids'
  },
  {
    id: 'omega3ALA',
    label: 'Omega-3 (ALA)',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.omega3ALA,
    category: 'fat',
    fdcNutrientId: '619',
    description: 'α-linolenic acid'
  },
  {
    id: 'omega3EPA',
    label: 'Omega-3 (EPA)',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.omega3EPA,
    category: 'fat',
    fdcNutrientId: '629',
    description: 'Eicosapentaenoic acid'
  },
  {
    id: 'omega3DHA',
    label: 'Omega-3 (DHA)',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.omega3DHA,
    category: 'fat',
    fdcNutrientId: '621',
    description: 'Docosahexaenoic acid'
  },
  {
    id: 'omega6',
    label: 'Omega-6',
    unit: 'g',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.omega6,
    category: 'fat',
    fdcNutrientId: '618',
    description: 'Linoleic acid'
  },

  // Minerals
  {
    id: 'calcium',
    label: 'Calcium',
    unit: 'mg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.calcium,
    category: 'mineral',
    fdcNutrientId: '301',
    description: 'Essential for bone health'
  },
  {
    id: 'magnesium',
    label: 'Magnesium',
    unit: 'mg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.magnesium,
    category: 'mineral',
    fdcNutrientId: '304',
    description: 'Supports muscle and nerve function'
  },
  {
    id: 'potassium',
    label: 'Potassium',
    unit: 'mg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.potassium,
    category: 'mineral',
    fdcNutrientId: '306',
    description: 'Regulates blood pressure'
  },
  {
    id: 'iron',
    label: 'Iron',
    unit: 'mg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.iron,
    category: 'mineral',
    fdcNutrientId: '303',
    description: 'Carries oxygen in blood'
  },
  {
    id: 'zinc',
    label: 'Zinc',
    unit: 'mg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.zinc,
    category: 'mineral',
    fdcNutrientId: '309',
    description: 'Supports immune function'
  },

  // Vitamins
  {
    id: 'vitaminD',
    label: 'Vitamin D',
    unit: 'mcg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.vitaminD,
    category: 'vitamin',
    fdcNutrientId: '328',
    description: 'Essential for calcium absorption'
  },
  {
    id: 'vitaminB12',
    label: 'Vitamin B12',
    unit: 'mcg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.vitaminB12,
    category: 'vitamin',
    fdcNutrientId: '418',
    description: 'Important for nerve function'
  },
  {
    id: 'folate',
    label: 'Folate',
    unit: 'mcg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.folate,
    category: 'vitamin',
    fdcNutrientId: '435',
    description: 'Essential for cell division'
  },
  {
    id: 'vitaminB6',
    label: 'Vitamin B6',
    unit: 'mg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.vitaminB6,
    category: 'vitamin',
    fdcNutrientId: '415',
    description: 'Supports brain health'
  },
  {
    id: 'vitaminA',
    label: 'Vitamin A',
    unit: 'mcg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.vitaminA,
    category: 'vitamin',
    fdcNutrientId: '320',
    description: 'Important for vision'
  },
  {
    id: 'vitaminC',
    label: 'Vitamin C',
    unit: 'mg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.vitaminC,
    category: 'vitamin',
    fdcNutrientId: '401',
    description: 'Antioxidant and immune support'
  },
  {
    id: 'vitaminK',
    label: 'Vitamin K',
    unit: 'mcg',
    defaultGoal: DEFAULT_NUTRIENT_GOALS.vitaminK,
    category: 'vitamin',
    fdcNutrientId: '430',
    description: 'Essential for blood clotting'
  },
];

/**
 * Helper functions for nutrient metadata
 */

export function getNutrientLabel(id: string): string {
  const nutrient = NUTRIENT_METADATA.find(n => n.id === id);
  return nutrient?.label || id;
}

export function getNutrientUnit(id: string): string {
  const nutrient = NUTRIENT_METADATA.find(n => n.id === id);
  return nutrient?.unit || '';
}

export function getNutrientMetadata(id: string): NutrientMetadata | undefined {
  return NUTRIENT_METADATA.find(n => n.id === id);
}

export function getFDCNutrientId(nutrientId: string): string | undefined {
  const nutrient = NUTRIENT_METADATA.find(n => n.id === nutrientId);
  return nutrient?.fdcNutrientId;
}

/**
 * Map of FDC nutrient IDs to our nutrient keys
 */
export const FDC_TO_NUTRIENT_MAP: Record<string, string> = NUTRIENT_METADATA.reduce((map, nutrient) => {
  map[nutrient.fdcNutrientId] = nutrient.id;
  return map;
}, {} as Record<string, string>);

/**
 * Get default displayed nutrients (top 4 for new users)
 */
export function getDefaultDisplayedNutrients(): string[] {
  return ['protein', 'calcium', 'fiber', 'vitaminD'];
}

/**
 * Validation ranges for nutrient inputs (per serving)
 * min: minimum acceptable value
 * max: maximum reasonable value per serving
 */
export interface NutrientValidationRange {
  min: number;
  max: number;
}

export const NUTRIENT_VALIDATION_RANGES: Record<string, NutrientValidationRange> = {
  // Macronutrients (g) - max based on typical serving sizes
  protein: { min: 0, max: 200 },
  fiber: { min: 0, max: 50 },
  carbohydrates: { min: 0, max: 500 },
  sugars: { min: 0, max: 200 },
  fat: { min: 0, max: 200 },
  saturatedFat: { min: 0, max: 100 },
  monounsaturatedFat: { min: 0, max: 100 },
  polyunsaturatedFat: { min: 0, max: 100 },

  // Omega fatty acids (g)
  omega3: { min: 0, max: 20 },
  omega3ALA: { min: 0, max: 20 },
  omega3EPA: { min: 0, max: 10 },
  omega3DHA: { min: 0, max: 10 },
  omega6: { min: 0, max: 50 },

  // Minerals (mg)
  calcium: { min: 0, max: 10000 },
  magnesium: { min: 0, max: 5000 },
  potassium: { min: 0, max: 10000 },
  iron: { min: 0, max: 1000 },
  zinc: { min: 0, max: 1000 },

  // Vitamins - mcg units
  vitaminD: { min: 0, max: 5000 }, // mcg
  vitaminB12: { min: 0, max: 10000 }, // mcg
  folate: { min: 0, max: 10000 }, // mcg DFE
  vitaminA: { min: 0, max: 50000 }, // mcg RAE
  vitaminK: { min: 0, max: 10000 }, // mcg

  // Vitamins - mg units
  vitaminB6: { min: 0, max: 1000 }, // mg
  vitaminC: { min: 0, max: 10000 }, // mg
};

/**
 * Get validation range for a specific nutrient
 */
export function getNutrientValidationRange(nutrientId: string): NutrientValidationRange {
  return NUTRIENT_VALIDATION_RANGES[nutrientId] || { min: 0, max: 100000 };
}
