#!/usr/bin/env node

/**
 * migrate-calcium-to-nutrients.cjs
 *
 * Migrates backup files from My Calcium (v2.x) to My Nutrients (v3.0)
 *
 * Transformations:
 * - FoodEntry: calcium → nutrients: { calcium }
 * - JournalEntry: totalCalcium → totalNutrients: { calcium }
 * - CalciumSettings → NutrientSettings with default nutrients
 * - CustomFood: calcium → nutrients: { calcium }
 * - Metadata: version 2.x → 3.0.0
 */

const fs = require("fs");
const path = require("path");

// --- Default Configuration ---

const DEFAULT_NUTRIENT_GOALS = {
  protein: 60,
  fiber: 25,
  calcium: 1200,
  vitaminD: 20,
};

const DEFAULT_DISPLAYED_NUTRIENTS = ['protein', 'calcium', 'fiber', 'vitaminD'];

// --- Argument Parsing ---

const args = process.argv.slice(2);
let inputFile = null;
let outputFile = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "--input":
      inputFile = args[++i];
      break;
    case "--output":
      outputFile = args[++i];
      break;
    case "--help":
      console.log(`
Usage: node migrate-calcium-to-nutrients.cjs --input <backup.json> --output <migrated-backup.json>
   or: node migrate-calcium-to-nutrients.cjs <backup.json> <migrated-backup.json>

Migrates My Calcium backup files (v2.x) to My Nutrients format (v3.0).

Options:
  --input <file>    Input backup file (My Calcium format)
  --output <file>   Output backup file (My Nutrients format)
  --help            Show this help message

Example:
  node migrate-calcium-to-nutrients.cjs \\
    --input calcium-backup-2025-12-01.json \\
    --output nutrients-backup-2025-12-01.json
`);
      process.exit(0);
    default:
      if (!arg.startsWith("--")) {
        if (!inputFile) inputFile = arg;
        else if (!outputFile) outputFile = arg;
      }
      break;
  }
}

if (!inputFile || !outputFile) {
  console.error("Usage: node migrate-calcium-to-nutrients.cjs --input <backup.json> --output <migrated-backup.json>");
  console.error("   or: node migrate-calcium-to-nutrients.cjs <backup.json> <migrated-backup.json>");
  process.exit(1);
}

// --- Migration Functions ---

function migrateFoodEntry(oldEntry) {
  const { calcium, ...rest } = oldEntry;

  return {
    ...rest,
    nutrients: {
      calcium: calcium || 0
    }
  };
}

function migrateCustomFood(oldFood) {
  const { calcium, ...rest } = oldFood;

  return {
    ...rest,
    nutrients: {
      calcium: calcium || 0
    }
  };
}

function migrateSettings(oldSettings) {
  const { dailyGoal, ...rest } = oldSettings;

  // Create nutrient goals
  const nutrientGoals = { ...DEFAULT_NUTRIENT_GOALS };

  // If there was a custom calcium goal, use it
  if (dailyGoal && dailyGoal !== 1200) {
    nutrientGoals.calcium = dailyGoal;
  }

  return {
    ...rest,
    nutrientGoals,
    displayedNutrients: DEFAULT_DISPLAYED_NUTRIENTS
  };
}

function migrateJournalEntries(oldJournalEntries) {
  const migratedEntries = {};

  for (const [date, foods] of Object.entries(oldJournalEntries)) {
    const migratedFoods = foods.map(migrateFoodEntry);

    // Calculate total nutrients from migrated foods
    const totalCalcium = migratedFoods.reduce((sum, food) => {
      return sum + (food.nutrients?.calcium || 0);
    }, 0);

    migratedEntries[date] = migratedFoods;
  }

  return migratedEntries;
}

function migrateBackup(oldBackup) {
  console.log("\n🔄 Migrating backup data...\n");

  // Validate input format
  if (!oldBackup.metadata || !oldBackup.preferences || !oldBackup.journalEntries) {
    throw new Error("Invalid backup format. Missing required fields: metadata, preferences, journalEntries");
  }

  console.log(`   Input version: ${oldBackup.metadata.version || 'unknown'}`);
  console.log(`   Journal entries: ${Object.keys(oldBackup.journalEntries).length} days`);
  console.log(`   Custom foods: ${oldBackup.customFoods?.length || 0}`);
  console.log("");

  // Migrate metadata
  const migratedMetadata = {
    version: "3.0.0",
    createdAt: new Date().toISOString(),
    appVersion: "My Nutrients v1.0.0",
    buildId: oldBackup.metadata.buildId || "migrated",
    syncGenerationId: oldBackup.metadata.syncGenerationId || null,
    migratedFrom: oldBackup.metadata.version || "2.x",
    migratedAt: new Date().toISOString()
  };

  // Migrate settings
  const migratedPreferences = migrateSettings(oldBackup.preferences);

  // Migrate custom foods
  const migratedCustomFoods = (oldBackup.customFoods || []).map(migrateCustomFood);

  // Migrate journal entries
  const migratedJournalEntries = migrateJournalEntries(oldBackup.journalEntries);

  // Create migrated backup
  const migratedBackup = {
    metadata: migratedMetadata,
    preferences: migratedPreferences,
    customFoods: migratedCustomFoods,
    favorites: oldBackup.favorites || [],
    hiddenFoods: oldBackup.hiddenFoods || [],
    servingPreferences: oldBackup.servingPreferences || [],
    journalEntries: migratedJournalEntries
  };

  return migratedBackup;
}

function validateMigration(oldBackup, newBackup) {
  console.log("\n✅ Validating migration...\n");

  const oldDays = Object.keys(oldBackup.journalEntries).length;
  const newDays = Object.keys(newBackup.journalEntries).length;

  const oldCustomFoods = oldBackup.customFoods?.length || 0;
  const newCustomFoods = newBackup.customFoods?.length || 0;

  const oldFavorites = oldBackup.favorites?.length || 0;
  const newFavorites = newBackup.favorites?.length || 0;

  console.log(`   Journal days: ${oldDays} → ${newDays} ${oldDays === newDays ? '✓' : '✗'}`);
  console.log(`   Custom foods: ${oldCustomFoods} → ${newCustomFoods} ${oldCustomFoods === newCustomFoods ? '✓' : '✗'}`);
  console.log(`   Favorites: ${oldFavorites} → ${newFavorites} ${oldFavorites === newFavorites ? '✓' : '✗'}`);
  console.log("");

  // Validate calcium values are preserved
  let sampleValidation = true;
  const sampleDates = Object.keys(oldBackup.journalEntries).slice(0, 3);

  for (const date of sampleDates) {
    const oldFoods = oldBackup.journalEntries[date];
    const newFoods = newBackup.journalEntries[date];

    const oldTotal = oldFoods.reduce((sum, f) => sum + (f.calcium || 0), 0);
    const newTotal = newFoods.reduce((sum, f) => sum + (f.nutrients?.calcium || 0), 0);

    const match = Math.abs(oldTotal - newTotal) < 0.01;
    console.log(`   ${date}: ${oldTotal.toFixed(1)}mg → ${newTotal.toFixed(1)}mg ${match ? '✓' : '✗'}`);

    if (!match) sampleValidation = false;
  }

  console.log("");

  if (!sampleValidation) {
    console.warn("⚠️  Warning: Some calcium values don't match. Please review the migration.");
  } else {
    console.log("✅ All validations passed!");
  }

  return sampleValidation;
}

// --- Main Execution ---

(async () => {
  try {
    console.log("🚀 My Calcium → My Nutrients Migration Tool\n");

    // Load input file
    console.log(`📖 Reading input file: ${inputFile}`);
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Input file not found: ${inputFile}`);
      process.exit(1);
    }

    const oldBackup = JSON.parse(fs.readFileSync(inputFile, "utf-8"));

    // Migrate
    const newBackup = migrateBackup(oldBackup);

    // Validate
    const isValid = validateMigration(oldBackup, newBackup);

    // Write output
    console.log(`💾 Writing migrated backup: ${outputFile}\n`);
    fs.writeFileSync(outputFile, JSON.stringify(newBackup, null, 2), "utf-8");

    const outputSize = fs.statSync(outputFile).size;
    console.log(`✅ Migration complete!`);
    console.log(`   Output file: ${outputFile}`);
    console.log(`   Size: ${(outputSize / 1024).toFixed(2)} KB`);
    console.log("");
    console.log("🎉 Your backup has been migrated to My Nutrients format (v3.0)!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Review the migrated backup file");
    console.log("2. Import it into My Nutrients app");
    console.log("3. Verify your journal entries and custom foods");
    console.log("4. Configure your desired nutrients in Settings");
    console.log("");

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
