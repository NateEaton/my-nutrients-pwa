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

// OpenFoodFacts API Service for UPC lookup
// Provides same interface as FDCService for seamless source switching
import {
  HouseholdMeasureService,
  buildServingFromStandardized,
  extractHouseholdUnit,
  extractMetricFromParenthetical,
  type StandardizedServing
} from './HouseholdMeasureService';
import { UnitConverter } from './UnitConverter';
import { OPENFOODFACTS_CONFIG } from '$lib/config/openfoodfacts.js';
import { logger } from '$lib/utils/logger';
import type { NutrientValues } from '$lib/types/nutrients';

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: string;
  serving_quantity_unit?: string;
  nutriments?: {
    calcium_100g?: string | number;
    calcium_serving?: string | number;
    calcium_unit?: string;
    [key: string]: any;
  };
  ingredients_text?: string;
  completeness?: number;
  [key: string]: any;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
  status_verbose?: string;
}

// Reuse same ParsedProduct interface as FDCService
interface ParsedProduct {
  source: string;
  upcCode: string;
  fdcId: number;
  productName: string;
  brandOwner: string;
  brandName: string;

  // Clean final data for AddFoodModal (centralized decision result)
  finalServingQuantity: number;
  finalServingUnit: string;
  servingDisplayText: string;
  servingSource: 'enhanced' | 'standard';

  // Legacy fields (for backward compatibility)
  servingSize: string;
  servingCount: number;
  servingUnit: string;
  householdServingFullText?: string;
  smartServing?: any;

  // Multi-nutrient support
  nutrients: NutrientValues;
  nutrientsPerServing: NutrientValues;

  // Legacy calcium fields (for backward compatibility)
  calcium: string;
  calciumValue: number | null;
  calciumPercentDV?: number | null;
  calciumFromPercentDV?: number | null;
  calciumPerServing?: number | null;
  ingredients: string;
  confidence: string;
  rawData: any;
}

export class OpenFoodFactsService {
  private baseUrl: string;
  private householdMeasureService: HouseholdMeasureService;
  private unitConverter: UnitConverter;

  constructor() {
    this.baseUrl = OPENFOODFACTS_CONFIG.API_BASE_URL;
    this.householdMeasureService = new HouseholdMeasureService();
    this.unitConverter = new UnitConverter();
  }

  /**
   * Search for a product by UPC/GTIN code
   * @param upcCode - The UPC/GTIN code to search for
   * @returns Product data or null if not found
   */
  async searchByUPC(upcCode: string): Promise<ParsedProduct | null> {
    logger.debug('OFF', 'Starting UPC lookup for:', upcCode);

    try {
      // Validate UPC code
      if (!upcCode || typeof upcCode !== 'string') {
        logger.debug('OFF', 'Invalid UPC code provided (not a string)');
        throw new Error('Invalid UPC code provided');
      }

      if (!OpenFoodFactsService.isValidUPCFormat(upcCode)) {
        logger.debug('OFF', 'UPC code format is invalid:', upcCode);
        throw new Error('UPC code format is invalid');
      }

      // Clean UPC code
      const cleanedUPC = this.cleanUPCCode(upcCode);
      logger.debug('OFF', 'Cleaned UPC code:', cleanedUPC);

      // Make API request
      const apiUrl = `${this.baseUrl}${OPENFOODFACTS_CONFIG.PRODUCT_ENDPOINT}/${cleanedUPC}.json`;
      logger.debug('OFF', 'Making API request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': OPENFOODFACTS_CONFIG.USER_AGENT
        }
      });

      logger.debug('OFF', 'API response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 404) {
          logger.debug('OFF', 'Product not found (404) for UPC:', cleanedUPC);
          return null;
        }
        throw new Error(`OpenFoodFacts API request failed: ${response.status} ${response.statusText}`);
      }

      const data: OpenFoodFactsResponse = await response.json();
      logger.debug('OFF', 'API response data status:', data.status, 'verbose:', data.status_verbose);

      // Check if product was found
      if (data.status !== 1 || !data.product) {
        logger.debug('OFF', 'Product not found in response data for UPC:', cleanedUPC);
        return null;
      }

      logger.debug('OFF', 'Product found, parsing data...');
      return this.parseProductData(data.product, cleanedUPC);

    } catch (error) {
      console.error('OFF: Error during UPC lookup:', error);
      throw error;
    }
  }

  /**
   * Parse OpenFoodFacts product data into standard format
   * @param product - Raw product data from OpenFoodFacts API
   * @param upcCode - The original UPC code searched
   * @returns Parsed product data
   */
  parseProductData(product: OpenFoodFactsProduct, upcCode: string): ParsedProduct {
    logger.debug('OFF', 'Starting product data parsing for UPC:', upcCode);

    try {
      // Extract basic product info using config constants
      const productName = product[OPENFOODFACTS_CONFIG.PRODUCT_FIELDS.NAME] || 'Unknown Product';
      const brandOwner = product[OPENFOODFACTS_CONFIG.PRODUCT_FIELDS.BRANDS] || '';
      const brandName = product[OPENFOODFACTS_CONFIG.PRODUCT_FIELDS.BRANDS] || '';
      const ingredients = product[OPENFOODFACTS_CONFIG.PRODUCT_FIELDS.INGREDIENTS] || '';

      logger.debug('OFF', 'Product name:', productName);
      logger.debug('OFF', 'Brand:', brandName);

      // ============================================================================
      // SERVING SIZE PARSING - Standardized approach shared with FDCService
      // Extract to StandardizedServing, then use buildServingFromStandardized()
      // ============================================================================
      let servingSize = '';
      let servingCount = 1;  // Metric value for nutrient calculation
      let servingUnit = '';  // Metric unit for nutrient calculation
      let finalServingQuantity = 1;
      let finalServingUnit = 'serving';

      logger.debug('OFF', 'Extracting serving size information...');
      logger.debug('OFF', 'Raw serving_size:', product.serving_size);
      logger.debug('OFF', 'Raw serving_quantity:', product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.QUANTITY]);
      logger.debug('OFF', 'Raw serving_quantity_unit:', product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.UNIT]);

      if (product.serving_size) {
        // Parse serving_size text directly (like internal DB measures)
        // OFF's serving_size often includes metric in parentheses: "1 mini cup (57 g)"
        const parsed = this.unitConverter.parseUSDAMeasure(product.serving_size);

        logger.debug('OFF', 'Parsed serving_size with parseUSDAMeasure:', {
          originalQuantity: parsed.originalQuantity,
          originalUnit: parsed.originalUnit,
          cleanedUnit: parsed.cleanedUnit,
          unitType: parsed.unitType
        });

        // Extract household unit (remove any metric parenthetical)
        const householdUnit = extractHouseholdUnit(parsed.originalUnit);

        // Extract metric value for nutrient calculations
        // First, try to get from parentheses in serving_size like "(57 g)" or "(240ml)"
        let metricExtracted = extractMetricFromParenthetical(product.serving_size);

        if (metricExtracted.metricValue !== null) {
          servingCount = metricExtracted.metricValue;
          servingUnit = metricExtracted.metricUnit!;
          logger.debug('OFF', 'Extracted metric from parentheses:', servingCount, servingUnit);
        } else if (product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.QUANTITY] && product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.UNIT]) {
          // Use serving_quantity/serving_quantity_unit for metric calculation
          servingCount = parseFloat(product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.QUANTITY]) || 1;
          servingUnit = this.householdMeasureService.standardizeUnit(product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.UNIT]);
          logger.debug('OFF', 'Using serving_quantity fields for metric:', servingCount, servingUnit);
        } else if (parsed.unitType === 'weight' || parsed.unitType === 'volume') {
          // serving_size is already in metric (e.g., "78 g", "240 ml")
          servingCount = parsed.originalQuantity;
          servingUnit = parsed.cleanedUnit || parsed.originalUnit;
          logger.debug('OFF', 'serving_size is metric:', servingCount, servingUnit);
        }

        // Build standardized serving
        const standardized: StandardizedServing = {
          quantity: parsed.originalQuantity,
          householdUnit: householdUnit,
          metricValue: servingCount || null,
          metricUnit: servingUnit || null
        };

        // Use shared formatter for consistent output
        const servingResult = buildServingFromStandardized(standardized);
        finalServingQuantity = servingResult.quantity;
        finalServingUnit = servingResult.unit;
        servingSize = servingResult.displayText;

        logger.debug('OFF', 'Standardized serving result:', {
          standardized,
          servingResult
        });

      } else if (product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.QUANTITY] && product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.UNIT]) {
        // No serving_size text, but have quantity/unit fields
        servingCount = parseFloat(product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.QUANTITY]) || 1;
        servingUnit = this.householdMeasureService.standardizeUnit(product[OPENFOODFACTS_CONFIG.SERVING_FIELDS.UNIT]);
        finalServingQuantity = servingCount;
        finalServingUnit = servingUnit;
        servingSize = `${servingCount} ${servingUnit}`;
        logger.debug('OFF', 'Using quantity/unit fields only:', servingCount, servingUnit);
      } else {
        logger.debug('OFF', 'No serving size information available in product data');
      }


      // Extract all nutrients from nutriments
      const nutrients = this.extractNutrients(product);
      logger.debug('OFF', 'Extracted nutrients (per 100g):', nutrients);

      // Calculate per-serving nutrients
      const nutrientsPerServing = this.calculateNutrientsPerServing(
        nutrients,
        servingCount,
        servingUnit
      );
      logger.debug('OFF', 'Calculated per-serving nutrients:', nutrientsPerServing);

      // Legacy calcium support (for backward compatibility)
      const calciumValue = nutrients.calcium || null;
      const calcium = calciumValue ? `${calciumValue} mg` : '';
      const calciumPerServing = nutrientsPerServing.calcium || null;

      // Determine serving display text and source
      const servingDisplayText = servingSize || `${finalServingQuantity} ${finalServingUnit}`;
      const servingSource: 'enhanced' | 'standard' =
        finalServingUnit !== servingUnit ? 'enhanced' : 'standard';

      logger.debug('OFF', 'Final serving decision:', {
        finalServingQuantity,
        finalServingUnit,
        servingDisplayText,
        servingSource,
        metricForCalc: `${servingCount} ${servingUnit}`
      });

      // Determine confidence based on data completeness
      const completeness = product[OPENFOODFACTS_CONFIG.PRODUCT_FIELDS.COMPLETENESS] || 0;
      let confidence: string;
      if (completeness >= 0.8 && calciumValue) {
        confidence = 'high';
      } else if (completeness >= 0.5 && calciumValue) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }

      logger.debug('OFF', 'Product completeness:', completeness, 'confidence:', confidence);

      const result = {
        source: 'OpenFoodFacts',
        upcCode: upcCode,
        fdcId: 0, // OpenFoodFacts doesn't have FDC IDs
        productName: productName,
        brandOwner: brandOwner,
        brandName: brandName,

        // Clean final data for AddFoodModal (centralized decision result)
        finalServingQuantity: finalServingQuantity,
        finalServingUnit: finalServingUnit,
        servingDisplayText: servingDisplayText,
        servingSource: servingSource,

        // Legacy fields (for backward compatibility)
        servingSize: servingSize,
        servingCount: servingCount,
        servingUnit: servingUnit,
        householdServingFullText: product.serving_size,
        smartServing: null, // Deprecated - using parseUSDAMeasure() now

        // Multi-nutrient support
        nutrients: nutrients,
        nutrientsPerServing: nutrientsPerServing,

        // Legacy calcium fields (for backward compatibility)
        calcium: calcium,
        calciumValue: calciumValue,
        calciumPercentDV: null, // OpenFoodFacts doesn't provide percent DV
        calciumFromPercentDV: null,
        calciumPerServing: calciumPerServing,
        ingredients: ingredients,
        confidence: confidence,
        rawData: product
      };

      logger.debug('OFF', 'Successfully parsed product data');
      logger.debug('OFF', 'Final result - calcium:', calcium, 'per serving:', calciumPerServing, 'mg');

      return result;

    } catch (error) {
      console.error('OFF: Error parsing product data:', error);
      throw new Error('Failed to parse product data from OpenFoodFacts database');
    }
  }

  /**
   * Clean UPC code for API request
   * @param upcCode - Raw UPC code
   * @returns Cleaned UPC code
   */
  private cleanUPCCode(upcCode: string): string {
    // Remove all non-digit characters
    return upcCode.replace(/\D/g, '');
  }

  /**
   * Extract all nutrients from OpenFoodFacts nutriments data
   * @param product - Raw product data from OpenFoodFacts API
   * @returns NutrientValues object with all available nutrients (per 100g)
   */
  private extractNutrients(product: OpenFoodFactsProduct): NutrientValues {
    const nutrients: NutrientValues = {};

    if (!product.nutriments) {
      logger.debug('OFF', 'No nutriments data available');
      return nutrients;
    }

    const nutriments = product.nutriments;
    const fieldMap = OPENFOODFACTS_CONFIG.NUTRIENT_FIELD_MAP;
    const needsMgConversion = OPENFOODFACTS_CONFIG.NUTRIENTS_NEEDING_MG_CONVERSION || [];

    for (const [nutrientKey, offFieldName] of Object.entries(fieldMap)) {
      // OpenFoodFacts uses _100g suffix for per-100g values
      const fieldName100g = `${offFieldName}_100g`;
      const rawValue = nutriments[fieldName100g];

      if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        let value = parseFloat(rawValue.toString());

        if (!isNaN(value)) {
          // Apply g→mg conversion for minerals
          if (needsMgConversion.includes(nutrientKey)) {
            // OpenFoodFacts often stores mineral values as grams (e.g., 0.158 for 158mg)
            // Check if value seems to be in grams (very small number)
            if (value < 10) {
              value = value * OPENFOODFACTS_CONFIG.UNIT_CONVERSION.GRAMS_TO_MG;
              logger.debug('OFF', `Converted ${nutrientKey} from ${rawValue}g to ${value}mg`);
            }
          }

          // Round to reasonable precision
          nutrients[nutrientKey] = Math.round(value * 100) / 100;
        }
      }
    }

    logger.debug('OFF', `Extracted ${Object.keys(nutrients).length} nutrients from OpenFoodFacts data`);
    return nutrients;
  }

  /**
   * Calculate per-serving nutrient values from per-100g values
   * @param nutrients - Nutrient values per 100g
   * @param servingCount - Serving size value (e.g., 240)
   * @param servingUnit - Serving unit (e.g., "ml" or "g")
   * @returns NutrientValues calculated for the serving size
   */
  private calculateNutrientsPerServing(
    nutrients: NutrientValues,
    servingCount: number,
    servingUnit: string
  ): NutrientValues {
    const perServing: NutrientValues = {};

    // Only calculate if we have valid serving size in mass/volume units
    if (!servingCount || !this.householdMeasureService.isVolumeOrMassUnit(servingUnit)) {
      logger.debug('OFF', 'Cannot calculate per-serving nutrients - invalid serving size');
      return nutrients; // Return original per-100g values as fallback
    }

    // Calculate per-serving for each nutrient
    // API values are per 100g, so: (value * servingCount) / 100
    for (const [key, value] of Object.entries(nutrients)) {
      if (value != null) {
        perServing[key] = Math.round((value * servingCount) / 100 * 10) / 10; // Round to 1 decimal
      }
    }

    logger.debug('OFF', `Calculated per-serving from ${servingCount}${servingUnit} (${Object.keys(perServing).length} nutrients)`);
    return perServing;
  }

  /**
   * Validate that a string looks like a UPC code
   * @param code - The code to validate
   * @returns True if it looks like a valid UPC
   */
  static isValidUPCFormat(code: string): boolean {
    if (!code || typeof code !== 'string') return false;

    const cleanCode = code.replace(/\D/g, '');
    return cleanCode.length >= 8 && cleanCode.length <= 14;
  }

  /**
   * Format UPC code for display
   * @param upcCode - Raw UPC code
   * @returns Formatted UPC code
   */
  static formatUPC(upcCode: string): string {
    const clean = upcCode.replace(/\D/g, '');

    // Format common UPC lengths
    if (clean.length === 12) {
      // UPC-A: 123456 789012
      return `${clean.slice(0, 6)} ${clean.slice(6)}`;
    } else if (clean.length === 13) {
      // EAN-13: 1 234567 890123
      return `${clean.slice(0, 1)} ${clean.slice(1, 7)} ${clean.slice(7)}`;
    } else if (clean.length === 8) {
      // UPC-E: 1234 5678
      return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    }

    // For other lengths, return as-is
    return clean;
  }
}