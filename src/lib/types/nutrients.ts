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
  omega3?: number; // Combined (ALA + EPA + DHA)
  omega3ALA?: number; // α-linolenic acid
  omega3EPA?: number; // Eicosapentaenoic acid
  omega3DHA?: number; // Docosahexaenoic acid
  omega6?: number; // Linoleic acid

  // Minerals (mg)
  calcium?: number;
  magnesium?: number;
  potassium?: number;
  iron?: number;
  zinc?: number;

  // Vitamins (varies)
  vitaminD?: number; // mcg
  vitaminB12?: number; // mcg
  folate?: number; // mcg DFE
  vitaminB6?: number; // mg
  vitaminA?: number; // mcg RAE
  vitaminC?: number; // mg
  vitaminK?: number; // mcg
}

export interface FoodEntry {
  name: string;
  calcium?: number; // Backward compatibility - deprecated, use nutrients.calcium
  nutrients: NutrientValues;
  servingQuantity: number;
  servingUnit: string;
  timestamp: string;
  isCustom?: boolean;
  customFoodId?: number;
  note?: string;
}

export interface CustomFood {
  id: number;
  name: string;
  nutrients: NutrientValues;
  measure: string;
  dateAdded: string;
  isCustom: true;

  // Enhanced source metadata
  sourceMetadata?: {
    // Core source info
    sourceType: 'manual' | 'upc_scan' | 'ocr_scan' | null;
    upcSource?: 'usda_fdc' | 'openfoodfacts' | null;
    upc?: string | null;
    sourceKey?: string | null; // fdcId, off_id, etc.
    confidence?: number; // 0-1 for OCR/scan confidence

    // Scan processing details (what was used but not carried through)
    scanData?: {
      originalName?: string; // Raw scanned name before cleanup
      householdMeasure?: string; // e.g., "1 cup (240ml)"
      servingSize?: string; // e.g., "240ml" or "1 container"
      selectedNutrientPer?: string; // "100g" | "serving" | "container"
      brandName?: string; // Brand extracted from scan
      ingredients?: string; // Full ingredient list if available
      allergens?: string[]; // Detected allergens
    };

    // Processing notes
    processingNotes?: {
      measureConversion?: string; // e.g., "Converted from 240ml to 1 cup"
      nameNormalization?: string; // e.g., "Simplified from 'Organic Unsweetened...'"
      confidence?: {
        name: number;
        nutrients: number;
        measure: number;
      };
    };
  };
}

export interface NutrientSettings {
  nutrientGoals: Record<string, number>;
  displayedNutrients: string[]; // Max 4 nutrients to display
  theme?: 'auto' | 'light' | 'dark';
  colorScheme?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';
  // Sorting preferences for tracking page
  sortBy?: 'time' | 'name' | string; // 'string' allows nutrient IDs
  sortOrder?: 'asc' | 'desc';
}

export interface BackupData {
  metadata: {
    version: string;
    createdAt: string;
    appVersion: string;
    buildId?: string;
    syncGenerationId?: string;
  };
  preferences: NutrientSettings;
  customFoods: CustomFood[];
  favorites?: (number | string)[];
  hiddenFoods?: (number | string)[];
  servingPreferences?: UserServingPreference[];
  journalEntries: Record<string, FoodEntry[]>;
}

export interface NutrientState {
  currentDate: string;
  foods: FoodEntry[];
  customFoods: CustomFood[];
  favorites: Set<number>;
  hiddenFoods: Set<number>;
  servingPreferences: Map<number, UserServingPreference>;
  settings: NutrientSettings;
  totalNutrients: NutrientValues;
  isLoading: boolean;
}

export interface MeasureSet {
  measure: string;
  nutrients: NutrientValues;
}

export interface USDAFood {
  id: number;
  name: string;
  // New multi-measure format with nutrients
  measures?: MeasureSet[];
  isFavorite?: boolean;
}

export interface UserServingPreference {
  foodId: number;
  preferredQuantity: number;
  preferredUnit: string;
  lastUsed: string;
  preferredMeasureIndex?: number; // Optional: index of preferred measure for multi-measure foods
  nutrientOverrides?: NutrientValues; // Optional: user-edited nutrient values that override calculated values
}

export interface JournalEntry {
  date: string;
  foods: FoodEntry[];
  lastModified: number;
  syncStatus: string;
  totalNutrients: NutrientValues;
}
