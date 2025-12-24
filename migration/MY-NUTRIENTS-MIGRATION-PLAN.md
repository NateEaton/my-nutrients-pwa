# My Nutrients Migration Plan

**Created**: December 18, 2025
**Target**: Migrate from My Calcium (prod 8/22/25) to My Nutrients PWA
**User**: Single user (wife) with validated data through Nov 19, 2025

---

## Executive Summary

This document outlines the complete migration plan to transform the user's My Calcium data into My Nutrients format. The migration involves:

1. **Starting Point**: Validated My Calcium backup through Nov 19, 2025 (`migrated-backup-2025-11-19.json`)
2. **New Data**: Export from production device (Nov 19 → present)
3. **Transformation**: Convert calcium-only journal entries to multi-nutrient format
4. **Validation**: Ensure data integrity and completeness
5. **Deployment**: Create My Nutrients restore file

---

## Current State

### Production Environment
- **Deployed Version**: My Calcium (8/22/2025)
- **Database Structure**: Sequential IDs, single-nutrient (calcium only)
- **User's Device**: Running production version since August 22, 2025
- **Data Status**: Active daily usage through present

### Validated Migration Data
**File**: `migrated-backup-2025-11-19.json` (200 KB)
- ✅ **Journal Entries**: 122 days (June 7 - Nov 19, 2025)
- ✅ **Custom Foods**: 43 foods with calcium values
- ✅ **App Preferences**: Daily goal (1500mg), sort settings, theme
- ✅ **Hidden Foods**: 185 foods migrated (93% success rate)
- ✅ **Favorites**: 4 foods migrated
- ✅ **Serving Preferences**: 56 preferences with measure indices
- ✅ **Stable AppIds**: All database foods mapped to new appId system
- ✅ **Custom Food IDs**: Using negative IDs (-1, -2, -3, etc.)

### My Nutrients Database
**File**: `src/lib/data/foodDatabaseData.js` (~2-5 MB)
- **Structure**: Multi-nutrient format with 20+ nutrients
- **Foods**: Curated database with comprehensive nutrient profiles
- **AppIds**: Stable appId system matching migration source
- **Format**: Minified with key mappings (KEYS, MEASURE_KEYS, DB)

---

## Data We Need

### 1. Latest Production Backup
**Required**: Export from user's device (current production)
- **Format**: My Calcium backup JSON
- **Time Range**: November 19, 2025 → Present (December 18+)
- **Expected Days**: ~29 additional days
- **Structure**: Calcium-only format with sequential/old IDs

### 2. Reference Databases
- ✅ **Old Database**: `migration/prod-foodDatabaseData.js` (8/22 version)
- ✅ **New Database**: `src/lib/data/foodDatabaseData.js` (My Nutrients)
- ✅ **AppId Mapping**: `source_data/appid-mapping.json`

---

## Migration Approach

### Phase 1: Data Collection & Preparation

#### Step 1.1: Export Latest Backup from Device
```bash
# User exports from production device
# File: calcium-tracker-backup-2025-12-18.json (or current date)
# Location: Save to migration/ folder
```

**Export Instructions for User**:
1. Open My Calcium app on production device
2. Go to Settings (☰ menu)
3. Select "Export Backup"
4. Save file with date: `calcium-tracker-backup-2025-12-18.json`
5. Transfer to migration folder

#### Step 1.2: Validate New Export
```python
# Quick validation script
import json

def validate_export(filepath):
    with open(filepath) as f:
        data = json.load(f)

    print(f"Journal days: {len(data.get('journalEntries', {}))}")
    print(f"Custom foods: {len(data.get('customFoods', []))}")
    print(f"Date range: {min(data['journalEntries'].keys())} to {max(data['journalEntries'].keys())}")

    # Check for expected recent dates
    recent_dates = ['2025-11-19', '2025-11-20', '2025-12-01', '2025-12-18']
    for date in recent_dates:
        status = "✓" if date in data['journalEntries'] else "✗"
        print(f"{status} {date}")

validate_export('migration/calcium-tracker-backup-2025-12-18.json')
```

---

### Phase 2: Merge New Data with Validated Base

#### Step 2.1: Create Merge Script
**File**: `migration/merge_for_nutrients.py`

```python
#!/usr/bin/env python3
"""
Merge validated 11-19 backup with latest export for My Nutrients migration.
"""

import json
from datetime import datetime

def merge_backups(base_file, new_file, output_file):
    """
    Merge strategy:
    - Base: migrated-backup-2025-11-19.json (validated, has stable appIds)
    - New: calcium-tracker-backup-2025-12-18.json (has recent data, old IDs)
    - Output: Pre-migration merged file with ALL dates

    Important: Only journal entries will be merged from new file.
    Custom foods, preferences, etc. will come from base.
    """

    with open(base_file) as f:
        base = json.load(f)

    with open(new_file) as f:
        new = json.load(f)

    # Start with base (has stable appIds through 11-19)
    merged = dict(base)

    # Merge journal entries
    # Base has 2025-06-07 to 2025-11-19
    # New should have 2025-08-22 to present
    # We want: Keep all from base, add anything newer from new

    base_dates = set(base['journalEntries'].keys())
    new_dates = set(new['journalEntries'].keys())

    # Add entries from new file that are AFTER 11-19
    cutoff_date = '2025-11-19'
    for date in new_dates:
        if date > cutoff_date:
            merged['journalEntries'][date] = new['journalEntries'][date]
            print(f"Added {date} from new export")

    # Check for any new custom foods (shouldn't be any, but check)
    base_food_names = {f['name'] for f in base['customFoods']}
    new_food_names = {f['name'] for f in new['customFoods']}

    new_foods_added = new_food_names - base_food_names
    if new_foods_added:
        print(f"⚠️  WARNING: New custom foods detected:")
        for name in new_foods_added:
            print(f"   - {name}")
            # Find the food in new and add to merged
            food = next(f for f in new['customFoods'] if f['name'] == name)
            merged['customFoods'].append(food)

    # Save merged file
    with open(output_file, 'w') as f:
        json.dump(merged, f, indent=2)

    print(f"\n✅ Merged file created: {output_file}")
    print(f"   Total journal days: {len(merged['journalEntries'])}")
    print(f"   Date range: {min(merged['journalEntries'].keys())} to {max(merged['journalEntries'].keys())}")
    print(f"   Custom foods: {len(merged['customFoods'])}")

if __name__ == '__main__':
    merge_backups(
        'migration/migrated-backup-2025-11-19.json',
        'migration/calcium-tracker-backup-2025-12-18.json',
        'migration/calcium-nutrients-merged-2025-12-18.json'
    )
```

#### Step 2.2: Run Merge
```bash
cd /home/user/my-nutrients-pwa
python3 migration/merge_for_nutrients.py
```

**Expected Output**:
- `calcium-nutrients-merged-2025-12-18.json`
- ~150 journal days (122 base + ~29 new)
- Same 43 custom foods (unless user added new ones)
- Stable appIds for base entries, old IDs for new entries

---

### Phase 3: Enhanced Migration Script for Multi-Nutrients

#### Step 3.1: Update migrate-backup-enhanced.mjs

**Key Changes Needed**:

1. **Add Nutrient Extraction Function**:
```javascript
/**
 * Extract ALL available nutrients from a matched food
 * @param {Object} matchedFood - Food from new curated database
 * @param {number} measureIndex - Index of selected measure (default 0)
 * @returns {Object} NutrientValues with all available nutrients
 */
function extractAllNutrients(matchedFood, measureIndex = 0) {
  const measures = getAllMeasures(matchedFood);
  if (measureIndex >= measures.length) {
    measureIndex = 0; // Fallback to first measure
  }

  const measure = measures[measureIndex];
  const nutrients = {};

  // Extract all nutrient fields from the measure
  // New format has measure.nutrients object
  if (measure.nutrients && typeof measure.nutrients === 'object') {
    // Copy all nutrient values
    Object.assign(nutrients, measure.nutrients);
  } else {
    // Legacy format - only has calcium
    if (measure.calcium !== undefined) {
      nutrients.calcium = parseFloat(measure.calcium);
    }
  }

  return nutrients;
}
```

2. **Update Journal Entry Migration**:
```javascript
function migrateJournalEntries(journalEntries, idMapping, customFoodMapping, curatedDatabase) {
  const migratedEntries = {};
  const curatedLookup = createCuratedLookup(curatedDatabase);

  for (const [date, entries] of Object.entries(journalEntries)) {
    migratedEntries[date] = entries.map(entry => {
      // Check if this is a custom food
      if (entry.isCustom && entry.customFoodId) {
        const newId = customFoodMapping.get(entry.customFoodId);

        // Custom foods only have calcium
        return {
          ...entry,
          customFoodId: newId,
          nutrients: {
            calcium: entry.calcium || 0
          }
        };
      }

      // Database food - try to enhance with all nutrients
      if (entry.foodId && idMapping.has(entry.foodId)) {
        const newAppId = idMapping.get(entry.foodId);
        const matchedFood = curatedLookup.get(newAppId);

        if (matchedFood) {
          // Extract all available nutrients
          const measureIndex = entry.preferredMeasureIndex || 0;
          const nutrients = extractAllNutrients(matchedFood, measureIndex);

          // Scale nutrients by serving quantity
          const scaledNutrients = {};
          for (const [nutrient, value] of Object.entries(nutrients)) {
            scaledNutrients[nutrient] = value * (entry.servingQuantity || 1);
          }

          return {
            name: entry.name,
            appId: newAppId,
            nutrients: scaledNutrients,
            servingQuantity: entry.servingQuantity,
            servingUnit: entry.servingUnit,
            timestamp: entry.timestamp,
            isCustom: false
          };
        }
      }

      // Fallback - keep calcium-only
      return {
        ...entry,
        nutrients: {
          calcium: entry.calcium || 0
        }
      };
    });
  }

  return migratedEntries;
}
```

3. **Update Settings Migration**:
```javascript
function migrateSettings(oldSettings) {
  // My Calcium had: dailyGoal, sortBy, sortOrder, theme
  // My Nutrients needs: nutrientGoals, displayedNutrients, theme, colorScheme

  return {
    nutrientGoals: {
      calcium: oldSettings.dailyGoal || 1500,
      protein: 60,  // Default RDA
      fiber: 28,    // Default RDA
      vitaminD: 20  // Default RDA
    },
    displayedNutrients: ['protein', 'calcium', 'fiber', 'vitaminD'],
    theme: oldSettings.theme || 'auto',
    colorScheme: 'blue'  // Default
  };
}
```

#### Step 3.2: Create Migration Script for Nutrients
**File**: `migration/migrate-to-nutrients.mjs`

```javascript
#!/usr/bin/env node
/**
 * migrate-to-nutrients.mjs
 *
 * Migration utility specifically for My Nutrients PWA
 * Extends migrate-backup-enhanced.mjs with multi-nutrient support
 *
 * Usage:
 * node migrate-to-nutrients.mjs \
 *   --merged-backup calcium-nutrients-merged-2025-12-18.json \
 *   --new-database ../src/lib/data/foodDatabaseData.js \
 *   --output nutrients-restore-2025-12-18.json
 */

// Import base migration functions
import { /* functions from migrate-backup-enhanced.mjs */ } from './migrate-backup-enhanced.mjs';

// Add multi-nutrient specific functions
// (extractAllNutrients, migrateJournalEntries, migrateSettings as shown above)

async function migrateToNutrients(config) {
  const {
    mergedBackupPath,
    newDatabasePath,
    outputPath
  } = config;

  console.log('🥗 Starting My Nutrients migration...\n');

  // Load files
  const mergedBackup = JSON.parse(fs.readFileSync(mergedBackupPath, 'utf8'));
  const nutrientsDatabase = await loadDatabase(newDatabasePath);

  console.log(`✅ Loaded merged backup: ${mergedBackupPath}`);
  console.log(`   Journal entries: ${Object.keys(mergedBackup.journalEntries).length} days`);
  console.log(`   Custom foods: ${mergedBackup.customFoods.length}`);

  console.log(`✅ Loaded My Nutrients database: ${nutrientsDatabase.length} foods`);

  // Journal entries already have stable appIds from base
  // We just need to enhance with multi-nutrient data
  console.log('\n📊 Enhancing journal entries with multi-nutrient data...');
  const enhancedEntries = enhanceWithNutrients(
    mergedBackup.journalEntries,
    nutrientsDatabase
  );

  // Migrate settings to My Nutrients format
  console.log('⚙️  Migrating settings to My Nutrients format...');
  const nutrientSettings = migrateSettings(mergedBackup.preferences);

  // Create final restore file
  const restoreFile = {
    metadata: {
      version: '2.0.0',
      appName: 'My Nutrients PWA',
      createdAt: new Date().toISOString(),
      migratedFrom: 'My Calcium',
      originalVersion: '1.0.0',
      migrationDate: new Date().toISOString()
    },
    preferences: nutrientSettings,
    customFoods: mergedBackup.customFoods,  // Keep as calcium-only
    favorites: mergedBackup.favorites,       // Already has stable appIds
    hiddenFoods: mergedBackup.hiddenFoods,   // Already has stable appIds
    servingPreferences: mergedBackup.servingPreferences,  // Already has stable appIds
    journalEntries: enhancedEntries
  };

  // Save output
  fs.writeFileSync(outputPath, JSON.stringify(restoreFile, null, 2));

  console.log(`\n✅ Migration complete!`);
  console.log(`📁 My Nutrients restore file: ${outputPath}`);

  // Print statistics
  printNutrientsStats(restoreFile);
}

function enhanceWithNutrients(journalEntries, nutrientsDb) {
  // Create lookup
  const dbLookup = new Map();
  for (const food of nutrientsDb) {
    const appId = food.i || food.id || food.appId;
    if (appId) dbLookup.set(appId, food);
  }

  const enhanced = {};
  let enhancedCount = 0;
  let calciumOnlyCount = 0;

  for (const [date, entries] of Object.entries(journalEntries)) {
    enhanced[date] = entries.map(entry => {
      // Custom food - keep calcium-only
      if (entry.isCustom || entry.customFoodId) {
        calciumOnlyCount++;
        return {
          ...entry,
          nutrients: {
            calcium: entry.calcium || 0
          }
        };
      }

      // Database food - enhance with all nutrients
      const appId = entry.appId || entry.foodId;
      const food = dbLookup.get(appId);

      if (food && hasMultipleMeasures(food)) {
        const measureIndex = entry.preferredMeasureIndex || 0;
        const nutrients = extractAllNutrients(food, measureIndex);

        // Scale by serving quantity
        const servingQty = entry.servingQuantity || 1;
        const scaledNutrients = {};
        for (const [key, value] of Object.entries(nutrients)) {
          scaledNutrients[key] = value * servingQty;
        }

        enhancedCount++;
        return {
          name: entry.name,
          appId: appId,
          nutrients: scaledNutrients,
          servingQuantity: servingQty,
          servingUnit: entry.servingUnit,
          timestamp: entry.timestamp,
          preferredMeasureIndex: measureIndex,
          isCustom: false
        };
      }

      // Fallback - calcium only
      calciumOnlyCount++;
      return {
        ...entry,
        nutrients: {
          calcium: entry.calcium || 0
        }
      };
    });
  }

  console.log(`   Enhanced entries: ${enhancedCount}`);
  console.log(`   Calcium-only entries: ${calciumOnlyCount}`);

  return enhanced;
}

function printNutrientsStats(restoreFile) {
  console.log('\n📊 Migration Statistics:');
  console.log(`   Journal days: ${Object.keys(restoreFile.journalEntries).length}`);
  console.log(`   Custom foods: ${restoreFile.customFoods.length}`);
  console.log(`   Favorites: ${restoreFile.favorites.length}`);
  console.log(`   Hidden foods: ${restoreFile.hiddenFoods.length}`);
  console.log(`   Serving preferences: ${restoreFile.servingPreferences.length}`);

  console.log('\n🥗 Nutrient Settings:');
  console.log(`   Tracked nutrients: ${restoreFile.preferences.displayedNutrients.join(', ')}`);
  console.log(`   Goals: ${JSON.stringify(restoreFile.preferences.nutrientGoals, null, 2)}`);

  // Sample a few journal entries to show nutrient data
  const dates = Object.keys(restoreFile.journalEntries).slice(0, 3);
  console.log('\n📝 Sample Journal Entries:');
  dates.forEach(date => {
    const entries = restoreFile.journalEntries[date];
    console.log(`\n  ${date}:`);
    entries.slice(0, 2).forEach(entry => {
      const nutrients = entry.nutrients || {};
      const nutrientStr = Object.entries(nutrients)
        .map(([k, v]) => `${k}: ${v.toFixed(1)}`)
        .join(', ');
      console.log(`    - ${entry.name}: {${nutrientStr}}`);
    });
  });
}

// CLI parsing and execution
// ... (similar to migrate-backup-enhanced.mjs)
```

#### Step 3.3: Run Nutrients Migration
```bash
cd /home/user/my-nutrients-pwa
node migration/migrate-to-nutrients.mjs \
  --merged-backup migration/calcium-nutrients-merged-2025-12-18.json \
  --new-database src/lib/data/foodDatabaseData.js \
  --output migration/nutrients-restore-2025-12-18.json
```

**Expected Output**:
- `nutrients-restore-2025-12-18.json` - Final restore file for My Nutrients
- Enhanced journal entries with multi-nutrient data
- Custom foods preserved as calcium-only
- Nutrient settings with 4 default tracked nutrients

---

### Phase 4: Validation & Testing

#### Step 4.1: Create Validation Script
**File**: `migration/validate_nutrients_migration.py`

```python
#!/usr/bin/env python3
"""
Comprehensive validation for My Nutrients migration.
"""

import json
from datetime import datetime

def validate_nutrients_migration(restore_file, merged_file):
    """Validate the My Nutrients restore file."""

    with open(restore_file) as f:
        restore = json.load(f)

    with open(merged_file) as f:
        merged = json.load(f)

    print("="*70)
    print("MY NUTRIENTS MIGRATION VALIDATION")
    print("="*70)

    all_checks_passed = True

    # 1. Journal entry count
    print("\n1. JOURNAL ENTRY COUNT")
    merged_days = len(merged['journalEntries'])
    restore_days = len(restore['journalEntries'])

    if restore_days == merged_days:
        print(f"  ✓ {restore_days} days preserved")
    else:
        print(f"  ✗ MISMATCH: merged={merged_days}, restore={restore_days}")
        all_checks_passed = False

    # 2. Date range
    print("\n2. DATE RANGE")
    dates = sorted(restore['journalEntries'].keys())
    print(f"  {dates[0]} → {dates[-1]}")

    # Check for critical dates
    critical_dates = [
        '2025-08-16',  # Apple Health recovery
        '2025-11-19',  # Last validated date
        dates[-1]      # Most recent date
    ]
    for date in critical_dates:
        if date in restore['journalEntries']:
            print(f"  ✓ {date}")
        else:
            print(f"  ✗ Missing: {date}")
            all_checks_passed = False

    # 3. Multi-nutrient enhancement
    print("\n3. MULTI-NUTRIENT ENHANCEMENT")

    # Sample entries to check for nutrients
    sample_date = dates[-1]  # Most recent date
    sample_entries = restore['journalEntries'][sample_date]

    db_entries = [e for e in sample_entries if not e.get('isCustom')]
    custom_entries = [e for e in sample_entries if e.get('isCustom')]

    print(f"  Sample date: {sample_date}")
    print(f"  Database entries: {len(db_entries)}")
    print(f"  Custom entries: {len(custom_entries)}")

    # Check database entries have multi-nutrients
    if db_entries:
        sample = db_entries[0]
        nutrients = sample.get('nutrients', {})
        nutrient_count = len(nutrients)

        if nutrient_count > 1:  # More than just calcium
            print(f"  ✓ Database food has {nutrient_count} nutrients")
            print(f"    Nutrients: {', '.join(nutrients.keys())}")
        else:
            print(f"  ⚠️  Database food only has {nutrient_count} nutrient(s)")
            all_checks_passed = False

    # Check custom entries have calcium
    if custom_entries:
        sample = custom_entries[0]
        nutrients = sample.get('nutrients', {})

        if 'calcium' in nutrients:
            print(f"  ✓ Custom food has calcium: {nutrients['calcium']}mg")
        else:
            print(f"  ✗ Custom food missing calcium")
            all_checks_passed = False

    # 4. Custom foods
    print("\n4. CUSTOM FOODS")
    merged_foods = len(merged.get('customFoods', []))
    restore_foods = len(restore.get('customFoods', []))

    if restore_foods == merged_foods:
        print(f"  ✓ {restore_foods} custom foods preserved")
    else:
        print(f"  ✗ MISMATCH: merged={merged_foods}, restore={restore_foods}")
        all_checks_passed = False

    # 5. Settings migration
    print("\n5. SETTINGS MIGRATION")
    prefs = restore.get('preferences', {})

    required_fields = ['nutrientGoals', 'displayedNutrients', 'theme']
    for field in required_fields:
        if field in prefs:
            print(f"  ✓ {field}: {prefs[field]}")
        else:
            print(f"  ✗ Missing: {field}")
            all_checks_passed = False

    # Check nutrient goals
    goals = prefs.get('nutrientGoals', {})
    if 'calcium' in goals:
        print(f"  ✓ Calcium goal preserved: {goals['calcium']}mg")
    else:
        print(f"  ✗ Missing calcium goal")
        all_checks_passed = False

    # 6. Favorites & serving preferences
    print("\n6. FAVORITES & SERVING PREFERENCES")
    print(f"  Favorites: {len(restore.get('favorites', []))}")
    print(f"  Serving preferences: {len(restore.get('servingPreferences', []))}")
    print(f"  Hidden foods: {len(restore.get('hiddenFoods', []))}")

    # 7. Metadata
    print("\n7. METADATA")
    metadata = restore.get('metadata', {})
    print(f"  App: {metadata.get('appName')}")
    print(f"  Version: {metadata.get('version')}")
    print(f"  Migrated from: {metadata.get('migratedFrom')}")

    # Final verdict
    print("\n" + "="*70)
    print("VALIDATION RESULT")
    print("="*70)

    if all_checks_passed:
        print("✅ ALL CHECKS PASSED")
        print("✅ Ready for import into My Nutrients PWA")
    else:
        print("⚠️  SOME CHECKS FAILED - Review issues above")

    return all_checks_passed

if __name__ == '__main__':
    validate_nutrients_migration(
        'migration/nutrients-restore-2025-12-18.json',
        'migration/calcium-nutrients-merged-2025-12-18.json'
    )
```

#### Step 4.2: Run Validation
```bash
python3 migration/validate_nutrients_migration.py
```

#### Step 4.3: Manual Testing Checklist

**Test in Dev Environment**:

1. **Import Restore File**
   - [ ] File imports without errors
   - [ ] No console warnings or errors
   - [ ] Import completes successfully

2. **Journal Entries**
   - [ ] All dates visible in journal
   - [ ] Recent entries show correct data
   - [ ] August 16-19 (Apple Health) dates present
   - [ ] Custom food entries display correctly
   - [ ] Database food entries show multiple nutrients

3. **Summary Card**
   - [ ] Shows 4 tracked nutrients (protein, calcium, fiber, vitaminD)
   - [ ] Daily totals calculate correctly
   - [ ] Progress bars display properly
   - [ ] Compare totals against old app for recent date

4. **Custom Foods**
   - [ ] All 43 custom foods present
   - [ ] Names match expected values
   - [ ] Calcium values correct
   - [ ] Can add to journal

5. **Favorites**
   - [ ] 4 favorites present
   - [ ] Can access from favorites list
   - [ ] Can add to journal

6. **Serving Preferences**
   - [ ] Preferred servings load correctly
   - [ ] Measure indices match expected servings
   - [ ] Multi-measure foods show correct default

7. **Settings**
   - [ ] Calcium goal: 1500mg
   - [ ] Default nutrients displayed
   - [ ] Theme preserved
   - [ ] Can modify settings

8. **Data Integrity**
   - [ ] Sample daily total matches old app
   - [ ] Pick 3-5 recent dates to verify
   - [ ] Check custom food usage
   - [ ] Verify multi-nutrient data makes sense

---

### Phase 5: Deployment Preparation

#### Step 5.1: Create Deployment Checklist

**Pre-Deployment**:
- [ ] Validation script passes all checks
- [ ] Manual testing complete in dev environment
- [ ] At least 3 recent dates verified against production
- [ ] Custom foods verified (names, values)
- [ ] Backup created of production app data (just in case)

**Deployment Steps**:
1. [ ] Build My Nutrients PWA for production
2. [ ] Test build on dev device
3. [ ] Create deployment package
4. [ ] Deploy to production server
5. [ ] Verify production URL loads

**User Device Setup**:
1. [ ] Export final backup from production (belt-and-suspenders)
2. [ ] Clear app data from production device
3. [ ] Open new My Nutrients PWA
4. [ ] Import `nutrients-restore-2025-12-18.json`
5. [ ] Verify import success
6. [ ] Spot-check recent dates
7. [ ] Test adding new entry
8. [ ] Set up sync (if applicable)

---

## Known Challenges & Solutions

### Challenge 1: Nutrient Scaling
**Issue**: Nutrients need to scale by serving quantity
**Solution**: Multiply all nutrient values by servingQuantity when creating journal entry

### Challenge 2: Missing Nutrient Data
**Issue**: Some foods in database may not have all 20+ nutrients
**Solution**: Only include nutrients that exist; NutrientValues interface has all fields as optional

### Challenge 3: Custom Food Nutrients
**Issue**: Custom foods only have calcium
**Solution**: Store as single-nutrient entry, UI handles display gracefully

### Challenge 4: Measure Index Matching
**Issue**: Multi-measure foods need correct measure selected
**Solution**: Use preferredMeasureIndex from serving preferences migration

### Challenge 5: Settings Transformation
**Issue**: My Calcium has simple settings, My Nutrients more complex
**Solution**: Map dailyGoal to nutrientGoals.calcium, use defaults for others

### Challenge 6: Date Gaps
**Issue**: User may have used app on dates not in backup
**Solution**: Latest export should have all dates; if gaps found, user can manually add

---

## Success Criteria

### Data Completeness
- ✅ All journal entries from June 7, 2025 to present
- ✅ All 43+ custom foods preserved
- ✅ Favorites, serving preferences, hidden foods migrated
- ✅ Settings transformed correctly

### Nutrient Enhancement
- ✅ Database foods have multi-nutrient data
- ✅ Custom foods maintain calcium values
- ✅ Nutrients scale correctly by serving size
- ✅ At least 15+ nutrients per database food (where available)

### Validation
- ✅ Validation script passes
- ✅ Manual testing complete
- ✅ Sample dates verified against production
- ✅ No data loss detected

### User Experience
- ✅ Import works smoothly
- ✅ Journal displays correctly
- ✅ Can add new entries
- ✅ Settings work as expected
- ✅ No performance issues

---

## Timeline

**Estimated Duration**: 2-4 hours

| Phase | Task | Est. Time |
|-------|------|-----------|
| 1 | Get export, validate | 15 min |
| 2 | Merge with base | 15 min |
| 3 | Update migration script | 45 min |
| 3 | Run migration | 10 min |
| 4 | Validation script | 30 min |
| 4 | Manual testing | 30 min |
| 5 | Deployment | 30 min |

**Buffer**: 30 min for unexpected issues

---

## Rollback Plan

If migration fails or critical issues found:

1. **Keep Production Running**
   - User's device still has working My Calcium app
   - Original data intact until successful migration

2. **Debug Options**
   - Review migration logs
   - Check validation failures
   - Test with subset of data first
   - Iterate on migration script

3. **Emergency Rollback**
   - User continues using My Calcium
   - Fix issues in My Nutrients
   - Retry migration when ready

---

## Next Steps

1. **Wait for User's Latest Export**
   - User needs to export from production device
   - File: `calcium-tracker-backup-2025-12-18.json`

2. **Create Merge Script**
   - Implement `merge_for_nutrients.py`
   - Test with dummy data if needed

3. **Update Migration Script**
   - Extend `migrate-backup-enhanced.mjs`
   - Add multi-nutrient extraction
   - Handle settings transformation

4. **Create Validation Script**
   - Implement comprehensive checks
   - Test with sample data

5. **Run Full Migration**
   - Execute all phases
   - Validate thoroughly
   - Test in dev environment

---

## Questions for User

Before proceeding, clarify:

1. **Export Timing**: When can you export the latest backup from production device?
2. **New Custom Foods**: Have any new custom foods been added since Nov 19?
3. **Sync Strategy**: Will sync be enabled immediately or phased in?
4. **Testing Device**: Do you have a dev device for testing before production?
5. **Backup Strategy**: Want to keep old app as backup for a while?

---

**Status**: ⏳ Waiting for latest production export to proceed

**Last Updated**: December 18, 2025
