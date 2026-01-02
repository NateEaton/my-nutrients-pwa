#!/usr/bin/env node

/**
 * diff-validator.cjs (Hybrid Pipeline Stage 10)
 *
 * Compares NEW vs OLD food database output to validate pipeline changes.
 * Detects threshold violations that may indicate:
 * - Raw/cooked mismatches
 * - Density transfer errors
 * - Unexpected filtering changes
 *
 * Output: Validation report with warnings and migration safety assessment
 */

const fs = require('fs');
const path = require('path');

// --- Validation Thresholds ---
const THRESHOLDS = {
  calorieShiftPer100g: 0.15,    // 15% calorie change suggests raw/cooked mismatch
  servingWeightShift: 0.10,     // 10% serving weight change suggests density issue
  micronutrientDrop: 0.50,      // 50% drop in micronutrient suggests FF sparsity
  foodCountChange: 0.05,        // 5% food count change suggests filtering change
  nutrientValueShift: 0.20,     // 20% shift in key nutrient values
};

// Key nutrients to track for changes
const KEY_NUTRIENTS = ['protein', 'calcium', 'fiber', 'vitaminD', 'iron', 'potassium', 'carbohydrates', 'fat'];

// --- Argument Parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    oldFile: null,
    newFile: null,
    outputFile: 'diff_report',
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--old' && i + 1 < args.length) {
      config.oldFile = args[++i];
    } else if (arg === '--new' && i + 1 < args.length) {
      config.newFile = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      config.outputFile = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--help') {
      console.log(`
Usage: node diff-validator.cjs [OPTIONS]

Compare OLD and NEW food databases to validate pipeline changes.

Options:
  --old <file>       Old/reference database JSON or JS file (required)
  --new <file>       New database JSON or JS file (required)
  --output <name>    Output report file base name (default: diff_report)
  --verbose, -v      Show detailed per-food changes
  --help             Show this help message

Example:
  node diff-validator.cjs --old foodDatabaseData.js.bak --new foodDatabaseData.js
`);
      process.exit(0);
    }
  }

  if (!config.oldFile || !config.newFile) {
    console.error('Error: Both --old and --new files are required');
    process.exit(1);
  }

  return config;
}

// --- Data Loading ---

function loadDatabase(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Try to parse as JSON first
  try {
    const data = JSON.parse(content);
    return data.foods || data.candidates || data;
  } catch (e) {
    // Not JSON, try to extract from JS module
    // Look for DB = [...] or DEFAULT_FOOD_DATABASE = [...]
    const dbMatch = content.match(/export const DB = (\[[\s\S]*?\]);/);
    const defaultMatch = content.match(/export const DEFAULT_FOOD_DATABASE = (\[[\s\S]*?\]);/);

    if (dbMatch) {
      try {
        return JSON.parse(dbMatch[1]);
      } catch (e2) {
        console.error('Error parsing DB export:', e2.message);
      }
    }

    if (defaultMatch) {
      try {
        return JSON.parse(defaultMatch[1]);
      } catch (e2) {
        console.error('Error parsing DEFAULT_FOOD_DATABASE export:', e2.message);
      }
    }

    console.error(`Error: Could not parse ${filePath} as JSON or JS module`);
    process.exit(1);
  }
}

// --- Comparison Functions ---

function buildFoodIndex(foods) {
  const byId = new Map();
  const byName = new Map();

  for (const food of foods) {
    // Handle both minified and non-minified formats
    const id = food.id || food.i || food.appId;
    const name = food.name || food.n;

    if (id) {
      byId.set(id, food);
    }
    if (name) {
      const normName = name.toLowerCase().trim();
      byName.set(normName, food);
    }
  }

  return { byId, byName };
}

function getNutrients(food) {
  // Handle both minified and regular formats
  return food.nutrientsPer100g || food.n100 || {};
}

function getName(food) {
  return food.name || food.n || 'Unknown';
}

function getId(food) {
  return food.id || food.i || food.appId || 0;
}

function getMeasures(food) {
  return food.measures || food.ms || [];
}

function getFirstServingWeight(food) {
  const measures = getMeasures(food);
  if (measures.length === 0) return 100;

  const first = measures[0];
  return first.gramWeight || first.g || 100;
}

function calculateCalories(nutrients) {
  const protein = nutrients.protein || nutrients.p || 0;
  const carbs = nutrients.carbohydrates || nutrients.ch || 0;
  const fat = nutrients.fat || nutrients.ft || 0;

  return (protein * 4) + (carbs * 4) + (fat * 9);
}

function compareFood(oldFood, newFood) {
  const changes = {
    name: getName(newFood),
    id: getId(newFood),
    issues: [],
    nutrientChanges: {}
  };

  const oldNutrients = getNutrients(oldFood);
  const newNutrients = getNutrients(newFood);

  // Check calorie shift
  const oldCalories = calculateCalories(oldNutrients);
  const newCalories = calculateCalories(newNutrients);

  if (oldCalories > 0) {
    const calorieShift = Math.abs(newCalories - oldCalories) / oldCalories;
    if (calorieShift > THRESHOLDS.calorieShiftPer100g) {
      changes.issues.push({
        type: 'calorie_shift',
        severity: 'high',
        message: `Calorie shift: ${oldCalories.toFixed(0)} → ${newCalories.toFixed(0)} (${(calorieShift * 100).toFixed(1)}%)`,
        old: oldCalories,
        new: newCalories,
        shift: calorieShift
      });
    }
  }

  // Check serving weight shift
  const oldWeight = getFirstServingWeight(oldFood);
  const newWeight = getFirstServingWeight(newFood);

  if (oldWeight > 0 && oldWeight !== 100) {
    const weightShift = Math.abs(newWeight - oldWeight) / oldWeight;
    if (weightShift > THRESHOLDS.servingWeightShift) {
      changes.issues.push({
        type: 'serving_weight_shift',
        severity: 'medium',
        message: `Serving weight shift: ${oldWeight}g → ${newWeight}g (${(weightShift * 100).toFixed(1)}%)`,
        old: oldWeight,
        new: newWeight,
        shift: weightShift
      });
    }
  }

  // Check key nutrient changes
  for (const nutrient of KEY_NUTRIENTS) {
    const oldValue = oldNutrients[nutrient] || 0;
    const newValue = newNutrients[nutrient] || 0;

    if (oldValue > 0) {
      const shift = (newValue - oldValue) / oldValue;

      changes.nutrientChanges[nutrient] = {
        old: oldValue,
        new: newValue,
        shift: shift
      };

      // Check for significant drop
      if (shift < -THRESHOLDS.micronutrientDrop) {
        changes.issues.push({
          type: 'nutrient_drop',
          severity: 'medium',
          message: `${nutrient} dropped: ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} (${(shift * 100).toFixed(1)}%)`,
          nutrient: nutrient,
          old: oldValue,
          new: newValue,
          shift: shift
        });
      }

      // Check for significant increase (may indicate raw→cooked swap)
      if (shift > THRESHOLDS.nutrientValueShift) {
        changes.issues.push({
          type: 'nutrient_increase',
          severity: 'low',
          message: `${nutrient} increased: ${oldValue.toFixed(2)} → ${newValue.toFixed(2)} (+${(shift * 100).toFixed(1)}%)`,
          nutrient: nutrient,
          old: oldValue,
          new: newValue,
          shift: shift
        });
      }
    }
  }

  return changes;
}

// --- Main Processing ---

function main() {
  const config = parseArgs();

  console.log('\n=== Diff Validator (Hybrid Pipeline) ===\n');
  console.log(`Old database: ${config.oldFile}`);
  console.log(`New database: ${config.newFile}\n`);

  // Load databases
  const oldFoods = loadDatabase(config.oldFile);
  const newFoods = loadDatabase(config.newFile);

  console.log(`Old database: ${oldFoods.length} foods`);
  console.log(`New database: ${newFoods.length} foods\n`);

  // Build indices
  const oldIndex = buildFoodIndex(oldFoods);
  const newIndex = buildFoodIndex(newFoods);

  // Statistics
  const stats = {
    matched: 0,
    added: 0,
    removed: 0,
    unchanged: 0,
    withIssues: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0
  };

  const issues = [];
  const addedFoods = [];
  const removedFoods = [];

  // Check for removed foods
  for (const [id, oldFood] of oldIndex.byId) {
    if (!newIndex.byId.has(id)) {
      const name = getName(oldFood);
      // Check if exists by name
      if (!newIndex.byName.has(name.toLowerCase().trim())) {
        removedFoods.push({ id, name });
        stats.removed++;
      }
    }
  }

  // Check for added foods
  for (const [id, newFood] of newIndex.byId) {
    if (!oldIndex.byId.has(id)) {
      const name = getName(newFood);
      // Check if exists by name
      if (!oldIndex.byName.has(name.toLowerCase().trim())) {
        addedFoods.push({ id, name });
        stats.added++;
      }
    }
  }

  // Compare matched foods
  for (const [id, newFood] of newIndex.byId) {
    let oldFood = oldIndex.byId.get(id);

    if (!oldFood) {
      // Try to match by name
      const name = getName(newFood);
      oldFood = oldIndex.byName.get(name.toLowerCase().trim());
    }

    if (oldFood) {
      stats.matched++;
      const comparison = compareFood(oldFood, newFood);

      if (comparison.issues.length > 0) {
        stats.withIssues++;
        issues.push(comparison);

        // Count severity levels
        for (const issue of comparison.issues) {
          if (issue.severity === 'high') stats.highSeverity++;
          else if (issue.severity === 'medium') stats.mediumSeverity++;
          else stats.lowSeverity++;
        }
      } else {
        stats.unchanged++;
      }
    }
  }

  // Check food count change threshold
  const countChange = Math.abs(newFoods.length - oldFoods.length) / oldFoods.length;
  const countChangeWarning = countChange > THRESHOLDS.foodCountChange;

  // Generate report
  const report = {
    generated: new Date().toISOString(),
    files: {
      old: config.oldFile,
      new: config.newFile
    },
    summary: {
      oldCount: oldFoods.length,
      newCount: newFoods.length,
      matched: stats.matched,
      added: stats.added,
      removed: stats.removed,
      unchanged: stats.unchanged,
      withIssues: stats.withIssues,
      highSeverityIssues: stats.highSeverity,
      mediumSeverityIssues: stats.mediumSeverity,
      lowSeverityIssues: stats.lowSeverity,
      countChange: countChange,
      countChangeWarning: countChangeWarning
    },
    thresholds: THRESHOLDS,
    addedFoods: addedFoods.slice(0, 50), // Limit for readability
    removedFoods: removedFoods.slice(0, 50),
    issues: issues.slice(0, 100) // Limit for readability
  };

  // Output summary
  console.log('=== Validation Summary ===');
  console.log(`Matched foods: ${stats.matched}`);
  console.log(`Added foods: ${stats.added}`);
  console.log(`Removed foods: ${stats.removed}`);
  console.log(`Foods with issues: ${stats.withIssues}`);
  console.log(`  - High severity: ${stats.highSeverity}`);
  console.log(`  - Medium severity: ${stats.mediumSeverity}`);
  console.log(`  - Low severity: ${stats.lowSeverity}`);
  console.log('');

  if (countChangeWarning) {
    console.log(`⚠️  WARNING: Food count changed by ${(countChange * 100).toFixed(1)}% (threshold: ${(THRESHOLDS.foodCountChange * 100)}%)`);
  }

  if (stats.highSeverity > 0) {
    console.log(`⚠️  WARNING: ${stats.highSeverity} high-severity issues detected!`);
    console.log('   These may indicate raw/cooked mismatches or significant errors.');
  }

  // Show top issues if verbose
  if (config.verbose && issues.length > 0) {
    console.log('\n=== Top Issues ===');
    const topIssues = issues
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 10);

    for (const food of topIssues) {
      console.log(`\n${food.name} (ID: ${food.id}):`);
      for (const issue of food.issues) {
        const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`  ${severity} ${issue.message}`);
      }
    }
  }

  // Write JSON report
  const jsonPath = `${config.outputFile}.json`;
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report written: ${jsonPath}`);

  // Write text summary
  const textPath = `${config.outputFile}.txt`;
  const textReport = formatTextReport(report);
  fs.writeFileSync(textPath, textReport);
  console.log(`✅ Summary written: ${textPath}`);

  // Exit with error code if high-severity issues
  if (stats.highSeverity > 10) {
    console.log('\n❌ VALIDATION FAILED: Too many high-severity issues');
    process.exit(1);
  }

  console.log('\n=== Diff Validation Complete ===\n');
}

function formatTextReport(report) {
  const lines = [];

  lines.push('=== Food Database Diff Report ===');
  lines.push(`Generated: ${report.generated}`);
  lines.push(`Old: ${report.files.old} (${report.summary.oldCount} foods)`);
  lines.push(`New: ${report.files.new} (${report.summary.newCount} foods)`);
  lines.push('');

  lines.push('=== Summary ===');
  lines.push(`Matched: ${report.summary.matched}`);
  lines.push(`Added: ${report.summary.added}`);
  lines.push(`Removed: ${report.summary.removed}`);
  lines.push(`Unchanged: ${report.summary.unchanged}`);
  lines.push(`With issues: ${report.summary.withIssues}`);
  lines.push('');

  lines.push('=== Issue Severity ===');
  lines.push(`High: ${report.summary.highSeverityIssues}`);
  lines.push(`Medium: ${report.summary.mediumSeverityIssues}`);
  lines.push(`Low: ${report.summary.lowSeverityIssues}`);
  lines.push('');

  if (report.summary.countChangeWarning) {
    lines.push(`⚠️ Food count changed by ${(report.summary.countChange * 100).toFixed(1)}%`);
    lines.push('');
  }

  if (report.removedFoods.length > 0) {
    lines.push('=== Removed Foods (sample) ===');
    for (const food of report.removedFoods.slice(0, 20)) {
      lines.push(`  - ${food.name} (ID: ${food.id})`);
    }
    if (report.removedFoods.length > 20) {
      lines.push(`  ... and ${report.removedFoods.length - 20} more`);
    }
    lines.push('');
  }

  if (report.addedFoods.length > 0) {
    lines.push('=== Added Foods (sample) ===');
    for (const food of report.addedFoods.slice(0, 20)) {
      lines.push(`  + ${food.name} (ID: ${food.id})`);
    }
    if (report.addedFoods.length > 20) {
      lines.push(`  ... and ${report.addedFoods.length - 20} more`);
    }
    lines.push('');
  }

  if (report.issues.length > 0) {
    lines.push('=== Foods with Issues (sample) ===');
    const sortedIssues = report.issues
      .filter(f => f.issues.some(i => i.severity === 'high'))
      .slice(0, 20);

    for (const food of sortedIssues) {
      lines.push(`\n${food.name}:`);
      for (const issue of food.issues) {
        lines.push(`  [${issue.severity.toUpperCase()}] ${issue.message}`);
      }
    }
  }

  return lines.join('\n');
}

// Run
if (require.main === module) {
  main();
}

module.exports = {
  loadDatabase,
  buildFoodIndex,
  compareFood,
  THRESHOLDS
};
