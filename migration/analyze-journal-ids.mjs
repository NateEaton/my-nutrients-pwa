#!/usr/bin/env node

/**
 * analyze-journal-ids.mjs
 *
 * Analyzes journal entry ID fields in backup files to identify inconsistencies.
 * Reports on:
 * - Custom food entries with/without customFoodId
 * - Database food entries with/without appId
 * - Legacy positive IDs in customFoodId field
 * - Consistency of isCustom flag with ID fields
 *
 * Usage:
 *   node analyze-journal-ids.mjs <backup-file>
 *   node analyze-journal-ids.mjs --input <backup-file> [--verbose]
 */

import fs from 'fs';
import path from 'path';

// Parse command-line arguments
const args = process.argv.slice(2);
let inputFile = null;
let verbose = false;
let exportCsv = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--input':
      inputFile = args[++i];
      break;
    case '--verbose':
    case '-v':
      verbose = true;
      break;
    case '--export-csv':
      exportCsv = args[++i];
      break;
    case '--help':
    case '-h':
      console.log(`
Usage: node analyze-journal-ids.mjs <backup-file>
   or: node analyze-journal-ids.mjs --input <backup-file> [--verbose] [--export-csv <output.csv>]

Analyzes journal entry ID fields in backup files.

Options:
  --input, -i          Input backup file (required)
  --verbose, -v        Show detailed entry-by-entry information
  --export-csv <file>  Export database foods without appId to CSV for manual mapping
  --help, -h           Show this help message

Example:
  node analyze-journal-ids.mjs calcium-tracker-backup-2025-12-24.json
  node analyze-journal-ids.mjs --input merged-output.json --verbose
  node analyze-journal-ids.mjs --input nutrients-restore.json --export-csv missing-db-foods.csv
`);
      process.exit(0);
    default:
      if (!arg.startsWith('--') && !inputFile) {
        inputFile = arg;
      }
      break;
  }
}

if (!inputFile) {
  console.error('❌ Error: Missing required argument: backup file');
  console.error('Usage: node analyze-journal-ids.mjs <backup-file>');
  console.error('   or: node analyze-journal-ids.mjs --input <backup-file>');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: File not found: ${inputFile}`);
  process.exit(1);
}

console.log(`\n${'='.repeat(70)}`);
console.log('📊 JOURNAL ENTRY ID ANALYSIS');
console.log('='.repeat(70));
console.log(`\n📁 Analyzing: ${inputFile}`);

// Load backup file
let backup;
try {
  const content = fs.readFileSync(inputFile, 'utf8');
  backup = JSON.parse(content);
} catch (error) {
  console.error(`❌ Error reading backup file: ${error.message}`);
  process.exit(1);
}

// Validate structure
if (!backup.journalEntries || typeof backup.journalEntries !== 'object') {
  console.error('❌ Error: Backup file missing journalEntries');
  process.exit(1);
}

// Initialize counters
const stats = {
  totalEntries: 0,
  totalDays: 0,

  // Custom food entries
  customFoodEntries: 0,
  customWithId: 0,
  customWithoutId: 0,
  customWithPositiveId: 0, // Legacy issue

  // Database food entries
  databaseFoodEntries: 0,
  databaseWithAppId: 0,
  databaseWithoutAppId: 0,
  databaseWithCustomFoodId: 0, // Incorrect field

  // Consistency issues
  inconsistentEntries: 0,
  bothIdsPresent: 0,
  isFlagMismatch: 0,
};

const issues = {
  customWithoutId: [],
  customWithPositiveId: [],
  databaseWithoutAppId: [],
  databaseWithCustomFoodId: [],
  bothIdsPresent: [],
  isFlagMismatch: [],
};

// Analyze each day's entries
for (const [date, entries] of Object.entries(backup.journalEntries)) {
  if (!Array.isArray(entries)) continue;
  stats.totalDays++;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    stats.totalEntries++;

    const isCustom = entry.isCustom === true;
    const hasCustomFoodId = entry.customFoodId !== undefined && entry.customFoodId !== null;
    const hasAppId = entry.appId !== undefined && entry.appId !== null;
    const customFoodIdValue = entry.customFoodId;

    // Analyze custom food entries
    if (isCustom) {
      stats.customFoodEntries++;

      if (hasCustomFoodId) {
        stats.customWithId++;

        // Check if ID is positive (legacy issue)
        if (customFoodIdValue > 0) {
          stats.customWithPositiveId++;
          stats.inconsistentEntries++;
          issues.customWithPositiveId.push({
            date,
            index: i,
            name: entry.name,
            customFoodId: customFoodIdValue
          });
        }
      } else {
        stats.customWithoutId++;
        stats.inconsistentEntries++;
        issues.customWithoutId.push({
          date,
          index: i,
          name: entry.name
        });
      }

      // Custom food shouldn't have appId
      if (hasAppId) {
        stats.bothIdsPresent++;
        stats.inconsistentEntries++;
        issues.bothIdsPresent.push({
          date,
          index: i,
          name: entry.name,
          customFoodId: customFoodIdValue,
          appId: entry.appId
        });
      }
    }
    // Analyze database food entries
    else {
      stats.databaseFoodEntries++;

      if (hasAppId) {
        stats.databaseWithAppId++;
      } else {
        stats.databaseWithoutAppId++;
        // Not necessarily an error - might be intended for backward compatibility
        // Store full entry data for CSV export
        issues.databaseWithoutAppId.push({
          date,
          index: i,
          name: entry.name,
          nutrients: entry.nutrients || { calcium: entry.calcium },
          servingQuantity: entry.servingQuantity,
          servingUnit: entry.servingUnit,
          measure: entry.measure
        });
      }

      // Database food shouldn't have customFoodId
      if (hasCustomFoodId) {
        stats.databaseWithCustomFoodId++;
        stats.inconsistentEntries++;
        issues.databaseWithCustomFoodId.push({
          date,
          index: i,
          name: entry.name,
          customFoodId: customFoodIdValue
        });
      }

      // Both IDs present
      if (hasAppId && hasCustomFoodId) {
        stats.bothIdsPresent++;
        stats.inconsistentEntries++;
        issues.bothIdsPresent.push({
          date,
          index: i,
          name: entry.name,
          appId: entry.appId,
          customFoodId: customFoodIdValue
        });
      }
    }

    // Check isCustom flag consistency
    if (hasCustomFoodId && !isCustom) {
      stats.isFlagMismatch++;
      stats.inconsistentEntries++;
      issues.isFlagMismatch.push({
        date,
        index: i,
        name: entry.name,
        issue: 'has customFoodId but isCustom is false/missing'
      });
    }
  }
}

// Print summary
console.log(`\n${'─'.repeat(70)}`);
console.log('📈 SUMMARY STATISTICS');
console.log('─'.repeat(70));

console.log(`\n📅 Coverage:`);
console.log(`   Total days:    ${stats.totalDays}`);
console.log(`   Total entries: ${stats.totalEntries}`);

console.log(`\n🎨 Custom Food Entries:`);
console.log(`   Total:                ${stats.customFoodEntries}`);
console.log(`   ✅ With customFoodId:  ${stats.customWithId} (${stats.customWithId > 0 ? ((stats.customWithId / stats.customFoodEntries) * 100).toFixed(1) : 0}%)`);
console.log(`   ⚠️  Without customFoodId: ${stats.customWithoutId} (${stats.customFoodEntries > 0 ? ((stats.customWithoutId / stats.customFoodEntries) * 100).toFixed(1) : 0}%)`);
if (stats.customWithPositiveId > 0) {
  console.log(`   ❌ With POSITIVE ID (legacy): ${stats.customWithPositiveId}`);
}

console.log(`\n📍 Database Food Entries:`);
console.log(`   Total:              ${stats.databaseFoodEntries}`);
console.log(`   ✅ With appId:       ${stats.databaseWithAppId} (${stats.databaseFoodEntries > 0 ? ((stats.databaseWithAppId / stats.databaseFoodEntries) * 100).toFixed(1) : 0}%)`);
console.log(`   ℹ️  Without appId:   ${stats.databaseWithoutAppId} (${stats.databaseFoodEntries > 0 ? ((stats.databaseWithoutAppId / stats.databaseFoodEntries) * 100).toFixed(1) : 0}%)`);
if (stats.databaseWithCustomFoodId > 0) {
  console.log(`   ❌ With customFoodId (incorrect): ${stats.databaseWithCustomFoodId}`);
}

console.log(`\n🔍 Consistency Issues:`);
console.log(`   Total inconsistent entries: ${stats.inconsistentEntries}`);
if (stats.bothIdsPresent > 0) {
  console.log(`   ❌ Has BOTH appId and customFoodId: ${stats.bothIdsPresent}`);
}
if (stats.isFlagMismatch > 0) {
  console.log(`   ❌ isCustom flag mismatch: ${stats.isFlagMismatch}`);
}

// Print detailed issues if verbose or if there are problems
const hasIssues = stats.inconsistentEntries > 0 || stats.databaseWithoutAppId > 0 || stats.customWithoutId > 0;

if (verbose || hasIssues) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log('🔎 DETAILED ISSUES');
  console.log('─'.repeat(70));

  if (issues.customWithoutId.length > 0) {
    console.log(`\n⚠️  Custom foods without customFoodId (${issues.customWithoutId.length}):`);
    issues.customWithoutId.slice(0, verbose ? Infinity : 10).forEach(issue => {
      console.log(`   ${issue.date} [${issue.index}]: "${issue.name}"`);
    });
    if (issues.customWithoutId.length > 10 && !verbose) {
      console.log(`   ... and ${issues.customWithoutId.length - 10} more (use --verbose to see all)`);
    }
  }

  if (issues.customWithPositiveId.length > 0) {
    console.log(`\n❌ Custom foods with POSITIVE customFoodId (${issues.customWithPositiveId.length}):`);
    issues.customWithPositiveId.slice(0, verbose ? Infinity : 10).forEach(issue => {
      console.log(`   ${issue.date} [${issue.index}]: "${issue.name}" (ID: ${issue.customFoodId})`);
    });
    if (issues.customWithPositiveId.length > 10 && !verbose) {
      console.log(`   ... and ${issues.customWithPositiveId.length - 10} more (use --verbose to see all)`);
    }
  }

  if (issues.databaseWithoutAppId.length > 0 && verbose) {
    console.log(`\nℹ️  Database foods without appId (${issues.databaseWithoutAppId.length}):`);
    console.log(`   (This may be intentional for backward compatibility)`);
    issues.databaseWithoutAppId.slice(0, 20).forEach(issue => {
      console.log(`   ${issue.date} [${issue.index}]: "${issue.name}"`);
    });
    if (issues.databaseWithoutAppId.length > 20) {
      console.log(`   ... and ${issues.databaseWithoutAppId.length - 20} more`);
    }
  }

  if (issues.databaseWithCustomFoodId.length > 0) {
    console.log(`\n❌ Database foods with customFoodId (incorrect) (${issues.databaseWithCustomFoodId.length}):`);
    issues.databaseWithCustomFoodId.slice(0, verbose ? Infinity : 10).forEach(issue => {
      console.log(`   ${issue.date} [${issue.index}]: "${issue.name}" (customFoodId: ${issue.customFoodId})`);
    });
    if (issues.databaseWithCustomFoodId.length > 10 && !verbose) {
      console.log(`   ... and ${issues.databaseWithCustomFoodId.length - 10} more (use --verbose to see all)`);
    }
  }

  if (issues.bothIdsPresent.length > 0) {
    console.log(`\n❌ Entries with BOTH appId and customFoodId (${issues.bothIdsPresent.length}):`);
    issues.bothIdsPresent.forEach(issue => {
      console.log(`   ${issue.date} [${issue.index}]: "${issue.name}"`);
      console.log(`      appId: ${issue.appId}, customFoodId: ${issue.customFoodId}`);
    });
  }

  if (issues.isFlagMismatch.length > 0) {
    console.log(`\n❌ isCustom flag mismatch (${issues.isFlagMismatch.length}):`);
    issues.isFlagMismatch.forEach(issue => {
      console.log(`   ${issue.date} [${issue.index}]: "${issue.name}"`);
      console.log(`      ${issue.issue}`);
    });
  }
}

// Print recommendations
console.log(`\n${'─'.repeat(70)}`);
console.log('💡 RECOMMENDATIONS');
console.log('─'.repeat(70));

if (stats.inconsistentEntries === 0 && stats.customWithoutId === 0 && stats.databaseWithAppId === stats.databaseFoodEntries) {
  console.log('\n✅ All journal entries have consistent ID fields!');
  console.log('   No cleanup needed.');
} else {
  console.log('\n📋 Cleanup actions recommended:');

  if (stats.customWithoutId > 0) {
    console.log(`\n1. Backfill ${stats.customWithoutId} custom food entries missing customFoodId`);
    console.log('   - Match by name + calcium value to custom foods');
    console.log('   - Use cleanup-journal-ids.mjs script');
  }

  if (stats.customWithPositiveId > 0) {
    console.log(`\n2. Fix ${stats.customWithPositiveId} custom food entries with positive IDs`);
    console.log('   - These should have negative IDs (-1, -2, -3, ...)');
    console.log('   - May need to remap to correct custom food definitions');
  }

  if (stats.databaseWithoutAppId > 0) {
    console.log(`\n3. Consider backfilling ${stats.databaseWithoutAppId} database food entries missing appId`);
    console.log('   - Match by name to current database');
    console.log('   - Improves food history tracking');
    console.log('   - Not critical if name matching is acceptable');
  }

  if (stats.databaseWithCustomFoodId > 0) {
    console.log(`\n4. Fix ${stats.databaseWithCustomFoodId} database foods with customFoodId field`);
    console.log('   - Move customFoodId value to appId field');
    console.log('   - Database foods should use appId, not customFoodId');
  }

  if (stats.bothIdsPresent > 0 || stats.isFlagMismatch > 0) {
    console.log(`\n5. Fix consistency issues (${stats.bothIdsPresent + stats.isFlagMismatch} entries)`);
    console.log('   - Entries should have EITHER appId OR customFoodId, not both');
    console.log('   - isCustom flag should match ID type');
  }

  console.log('\n📝 Next steps:');
  console.log('   1. Review the issues above');
  console.log('   2. Run cleanup-journal-ids.mjs to fix inconsistencies');
  console.log('   3. Run this analysis again to verify cleanup');
}

console.log(`\n${'='.repeat(70)}\n`);

// Export CSV if requested
if (exportCsv && issues.databaseWithoutAppId.length > 0) {
  console.log(`\n📊 Exporting database foods without appId to CSV...`);

  // Aggregate by food name
  const foodMap = new Map();

  for (const entry of issues.databaseWithoutAppId) {
    if (!foodMap.has(entry.name)) {
      foodMap.set(entry.name, {
        name: entry.name,
        count: 0,
        sampleNutrients: entry.nutrients,
        sampleServing: `${entry.servingQuantity || ''} ${entry.servingUnit || entry.measure || ''}`.trim(),
        sampleDate: entry.date,
        dates: []
      });
    }
    const food = foodMap.get(entry.name);
    food.count++;
    food.dates.push(entry.date);
  }

  // Convert to sorted array (by count descending)
  const foods = Array.from(foodMap.values()).sort((a, b) => b.count - a.count);

  // Build CSV content
  const csvLines = [];

  // Header
  csvLines.push([
    'name',
    'count',
    'calcium',
    'protein',
    'fiber',
    'vitaminD',
    'sample_serving',
    'sample_date',
    'targetAppId',
    'convertToCustom'
  ].join(','));

  // Data rows
  for (const food of foods) {
    const nutrients = food.sampleNutrients || {};
    csvLines.push([
      `"${food.name.replace(/"/g, '""')}"`, // Escape quotes in name
      food.count,
      nutrients.calcium || '',
      nutrients.protein || '',
      nutrients.fiber || '',
      nutrients.vitaminD || '',
      `"${food.sampleServing.replace(/"/g, '""')}"`,
      food.sampleDate,
      '', // targetAppId - user fills this in
      ''  // convertToCustom - user fills this in (TRUE/FALSE)
    ].join(','));
  }

  // Write CSV file
  try {
    fs.writeFileSync(exportCsv, csvLines.join('\n'), 'utf8');
    console.log(`✅ Exported ${foods.length} unique database foods to: ${exportCsv}`);
    console.log(`   Total occurrences: ${issues.databaseWithoutAppId.length}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Open ${exportCsv} in a spreadsheet application`);
    console.log(`   2. For each food, either:`);
    console.log(`      a) Fill in targetAppId with matching database food appId, OR`);
    console.log(`      b) Set convertToCustom to TRUE to convert to custom food`);
    console.log(`   3. Save as database-food-mapping.json (see cleanup script for format)`);
    console.log(`   4. Run cleanup-journal-ids.mjs with --db-food-mapping flag`);
  } catch (error) {
    console.error(`❌ Error writing CSV file: ${error.message}`);
  }
} else if (exportCsv && issues.databaseWithoutAppId.length === 0) {
  console.log(`\nℹ️  No database foods without appId to export.`);
}
