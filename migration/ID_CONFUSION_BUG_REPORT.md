# Custom Food ID Confusion Bug - Root Cause Analysis

## Executive Summary

**Problem**: Journal entries for "Oikos Triple Zero Peach" showed up under "Test" food history, and searching for "Oikos" returned nothing.

**Root Cause**: Custom food ID -51 was reused when a custom food was deleted, causing journal entries to point to the wrong food.

**Fix**: Restored missing custom food and re-linked journal entries.

---

## Timeline of Events

### Dec 24-26: Migration
1. **Source backup** (`calcium-tracker-backup-2025-12-24-merged.json`) had:
   - 51 custom foods with IDs [1, 2, 3, ..., 50, **52**, ...] (no ID 51)
   - ID 50: "Oikos Yogurt, plain, nonfat"
   - **ID 52: "Oikos Triple Zero Peach"** ← The problematic food
   - Journal entries for "Oikos Triple Zero Peach" had **NO customFoodId** (legacy format)

2. **Migration** (`migrate-backup-enhanced.mjs`) ran:
   - Assigned negative IDs **sequentially** based on iteration order:
     - ID 50 → -50 ✓
     - ID 52 → **-51** (not -52!) ← Gap in source IDs caused offset
   - Journal entries without customFoodId were **logged but not assigned IDs**

3. **Migration output** (`merged-output-2025-12-24.json`) had:
   - ID -50: "Oikos Yogurt, plain, nonfat" ✓
   - **ID -51: "Oikos Triple Zero Peach"** ✓
   - Journal entries for "Oikos Triple Zero Peach" still had NO customFoodId

### Dec 27: Import and ID Reuse

4. **User imported** the migrated backup into the app

5. **"Oikos Triple Zero Peach" failed to restore** (unknown reason - possibly error during IndexedDB write)

6. **ID counter initialized** to `-51`:
   - `initializeCustomFoodIdCounter()` scanned all custom foods in IndexedDB
   - Found IDs -1 through -50 (missing -51!)
   - Set `nextCustomFoodId = -50 - 1 = -51`

7. **User created "Test" custom food** at 1:57 PM:
   - App assigned ID **-51** (reusing the missing ID)
   - ID counter updated to -52

8. **User created "Crackers" via UPC scan** at 1:58 PM:
   - App assigned ID -52
   - ID counter updated to -53

9. **Journal entries still had customFoodId = -51**:
   - They were created in legacy format (no IDs)
   - Migration didn't backfill IDs
   - Now they incorrectly pointed to "Test" instead of "Oikos Triple Zero Peach"

---

## Why This Happened

### Issue #1: Sequential ID Assignment During Migration
The migration script assigns negative IDs **in iteration order**, not based on original IDs:

```javascript
for (const customFood of customFoods) {
  const oldId = customFood.id;
  const newId = nextNegativeId--;  // -1, -2, -3, ...
  customFoodMapping.set(oldId, newId);
}
```

If source has IDs [1, 2, 50, 52], they become [-1, -2, -3, -4], **not** [-1, -2, -50, -52].

### Issue #2: No ID Backfilling for Legacy Journal Entries
Migration logs a warning but doesn't backfill customFoodId for entries without IDs:

```javascript
} else {
  // Try to match by name to custom foods
  // This is best effort - custom foods might have been renamed
  console.log(`⚠️  Custom food entry without customFoodId: "${entry.name}" on ${date}`);
}
```

### Issue #3: Custom Food Failed to Restore
Unknown why "Oikos Triple Zero Peach" didn't save to IndexedDB during import. Possible causes:
- Database write error
- Transaction failure
- User closed browser during import

### Issue #4: ID Counter Allows Reuse
The ID counter is based on **existing custom foods**, not on **reserved IDs**:

```javascript
const minId = Math.min(...customFoods.map(f => f.id));
this.nextCustomFoodId = minId < 0 ? minId - 1 : -1;
```

If a custom food is deleted, its ID can be reused.

---

## Impact

**Affected Journal Entries**: 4 entries for "Oikos Triple Zero Peach" (Dec 8, 9, 13, 14)

**User-Visible Symptoms**:
- ❌ "Test" food history showed 5 entries (1 correct + 4 wrong)
- ❌ Searching "Oikos" returned no results (custom food missing)
- ❌ "Oikos Triple Zero Peach" entries had wrong nutrient values (showed Test's nutrients instead)

---

## Fix Applied

### Script: `restore-missing-custom-food.mjs`

1. **Restored "Oikos Triple Zero Peach"** from source backup:
   - Assigned new ID -53 (next available)
   - Copied all metadata (name, calcium, measure, etc.)

2. **Re-linked journal entries**:
   - Changed `customFoodId` from -51 to -53 for all 4 Oikos entries

3. **Output**: `nutrients-tracker-backup-2025-12-27-restored.json`

### Verification

Before fix:
```
ID -51: Test
  └─ 5 journal entries (1 Test + 4 Oikos entries)
```

After fix:
```
ID -51: Test
  └─ 1 journal entry (correct)

ID -53: Oikos Triple Zero Peach
  └─ 4 journal entries (correct)
```

---

## Prevention: Long-Term Fixes Needed

### Priority 1: Prevent ID Reuse in App Code

**File**: `src/lib/services/NutrientService.ts`

**Change**: Track **all IDs ever used**, not just current foods:

```typescript
// Current (WRONG):
const minId = Math.min(...customFoods.map(f => f.id));
this.nextCustomFoodId = minId < 0 ? minId - 1 : -1;

// Fixed (CORRECT):
const minId = Math.min(
  ...customFoods.map(f => f.id),
  ...journalEntries.flatMap(entries =>
    entries.filter(e => e.customFoodId).map(e => e.customFoodId)
  )
);
this.nextCustomFoodId = minId < 0 ? minId - 1 : -1;
```

This ensures deleted custom food IDs are never reused.

### Priority 2: Backfill customFoodId During Migration

**File**: `migration/migrate-backup-enhanced.mjs`

**Change**: Add name-based matching for legacy entries:

```javascript
} else {
  // Legacy entry without customFoodId - try name + calcium matching
  const key = `${entry.name.toLowerCase().trim()}|${entry.calcium || 0}`;
  const matchedFood = customFoodByName.get(key);
  if (matchedFood && customFoodMapping.has(matchedFood.id)) {
    migratedEntry.customFoodId = customFoodMapping.get(matchedFood.id);
    entriesWithCustomFoodId++;
  } else {
    console.log(`⚠️  Could not match custom food: "${entry.name}" on ${date}`);
  }
}
```

### Priority 3: Preserve Original IDs (Optional)

Instead of sequential assignment, preserve ID relationships:

```javascript
// Map ID 50 → -50, ID 52 → -52 (preserve numbers)
const newId = -Math.abs(customFood.id);
customFoodMapping.set(oldId, newId);
```

This prevents offset issues when source has gaps.

---

## User Instructions

### Immediate Fix

1. **Import the fixed backup**:
   ```
   File: nutrients-tracker-backup-2025-12-27-restored.json
   ```

2. **Verify in app**:
   - Search for "Oikos" → should find "Oikos Triple Zero Peach"
   - Check "Test" history → should show only 1 entry (Dec 27)
   - Check "Oikos Triple Zero Peach" history → should show 4 entries (Dec 8, 9, 13, 14)

### Future Imports

- Always use the **latest migration scripts** (with ID backfilling)
- After import, verify custom foods loaded correctly
- Check food history for a few known custom foods

---

## Diagnostic Tools Created

### 1. `diagnose-id-confusion.mjs`
Checks for ID/name mismatches in journal entries.

**Usage**:
```bash
node diagnose-id-confusion.mjs <backup-file>
```

**Output**:
- Custom food definitions
- Journal entries by customFoodId
- Mismatches (wrong name for ID)

### 2. `restore-missing-custom-food.mjs`
Restores a deleted custom food and fixes journal entry IDs.

**Usage**:
```bash
node restore-missing-custom-food.mjs <current-backup> <source-backup> <output>
```

### 3. `fix-id-mismatch.mjs`
Generic tool to re-match journal entries to correct custom foods.

**Usage**:
```bash
node fix-id-mismatch.mjs <current-backup> <source-backup> <output>
```

---

## Technical Debt

This bug revealed several technical debt items:

1. **No ID reservation system** - Deleted IDs can be reused
2. **No referential integrity checks** - Journal entries can point to non-existent foods
3. **No migration validation** - Success/failure of custom food restore not reported
4. **Sequential ID assignment** - Doesn't preserve original ID structure
5. **No automatic ID backfilling** - Legacy entries left without IDs

---

## Conclusion

**Status**: ✅ **FIXED** (for this backup)

**Next Steps**:
1. User imports `nutrients-tracker-backup-2025-12-27-restored.json`
2. Developer applies Priority 1 fix to prevent future ID reuse
3. Developer applies Priority 2 fix to backfill legacy entries during migration

**Risk Level**: Low (isolated to custom foods with deleted entries pointing to them)

**Testing Required**:
- Verify ID counter doesn't reuse IDs after deleting custom foods
- Verify migration backfills customFoodId for legacy entries
- Verify food history shows correct entries after fixes
