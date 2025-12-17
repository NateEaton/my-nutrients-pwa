# My Nutrients - Migration Guide

**Version**: 1.0.0
**Last Updated**: December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Database Migration Strategy](#database-migration-strategy)
3. [Backup File Migration](#backup-file-migration)
4. [User Data Migration Process](#user-data-migration-process)
5. [Migration Script](#migration-script)
6. [Validation & Testing](#validation--testing)
7. [Rollback Procedures](#rollback-procedures)

---

## Overview

This guide covers the migration process from **My Calcium** (v2.x) to **My Nutrients** (v1.0). The migration involves:

1. **Database schema changes**: IndexedDB structure and data models
2. **Data format changes**: Single nutrient → multi-nutrient support
3. **Settings migration**: CalciumSettings → NutrientSettings
4. **localStorage key changes**: `calcium_*` → `nutrient_*`

### Migration Approach

**Strategy**: **Offline migration via backup file**

- User exports backup from My Calcium
- Run migration script to transform backup file
- Import migrated backup into My Nutrients
- Validate data integrity
- Set up new sync pair (if using sync)

**Why this approach?**
- ✅ Safe: Original data preserved in old backup
- ✅ Testable: Can validate migration before deploying
- ✅ Simple: No complex in-place schema upgrades
- ✅ Clean break: New app identity (NutrientTracker v1)

---

## Database Migration Strategy

### Old Database (My Calcium)

**IndexedDB**: `CalciumTracker` (version 7)

**Data structure**:
```typescript
interface FoodEntry {
  name: string;
  calcium: number;              // Single value
  servingQuantity: number;
  servingUnit: string;
  timestamp: string;
  isCustom?: boolean;
  customFoodId?: number;
  note?: string;
}

interface JournalEntry {
  date: string;
  foods: FoodEntry[];
  lastModified: number;
  syncStatus: string;
  totalCalcium: number;         // Single total
}
```

### New Database (My Nutrients)

**IndexedDB**: `NutrientTracker` (version 1)

**Data structure**:
```typescript
interface FoodEntry {
  name: string;
  nutrients: NutrientValues;    // Multi-nutrient object
  servingQuantity: number;
  servingUnit: string;
  timestamp: string;
  isCustom?: boolean;
  customFoodId?: number;
  note?: string;
}

interface JournalEntry {
  date: string;
  foods: FoodEntry[];
  lastModified: number;
  syncStatus: string;
  totalNutrients: NutrientValues;  // Multi-nutrient totals
}
```

### Migration Path

**No in-place upgrade** - Create fresh `NutrientTracker` database from migrated backup.

**Old database handling**:
- Can coexist with new database temporarily
- Recommend deletion after successful migration
- User's choice to keep for rollback safety

---

## Backup File Migration

### Old Backup Format (v2.1.0)

```json
{
  "metadata": {
    "version": "2.1.0",
    "createdAt": "2025-12-01T10:00:00.000Z",
    "appVersion": "2.1.0"
  },
  "preferences": {
    "dailyGoal": 1500,
    "sortBy": "time",
    "sortOrder": "desc",
    "theme": "auto",
    "colorScheme": "blue"
  },
  "customFoods": [
    {
      "id": -1,
      "name": "Custom Yogurt",
      "calcium": 250,
      "measure": "1 cup",
      "dateAdded": "2025-11-15T...",
      "isCustom": true
    }
  ],
  "favorites": [123, 456, -1],
  "hiddenFoods": [789],
  "servingPreferences": [
    {
      "foodId": 123,
      "preferredQuantity": 1,
      "preferredUnit": "cup",
      "lastUsed": "2025-12-01T..."
    }
  ],
  "journalEntries": {
    "2025-12-01": [
      {
        "name": "Milk, whole",
        "calcium": 276,
        "servingQuantity": 1,
        "servingUnit": "cup",
        "timestamp": "2025-12-01T08:00:00.000Z"
      }
    ]
  }
}
```

### New Backup Format (v3.0.0)

```json
{
  "metadata": {
    "version": "3.0.0",
    "createdAt": "2025-12-01T10:00:00.000Z",
    "appVersion": "1.0.0",
    "migratedFrom": "2.1.0"
  },
  "preferences": {
    "nutrientGoals": {
      "protein": 60,
      "calcium": 1500,
      "fiber": 25,
      "vitaminD": 20
    },
    "displayedNutrients": ["protein", "calcium", "fiber", "vitaminD"],
    "theme": "auto",
    "colorScheme": "blue"
  },
  "customFoods": [
    {
      "id": -1,
      "name": "Custom Yogurt",
      "nutrients": {
        "calcium": 250
      },
      "measure": "1 cup",
      "dateAdded": "2025-11-15T...",
      "isCustom": true
    }
  ],
  "favorites": [123, 456, -1],
  "hiddenFoods": [789],
  "servingPreferences": [
    {
      "foodId": 123,
      "preferredQuantity": 1,
      "preferredUnit": "cup",
      "lastUsed": "2025-12-01T..."
    }
  ],
  "journalEntries": {
    "2025-12-01": [
      {
        "name": "Milk, whole",
        "nutrients": {
          "calcium": 276
        },
        "servingQuantity": 1,
        "servingUnit": "cup",
        "timestamp": "2025-12-01T08:00:00.000Z"
      }
    ]
  }
}
```

### Key Changes

1. **Metadata**: Version bumped to 3.0.0, added `migratedFrom` field
2. **Preferences**:
   - `dailyGoal` → `nutrientGoals.calcium`
   - Added `displayedNutrients` (default: protein, calcium, fiber, vitaminD)
   - Added default goals for other nutrients
3. **Custom Foods**: `calcium: number` → `nutrients: { calcium: number }`
4. **Journal Entries**: `calcium: number` → `nutrients: { calcium: number }`
5. **Favorites/Hidden/ServingPrefs**: Unchanged (ID-based, nutrient-agnostic)

---

## User Data Migration Process

### For Current User (Wife)

**Pre-Migration**:
1. Ensure all data synced to latest
2. Export backup from My Calcium
3. Save backup file safely (cloud + local)
4. Note current stats (journal days, custom foods count)

**Migration**:
1. Run migration script on backup file
2. Validate migrated backup
3. Clear My Calcium app data (or uninstall)
4. Install/deploy My Nutrients
5. Import migrated backup
6. Verify all data present

**Post-Migration**:
1. Configure displayed nutrients (default: protein, calcium, fiber, vitaminD)
2. Adjust goals if needed
3. Set up new sync pair between devices
4. Test adding a new food
5. Verify sync works

### Timeline

**Total time**: ~30 minutes

- Export backup: 1 min
- Run migration script: 1 min
- Validation: 5 min
- App installation: 2 min
- Import backup: 2 min
- Verification: 10 min
- Sync setup: 5 min
- Testing: 5 min

---

## Migration Script

### Location

`migration/migrate-calcium-to-nutrients.js`

### Usage

```bash
node migration/migrate-calcium-to-nutrients.js \
  --input calcium-tracker-backup-2025-12-XX.json \
  --output my-nutrients-backup-2025-12-XX.json \
  --validate
```

### Parameters

- `--input` (required): Path to My Calcium backup file
- `--output` (required): Path for migrated My Nutrients backup
- `--validate`: Run validation checks after migration
- `--force`: Proceed even if validation warnings (use with caution)

### Migration Algorithm

```typescript
function migrateBackup(oldBackup: CalciumBackup): NutrientBackup {
  const newBackup: NutrientBackup = {
    metadata: {
      version: '3.0.0',
      createdAt: new Date().toISOString(),
      appVersion: '1.0.0',
      migratedFrom: oldBackup.metadata.version,
      originalCreatedAt: oldBackup.metadata.createdAt
    },
    preferences: migratePreferences(oldBackup.preferences),
    customFoods: migrateCustomFoods(oldBackup.customFoods),
    favorites: oldBackup.favorites,
    hiddenFoods: oldBackup.hiddenFoods,
    servingPreferences: oldBackup.servingPreferences,
    journalEntries: migrateJournalEntries(oldBackup.journalEntries)
  };

  return newBackup;
}

function migratePreferences(oldPrefs: CalciumSettings): NutrientSettings {
  return {
    nutrientGoals: {
      protein: 60,           // Default RDA values
      calcium: oldPrefs.dailyGoal || 1200,
      fiber: 25,
      magnesium: 420,
      potassium: 3400,
      iron: 8,
      zinc: 11,
      vitaminD: 20,
      vitaminB12: 2.4,
      folate: 400,
      vitaminB6: 1.7,
      vitaminA: 900,
      vitaminC: 90,
      vitaminK: 120
    },
    displayedNutrients: ['protein', 'calcium', 'fiber', 'vitaminD'],
    theme: oldPrefs.theme || 'auto',
    colorScheme: oldPrefs.colorScheme || 'blue'
  };
}

function migrateCustomFoods(oldFoods: CustomFood[]): CustomFood[] {
  return oldFoods.map(food => ({
    ...food,
    nutrients: {
      calcium: food.calcium
    }
    // Remove old calcium field in final cleanup
  })).map(({ calcium, ...rest }) => rest);
}

function migrateJournalEntries(
  oldEntries: Record<string, FoodEntry[]>
): Record<string, FoodEntry[]> {
  const newEntries: Record<string, FoodEntry[]> = {};

  for (const [date, foods] of Object.entries(oldEntries)) {
    newEntries[date] = foods.map(food => ({
      name: food.name,
      nutrients: {
        calcium: food.calcium
      },
      servingQuantity: food.servingQuantity,
      servingUnit: food.servingUnit,
      timestamp: food.timestamp,
      isCustom: food.isCustom,
      customFoodId: food.customFoodId,
      note: food.note
    }));
  }

  return newEntries;
}
```

### Implementation

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Default RDA values for seniors
const DEFAULT_NUTRIENT_GOALS = {
  protein: 60,
  calcium: 1200,
  fiber: 25,
  magnesium: 420,
  potassium: 3400,
  iron: 8,
  zinc: 11,
  vitaminD: 20,
  vitaminB12: 2.4,
  folate: 400,
  vitaminB6: 1.7,
  vitaminA: 900,
  vitaminC: 90,
  vitaminK: 120
};

// Parse command-line arguments
const args = process.argv.slice(2);
let inputFile, outputFile, validate = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input') inputFile = args[++i];
  else if (args[i] === '--output') outputFile = args[++i];
  else if (args[i] === '--validate') validate = true;
}

if (!inputFile || !outputFile) {
  console.error('Usage: node migrate-calcium-to-nutrients.js --input <old-backup.json> --output <new-backup.json> [--validate]');
  process.exit(1);
}

// Read old backup
const oldBackup = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Migrate
const newBackup = {
  metadata: {
    version: '3.0.0',
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    migratedFrom: oldBackup.metadata.version,
    originalCreatedAt: oldBackup.metadata.createdAt
  },
  preferences: {
    nutrientGoals: {
      ...DEFAULT_NUTRIENT_GOALS,
      calcium: oldBackup.preferences.dailyGoal || 1200
    },
    displayedNutrients: ['protein', 'calcium', 'fiber', 'vitaminD'],
    theme: oldBackup.preferences.theme || 'auto',
    colorScheme: oldBackup.preferences.colorScheme || 'blue'
  },
  customFoods: oldBackup.customFoods.map(food => {
    const { calcium, ...rest } = food;
    return {
      ...rest,
      nutrients: { calcium }
    };
  }),
  favorites: oldBackup.favorites,
  hiddenFoods: oldBackup.hiddenFoods,
  servingPreferences: oldBackup.servingPreferences,
  journalEntries: {}
};

// Migrate journal entries
for (const [date, foods] of Object.entries(oldBackup.journalEntries)) {
  newBackup.journalEntries[date] = foods.map(food => {
    const { calcium, ...rest } = food;
    return {
      ...rest,
      nutrients: { calcium }
    };
  });
}

// Write output
fs.writeFileSync(outputFile, JSON.stringify(newBackup, null, 2));

console.log('✅ Migration complete!');
console.log(`   Input: ${inputFile}`);
console.log(`   Output: ${outputFile}`);
console.log(`   Journal days: ${Object.keys(newBackup.journalEntries).length}`);
console.log(`   Custom foods: ${newBackup.customFoods.length}`);

// Validation
if (validate) {
  console.log('\n🔍 Running validation...');

  const oldJournalDays = Object.keys(oldBackup.journalEntries).length;
  const newJournalDays = Object.keys(newBackup.journalEntries).length;

  if (oldJournalDays !== newJournalDays) {
    console.error(`❌ Journal day count mismatch: ${oldJournalDays} → ${newJournalDays}`);
    process.exit(1);
  }

  const oldCustomFoods = oldBackup.customFoods.length;
  const newCustomFoods = newBackup.customFoods.length;

  if (oldCustomFoods !== newCustomFoods) {
    console.error(`❌ Custom food count mismatch: ${oldCustomFoods} → ${newCustomFoods}`);
    process.exit(1);
  }

  // Spot-check calcium values
  for (const [date, oldFoods] of Object.entries(oldBackup.journalEntries)) {
    const newFoods = newBackup.journalEntries[date];
    for (let i = 0; i < oldFoods.length; i++) {
      if (oldFoods[i].calcium !== newFoods[i].nutrients.calcium) {
        console.error(`❌ Calcium mismatch on ${date}, food ${i}: ${oldFoods[i].calcium} → ${newFoods[i].nutrients.calcium}`);
        process.exit(1);
      }
    }
  }

  console.log('✅ Validation passed!');
}
```

---

## Validation & Testing

### Validation Checklist

Before importing migrated backup:

- [ ] File is valid JSON (can be parsed)
- [ ] Version is 3.0.0
- [ ] Journal day count matches original
- [ ] Custom food count matches original
- [ ] All calcium values preserved
- [ ] Displayed nutrients array has 4 items
- [ ] Nutrient goals object has all nutrients
- [ ] Calcium goal matches original dailyGoal

### Validation Script

```bash
node migration/validate-backup.js my-nutrients-backup-2025-12-XX.json
```

### Manual Spot-Checking

1. Open migrated backup in text editor
2. Find a known journal entry (e.g., most recent day)
3. Verify calcium values match original
4. Check custom foods transformed correctly
5. Verify preferences look reasonable

### Test Import

**Before production migration:**

1. Use browser in incognito/private mode
2. Navigate to My Nutrients app
3. Import migrated backup
4. Verify UI shows data correctly:
   - Journal days load
   - Custom foods appear
   - Calcium totals match expectations
   - Settings show 4 displayed nutrients
5. Add a new food (test write operations)
6. Export backup again (round-trip test)

---

## Rollback Procedures

### If Migration Fails

**Scenario 1: Migration script errors**

1. Do NOT deploy to production
2. Keep wife using My Calcium (no disruption)
3. Debug migration script with test data
4. Fix issues
5. Re-test with wife's backup
6. Retry migration when fixed

**Scenario 2: Migrated backup is corrupted**

1. Do NOT import corrupted backup
2. Keep original My Calcium backup safe
3. Re-run migration script
4. Re-validate
5. If still failing, investigate data-specific issues

**Scenario 3: My Nutrients app won't import backup**

1. Check browser console for errors
2. Verify backup file format
3. Test with smaller synthetic backup
4. Fix import code in My Nutrients
5. Re-deploy and retry

### If Production Issues After Migration

**Scenario 1: Data missing after import**

1. Do NOT continue using My Nutrients
2. Export current state for debugging
3. Restore original My Calcium backup to My Calcium app
4. Wife continues using My Calcium
5. Debug missing data issue
6. Fix and re-migrate

**Scenario 2: App crashes or unusable**

1. Immediately revert deployment
2. Restore My Calcium codebase
3. Wife imports original backup into My Calcium
4. Investigate crash in development
5. Fix and re-deploy when stable

### Safety Nets

1. **Keep original backup**: Never delete `calcium-tracker-backup-YYYY-MM-DD.json`
2. **Test in dev first**: Full migration test before production
3. **Incremental validation**: Check data at each step
4. **Sync disabled during migration**: Avoid corrupting cloud data
5. **New sync pair after migration**: Fresh start for v3.0 format

---

## Post-Migration Checklist

After successful migration to My Nutrients:

- [ ] All journal days present (expected count: 122 as of 2025-11-19)
- [ ] All custom foods present (expected count: 43)
- [ ] Calcium values match spot-check from old backup
- [ ] Can add new food with multi-nutrient data
- [ ] Settings show 4 displayed nutrients
- [ ] Can change displayed nutrients in settings
- [ ] Stats page loads without errors
- [ ] Report page loads without errors
- [ ] Can export new backup (v3.0 format)
- [ ] Sync set up between devices
- [ ] Sync works bidirectionally
- [ ] User satisfied with migration

---

## Troubleshooting

### Common Issues

**Issue**: "Invalid backup file format"
- **Cause**: Trying to import v2.1 backup into My Nutrients
- **Solution**: Run migration script first

**Issue**: "Some custom foods missing nutrients"
- **Cause**: Old custom foods only have calcium
- **Solution**: This is expected; other nutrients will be undefined/null

**Issue**: "Daily totals don't match"
- **Cause**: Aggregation logic not summing nutrients correctly
- **Solution**: Check `calculateTotalNutrients()` function

**Issue**: "Settings won't save"
- **Cause**: localStorage key mismatch
- **Solution**: Clear localStorage, re-import backup

**Issue**: "Sync fails after migration"
- **Cause**: Old sync doc has v2.1 format, incompatible with v3.0
- **Solution**: Create new sync pair (don't try to sync v2.1 ↔ v3.0)

---

## Future Migrations

### v3.x → v4.x (Hypothetical)

If future versions require migration:

1. Follow same pattern: Backup → Migrate → Import
2. Always support previous version in migration script
3. Version detection: Check `metadata.version` in backup
4. Chain migrations if needed: v2.1 → v3.0 → v4.0

### Best Practices

- Always bump major version for breaking schema changes
- Document all format changes in CHANGELOG.md
- Provide migration script with each major version
- Test migrations with real user data
- Validate before and after migration
- Keep old backups safe

---

## Conclusion

The migration from My Calcium to My Nutrients is straightforward thanks to:

- Clear backup format (JSON)
- Simple transformation (single value → object)
- Validation at each step
- Rollback safety via original backup
- Offline migration (no network dependencies)

**Key Success Factors**:
- ✅ Test migration script with real data
- ✅ Validate migrated backup before importing
- ✅ Keep original backup safe
- ✅ User prepared for new app identity
- ✅ New sync pair set up correctly

**Timeline**: 30 minutes, minimal disruption, high confidence.
