#!/usr/bin/env node

/**
 * Test script for nutrient precision rounding
 * Validates the rounding logic added to data-module-generator-nutrients.cjs
 */

// --- Copy of rounding logic from generator ---

const NUTRIENT_PRECISION = {
  // Macronutrients (g) - 1 decimal place
  protein: 1,
  fiber: 1,
  carbohydrates: 1,
  sugars: 1,
  fat: 1,
  saturatedFat: 1,
  monounsaturatedFat: 1,
  polyunsaturatedFat: 1,

  // Omega fatty acids (g) - 2-3 decimal places (often very small values)
  omega3: 3,
  omega3ALA: 3,
  omega3EPA: 3,
  omega3DHA: 3,
  omega6: 3,

  // Minerals (mg) - 0-1 decimal places based on magnitude
  calcium: 'dynamic',
  magnesium: 'dynamic',
  potassium: 'dynamic',
  iron: 'dynamic',
  zinc: 'dynamic',

  // Vitamins in mcg - 1-2 decimal places based on magnitude
  vitaminD: 'dynamic',
  vitaminB12: 'dynamic',
  folate: 'dynamic',
  vitaminA: 'dynamic',
  vitaminK: 'dynamic',

  // Vitamins in mg - 1 decimal place
  vitaminB6: 1,
  vitaminC: 1,
};

function roundNutrientValue(nutrientKey, value) {
  if (value == null || isNaN(value)) return 0;
  if (value === 0) return 0;

  const precision = NUTRIENT_PRECISION[nutrientKey];

  // Dynamic precision based on magnitude
  if (precision === 'dynamic') {
    if (value >= 10) {
      // Whole numbers for large values
      return Math.round(value);
    } else if (value >= 1) {
      // 1 decimal for medium values
      return Math.round(value * 10) / 10;
    } else {
      // 2 decimals for small values
      return Math.round(value * 100) / 100;
    }
  }

  // Fixed precision
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function roundNutrients(nutrients, omitZeros = true) {
  if (!nutrients || typeof nutrients !== 'object') {
    return {};
  }

  const rounded = {};
  for (const [key, value] of Object.entries(nutrients)) {
    const roundedValue = roundNutrientValue(key, value);

    // Omit zeros if requested
    if (omitZeros && roundedValue === 0) {
      continue;
    }

    rounded[key] = roundedValue;
  }

  return rounded;
}

// --- Test Cases ---

console.log('🧪 Testing Nutrient Precision Rounding\n');

const testCases = [
  {
    name: 'Excessive precision (floating point errors)',
    input: {
      iron: 0.7979999999999999,
      protein: 4.560000000000001,
      calcium: 102.6000000000001,
    },
    expected: {
      iron: 0.8,
      protein: 4.6,
      calcium: 103,
    }
  },
  {
    name: 'Zero value omission',
    input: {
      protein: 10.5,
      vitaminD: 0,
      calcium: 250,
      omega3EPA: 0,
      fiber: 0,
    },
    expected: {
      protein: 10.5,
      calcium: 250,
      // zeros omitted
    }
  },
  {
    name: 'Small minerals (dynamic precision)',
    input: {
      iron: 2.847,
      zinc: 1.234,
      calcium: 5.678,
    },
    expected: {
      iron: 2.8, // <10, so 1 decimal
      zinc: 1.2,
      calcium: 5.7,
    }
  },
  {
    name: 'Large minerals (whole numbers)',
    input: {
      calcium: 276.847,
      potassium: 1396.523,
      magnesium: 43.891,
    },
    expected: {
      calcium: 277, // >=10, so whole number
      potassium: 1397,
      magnesium: 44,
    }
  },
  {
    name: 'Omega fatty acids (3 decimals)',
    input: {
      omega3ALA: 0.2689456,
      omega3EPA: 0.0085123,
      omega3DHA: 0.0140987,
    },
    expected: {
      omega3ALA: 0.269,
      omega3EPA: 0.009,
      omega3DHA: 0.014,
    }
  },
  {
    name: 'Macronutrients (1 decimal)',
    input: {
      protein: 7.123,
      fiber: 2.793,
      carbohydrates: 26.295,
      fat: 9.571,
    },
    expected: {
      protein: 7.1,
      fiber: 2.8,
      carbohydrates: 26.3,
      fat: 9.6,
    }
  },
  {
    name: 'Very small vitamins (2 decimals)',
    input: {
      vitaminD: 0.339,
      vitaminB12: 0.192,
      vitaminB6: 0.0465,
    },
    expected: {
      vitaminD: 0.34,
      vitaminB12: 0.19,
      // vitaminB6 rounds to 0.0 and is omitted
    }
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  const result = roundNutrients(testCase.input, true);

  let testPassed = true;

  // Check expected values
  for (const [key, expectedValue] of Object.entries(testCase.expected)) {
    if (result[key] !== expectedValue) {
      console.log(`  ❌ FAIL: ${key} = ${result[key]}, expected ${expectedValue}`);
      testPassed = false;
    }
  }

  // Check that zeros were omitted
  for (const [key, value] of Object.entries(testCase.input)) {
    if (value === 0 && result.hasOwnProperty(key)) {
      console.log(`  ❌ FAIL: Zero value for ${key} was not omitted`);
      testPassed = false;
    }
  }

  if (testPassed) {
    console.log(`  ✅ PASS`);
    passed++;
  } else {
    console.log(`  Input:  `, testCase.input);
    console.log(`  Result: `, result);
    console.log(`  Expected:`, testCase.expected);
    failed++;
  }

  console.log('');
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

// Size estimation
console.log('📊 Estimated Size Impact:\n');

const sampleBefore = {
  iron: 0.7979999999999999,
  protein: 4.560000000000001,
  calcium: 102.6000000000001,
  vitaminD: 0,
  omega3EPA: 0,
  fiber: 0,
};

const sampleAfter = roundNutrients(sampleBefore, true);

const beforeStr = JSON.stringify(sampleBefore);
const afterStr = JSON.stringify(sampleAfter);

console.log(`Before: ${beforeStr.length} chars`);
console.log(`After:  ${afterStr.length} chars`);
console.log(`Savings: ${beforeStr.length - afterStr.length} chars (${((1 - afterStr.length/beforeStr.length) * 100).toFixed(1)}% reduction)\n`);

process.exit(failed > 0 ? 1 : 0);
