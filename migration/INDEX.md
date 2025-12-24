# Migration Folder Index

**Purpose**: This folder contains migration scripts, data files, and backups for transitioning the single user of My Calcium to My Nutrients PWA.

**Last Updated**: December 18, 2025

---

## Overview

The migration process involves:
1. Converting Apple Health data to Calcium Tracker format
2. Merging multiple backup versions
3. Mapping old database IDs (sequential) to new stable appIds
4. Updating favorites, hidden foods, and serving preferences
5. Converting multi-nutrients structure for My Nutrients PWA

---

## Data Files

### Source Data

#### `CustomFoods.json` (3 KB)
- **Purpose**: Reference list of user's 15 custom foods
- **Contents**: Custom food definitions with calcium values, measures, IDs
- **Used By**: `calcium-converter.cjs`
- **Status**: ✅ Still needed - provides custom food definitions for migration
- **Notes**: Contains foods like "Calcium Supplement", "Ovaltine", "Greek Yogurt" brands, etc.

#### `apple-health-export.json` (80 KB)
- **Purpose**: Apple Health calcium records in JSON format
- **Contents**: Converted from XML export, contains calcium diary entries
- **Used By**: Used as input to `calcium-converter.cjs`
- **Status**: ✅ Still needed - contains missing data from August period
- **Notes**: Represents entries that were logged in Apple Health but not in the app

#### `calcium-export-2025-11-09.xml` (88 KB)
- **Purpose**: Raw Apple Health XML export from November 9, 2025
- **Contents**: HKQuantityTypeIdentifierDietaryCalcium records
- **Used By**: Source for `apple-health-export.json`
- **Status**: ⚠️ Reference only - already converted to JSON
- **Notes**: Original export file, can be archived after migration complete

#### `prod-foodDatabaseData.js` (656 KB)
- **Purpose**: Old production database from 8/22/25 deployment
- **Contents**: Food database with sequential IDs (pre-appId migration)
- **Used By**: `migrate-backup-enhanced.mjs` as old database reference
- **Status**: ✅ CRITICAL - needed to map old IDs to new appIds
- **Notes**: This is the database structure the user's device has (8/22 version)

---

## Backup Files (Calcium Tracker Format)

### Migrated Backups (For My Calcium)

#### `migrated-backup-2025-11-10.json` (184 KB)
- **Purpose**: First migrated backup with stable appIds
- **Date Coverage**: Through November 10, 2025
- **Status**: ⚠️ Superseded by 11-19 version
- **Contents**: Journal entries, custom foods, favorites, serving preferences with new appIds
- **Notes**: Does not include all November data

#### `migrated-backup-2025-11-10-migration-report.json` (112 KB)
- **Purpose**: Detailed migration report for 11-10 migration
- **Contents**: Match statistics, exact/collapsed/partial matches, unmatched foods
- **Status**: ℹ️ Reference only
- **Notes**: Shows 93% match rate for favorites/hidden foods

#### `migrated-backup-2025-11-12-appended.json` (184 KB)
- **Purpose**: Version with additional August data appended
- **Date Coverage**: Through November 12, 2025
- **Status**: ⚠️ Superseded by 11-19 version
- **Contents**: Includes Apple Health recovered data for August 16-19
- **Notes**: Intermediate version before latest export

#### `migrated-backup-2025-11-19.json` (200 KB)
- **Purpose**: **MOST RECENT** migrated backup with all data
- **Date Coverage**: Complete through November 19, 2025
- **Status**: ✅ **PRIMARY SOURCE** for My Nutrients migration
- **Contents**:
  - 122 journal entry days
  - 43 custom foods
  - 185/198 hidden foods (93%)
  - 4/5 favorites
  - 56/68 serving preferences (82%)
- **Notes**: This is the validated, complete backup ready for My Nutrients conversion

#### `migrated-backup-2025-11-19-migration-report.json` (117 KB)
- **Purpose**: Detailed migration report for 11-19 migration
- **Contents**: Match statistics, serving preference measure index matching
- **Status**: ℹ️ Reference documentation
- **Notes**: Documents enhanced migration with measure index preservation

---

## Migration Scripts

### Primary Migration Tools

#### `migrate-backup-enhanced.mjs` (48 KB, 1433 lines)
- **Purpose**: **MAIN MIGRATION SCRIPT** - Converts backups from old IDs to stable appIds
- **Language**: Node.js ES6 module
- **Key Features**:
  - Multi-measure format support (legacy and new)
  - Fuzzy name matching with Levenshtein distance
  - Collapsed food detection and mapping
  - Serving preference migration with measure index matching
  - Comprehensive match reporting (exact/collapsed/partial/unmatched)
  - Support for --force, --dry-run, --report-only modes
- **Status**: ✅ **CRITICAL** - Will need adaptation for My Nutrients
- **For My Nutrients**: Will need to:
  - Update to handle multi-nutrient structure (not just calcium)
  - Map nutrients from old database to new multi-nutrient format
  - Ensure all available nutrients are populated for matched foods
  - Keep calcium-only handling for custom foods that don't have matches

#### `calcium-converter.cjs` (21 KB, 574 lines)
- **Purpose**: Converts Apple Health XML export to Calcium Tracker backup format
- **Language**: Node.js CommonJS
- **Key Features**:
  - Parses Apple Health XML calcium records
  - Matches amounts to CustomFoods.json
  - Special handling for common amounts (24mg=Flax, 31mg=Zucchini, 50mg=Egg)
  - Daily match tracking for repeated amounts
  - Creates valid Calcium Tracker backup JSON
- **Status**: ✅ Still useful for any additional Apple Health imports
- **For My Nutrients**: May not be needed unless more Apple Health data surfaces
- **Notes**: Smart matching logic handles 300mg (1st=supplement, 2nd=Carnation, 3rd+=user-entered)

---

## Analysis & Verification Scripts

### Python Verification Tools

#### `merge_backups.py` (185 lines)
- **Purpose**: Merges multiple backup files with deduplication
- **Language**: Python 3
- **Usage**: Combines base backup with latest export
- **Status**: ℹ️ Utility script - may not be needed for My Nutrients
- **Notes**: Merges journal entries, custom foods, preferences intelligently

#### `analyze_migration.py` (189 lines)
- **Purpose**: Analyzes backup files and compares for completeness
- **Language**: Python 3
- **Key Features**:
  - Journal date coverage analysis
  - Custom food comparison
  - Favorites and serving preference tracking
  - Gap detection between backup versions
- **Status**: ✅ Useful for validation
- **Notes**: Helped identify missing August dates and custom foods

#### `check_august_dates.py` (42 lines)
- **Purpose**: Validates specific August 2025 dates in backups
- **Language**: Python 3
- **Status**: ℹ️ One-time check - purpose fulfilled
- **Notes**: Confirmed August 16-19 data from Apple Health

#### `final_comprehensive_check.py` (150 lines)
- **Purpose**: **VALIDATION SCRIPT** - Comprehensive pre-deployment checks
- **Language**: Python 3
- **Checks**:
  - Preferences/settings preservation
  - Hidden foods count (allows 10% loss)
  - Journal entry completeness
  - Custom foods preservation
  - Favorites migration (allows 1 loss for unmatched bison)
  - Serving preferences (allows 20% loss)
  - Metadata verification
- **Status**: ✅ **USE THIS** for final My Nutrients validation
- **Notes**: Validated 11-19 migration as ready for deployment

#### `verify_final_migration.py` (111 lines)
- **Purpose**: Critical data point verification
- **Language**: Python 3
- **Checks**: Specific dates, custom foods, appId structure
- **Status**: ✅ Useful template for My Nutrients verification
- **Notes**: Checks for appId structure (negative for custom, positive for database)

#### `verify_merged.py` (71 lines)
- **Purpose**: Verifies merged backup completeness
- **Language**: Python 3
- **Status**: ℹ️ Utility for merge process validation

---

## Migration Status & Next Steps

### Current State
- ✅ **My Calcium Migration**: Complete and validated through 11-19-2025
- ⏳ **My Nutrients Migration**: Ready to begin
- 📦 **Starting Point**: `migrated-backup-2025-11-19.json`

### For My Nutrients Migration

#### What We Have
1. Complete validated backup through 11-19 (122 days of data)
2. Stable appIds mapped from old database
3. All custom foods preserved (43 foods)
4. Favorites and serving preferences migrated

#### What We Need
1. **New backup from user's device** (current production, 8/22 deployment)
   - Will have all days since 11/19/2025 through present
   - Will use old database structure (sequential IDs, calcium-only)

2. **Update migration scripts**:
   - Modify `migrate-backup-enhanced.mjs` to handle multi-nutrients
   - For matched foods: populate all available nutrients from new DB
   - For custom foods: keep calcium-only (no nutrient data available)
   - Update favorites/serving preferences with new appIds

3. **New foodDatabaseData.js reference**:
   - Current My Nutrients database (with multi-nutrient structure)
   - Will be used to match foods and extract nutrient data

#### Migration Plan (High-Level)
1. Export latest backup from user's device (post 11/19/2025)
2. Use `migrated-backup-2025-11-19.json` as base (has 11/19 and earlier)
3. Append new entries from latest export to base
4. Run enhanced migration with new multi-nutrient DB
5. Transform journal entries to include all nutrients for matched foods
6. Validate with adapted verification scripts
7. Create My Nutrients restore file

---

## File Relevance Summary

### ✅ Critical for My Nutrients
- `prod-foodDatabaseData.js` - Old DB structure reference
- `migrate-backup-enhanced.mjs` - Main migration tool (needs updates)
- `migrated-backup-2025-11-19.json` - Validated base data
- `CustomFoods.json` - User's custom food definitions
- `final_comprehensive_check.py` - Validation template

### ⚠️ Needed but May Change
- `apple-health-export.json` - If more Apple Health data surfaces
- `calcium-converter.cjs` - If need to import more Apple Health data

### ℹ️ Reference/Documentation
- All migration reports (*.migration-report.json)
- Analysis scripts (analyze_migration.py, verify_*.py)
- `calcium-export-2025-11-09.xml` (original source, already converted)

### 🗑️ Can Archive After Migration
- Intermediate backups (11-10, 11-12 versions)
- `check_august_dates.py` (one-time validation)
- `merge_backups.py` (already merged)
- `verify_merged.py` (merge validation done)

---

## Key Decisions for My Nutrients

### Data Structure Changes
- **Old Format** (My Calcium):
  ```json
  {
    "name": "Milk, whole",
    "calcium": 276,
    "servingQuantity": 1,
    "servingUnit": "cup"
  }
  ```

- **New Format** (My Nutrients):
  ```json
  {
    "name": "Milk, whole",
    "nutrients": {
      "calcium": 276,
      "protein": 7.99,
      "vitaminD": 2.9,
      "fiber": 0,
      // ... more nutrients
    },
    "servingQuantity": 1,
    "servingUnit": "cup"
  }
  ```

### Migration Approach
1. **Database Foods**: Extract ALL available nutrients from new DB
2. **Custom Foods**: Keep as calcium-only (no nutrient data source)
3. **Backward Compatibility**: Support reading calcium-only entries
4. **Favorites/Serving Prefs**: Update appIds, no structural changes needed

---

## Notes
- User deployed 8/22/25 production version (calcium-only, sequential IDs)
- User has been using that version since then
- `migrated-backup-2025-11-19.json` represents most recent validated migration
- Missing document from original My Calcium repo will provide additional context
