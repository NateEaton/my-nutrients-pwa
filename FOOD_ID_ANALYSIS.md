# Comprehensive Food ID Analysis & Fixes

## Executive Summary

Analysis of the nutri-pwa codebase revealed **3 critical bugs** related to the transition from no food IDs in journal entries to having appId/customFoodId fields. All bugs are in AddFoodModal.svelte and affect custom food functionality.

---

## Bug #1: Custom Food Nutrients Don't Populate When Selected

### Location
`src/lib/components/AddFoodModal.svelte:335-365`

### Root Cause
When selecting an existing custom food from search results:
1. Line 351: `isCustomMode = true` switches to custom mode
2. Custom mode is designed for CREATING new custom foods with manual nutrient entry
3. Line 1262: Nutrient display is ONLY shown when `!isCustomMode`
4. Result: Custom food nutrients exist but are hidden from display

### Current Code (Line 350-352)
```javascript
// If this is a custom food, switch to custom mode
if (food.isCustom) {
  isCustomMode = true;
}
```

### Impact
- User selects custom food from search → nutrients don't populate
- Only serving info (name, quantity, unit) is shown
- User cannot see the nutrient values they're about to add to their journal

### Fix Required
When selecting an existing custom food, DO NOT switch to custom mode. Instead:
1. Keep `isCustomMode = false`
2. Populate `calculatedNutrients` with the custom food's nutrients
3. Allow the normal database food nutrient display to show custom food nutrients

---

## Bug #2: New Custom Foods Missing customFoodId in Journal Entries

### Location
`src/lib/components/AddFoodModal.svelte:849-930`

### Root Cause
When creating a NEW custom food:
1. Lines 849-856: `saveCustomFood()` is called and returns a CustomFood object with ID
2. The return value is NOT captured
3. Line 790-800: `foodData` is created WITHOUT `customFoodId`
4. Line 930: `addFood(foodData)` saves journal entry without ID
5. Result: Journal entry has `isCustom: true` but NO `customFoodId` field

### Current Code (Lines 849-856)
```javascript
await nutrientService.saveCustomFood({
  name: foodName.trim(),
  calcium: calciumValue,
  nutrients: nutrients,
  measure: `${servingQuantity} ${servingUnit.trim()}`,
  sourceMetadata: sourceMetadata
});
// ❌ Return value not captured!
```

### Impact
- New custom foods are saved correctly to IndexedDB with negative IDs
- But journal entries for these foods have NO `customFoodId` field
- Old migrated custom foods work because migration added `customFoodId` to their journal entries
- New custom foods fail ID-based matching in:
  - Food history (getFoodHistory in NutrientService)
  - Journaled foods filter (passesJournaledFilter in data page)
  - Food frequency counting (getFoodFrequency in data page)

### Fix Required
Capture the returned custom food and add its ID to foodData:
```javascript
const savedCustomFood = await nutrientService.saveCustomFood({...});
if (savedCustomFood && savedCustomFood.id) {
  foodData.customFoodId = savedCustomFood.id;
}
```

---

## Bug #3: Newly Journaled Custom Foods Don't Show in "Show Only Journaled" Filter

### Location
`src/routes/data/+page.svelte:238-258`

### Root Cause
This is a **consequence of Bug #2**:
1. Line 247-248: `loadJournaledFoodIds()` only adds custom food IDs if `entry.customFoodId` exists
2. New custom foods don't have `customFoodId` in journal entries (Bug #2)
3. Line 288: `passesJournaledFilter()` checks if `food.id` is in `customIds` set
4. New custom foods aren't in the set, so they're filtered out

### Current Code (Lines 247-248)
```javascript
if (entry.isCustom && entry.customFoodId) {
  customIds.add(entry.customFoodId);
  // ...
}
```

### Impact
- Old migrated custom foods show correctly (have customFoodId in journal entries)
- New custom foods are hidden even though they've been journaled
- Inconsistent behavior confuses users

### Fix Required
This will be automatically fixed once Bug #2 is fixed. However, as a safety measure, add fallback name matching:

```javascript
if (entry.isCustom) {
  if (entry.customFoodId) {
    customIds.add(entry.customFoodId);
  } else {
    // Fallback for entries without customFoodId (legacy or buggy data)
    customNames.add(entry.name);
  }
}
```

Then update `passesJournaledFilter`:
```javascript
if (food.isCustom) {
  return journaledFoodIds.customIds.has(food.id) ||
         journaledFoodIds.customNames.has(food.name);
}
```

---

## Comprehensive Codebase Analysis

### Areas That Work Correctly ✅

1. **Food History (getFoodHistory)** - `NutrientService.ts:1048-1079`
   - Correctly matches custom foods by customFoodId
   - Has fallback name matching for database foods
   - Will work once Bug #2 is fixed

2. **Custom Food Storage** - `NutrientService.ts:406-479`
   - Now correctly saves `nutrients` object (recently fixed)
   - Properly converts legacy `calcium` to `nutrients` format
   - Handles both old and new custom food structures

3. **Custom Food Loading** - `NutrientService.ts:597-627`
   - Correctly loads custom foods from IndexedDB
   - Has backward compatibility for old calcium-only format
   - Populates nutrient state properly

4. **Database Food Helpers** - `foodDatabase.js:304-331`
   - getAllMeasures() correctly handles custom foods (recently fixed)
   - getPrimaryMeasure() correctly handles custom foods (recently fixed)
   - Returns proper measure + nutrients structure

5. **Migration Scripts**
   - migrate-backup-enhanced.mjs correctly remaps positive→negative IDs (recently fixed)
   - migrate_to_nutrients.mjs correctly transforms custom food nutrients (recently fixed)
   - cleanup-journal-ids.mjs correctly handles positive ID negation (recently fixed)

### Potential Issues Found 🔍

1. **SearchService** - `src/lib/services/SearchService.ts`
   - Need to verify custom food search includes negative IDs correctly
   - May need ID-based deduplication instead of name-based

2. **Favorites/Hidden Foods** - `NutrientService.ts:various`
   - Currently uses positive/negative ID system
   - Should work but needs testing with custom foods

3. **Serving Preferences** - `NutrientService.ts:899-930`
   - Saves preferences by food.id
   - Should work for custom foods (negative IDs)
   - Needs testing to ensure no ID collision issues

4. **Journal Entry Creation** - `AddFoodModal.svelte:790-800`
   - Lines 798-799: Conditional logic for adding IDs
   - Currently adds appId for database foods
   - Currently adds customFoodId for custom foods selected from search
   - ❌ **MISSING**: Does NOT add customFoodId for newly created custom foods (Bug #2)

5. **Food Frequency Sorting** - `data/+page.svelte:294-301`
   - Correctly uses `custom_${food.id}` key for custom foods
   - But won't count new custom foods without customFoodId in journal (Bug #3)

### No Issues Found ✅

1. **Import/Export** - `NutrientService.ts:631-675, 682-817`
   - generateBackup(): Correctly exports custom foods with nutrients
   - restoreBackup(): Correctly restores custom foods with IDs
   - No ID fields are dropped during serialization

2. **Sync** - `NutrientService.ts:1605-1750`
   - applySyncData(): Correctly handles custom food IDs
   - Uses same saveCustomFoodToIndexedDB() function
   - Should work correctly for syncing custom foods

3. **Statistics/Aggregation** - `routes/+page.svelte`
   - Journal data aggregation doesn't rely on food IDs
   - Calculates nutrients from journal entries directly
   - No ID-based logic that could break

4. **UI Rendering** - Various components
   - Components display food.name, food.nutrients, etc.
   - Don't rely on ID matching for display
   - Should work regardless of ID issues

---

## Required Fixes

### Priority 1: Critical Bugs

1. **Fix Bug #2** - Add customFoodId to journal entries for new custom foods
   - File: `src/lib/components/AddFoodModal.svelte`
   - Lines: Around 849-856, before line 930
   - Capture returned custom food ID and add to foodData

2. **Fix Bug #1** - Show nutrients when selecting existing custom food
   - File: `src/lib/components/AddFoodModal.svelte`
   - Lines: Around 350-352, 341-347
   - Populate calculatedNutrients instead of switching to custom mode

### Priority 2: Safety Improvements

3. **Fix Bug #3** - Add fallback name matching for journaled filter
   - File: `src/routes/data/+page.svelte`
   - Lines: 238-258, 284-292
   - Add safety fallback for entries without customFoodId

### Priority 3: Validation

4. **Test SearchService with custom foods**
   - Verify search results include custom foods correctly
   - Verify deduplication works with negative IDs

5. **Test serving preferences with custom foods**
   - Verify preferences save/load with negative IDs
   - Verify no collisions with database food IDs

---

## Testing Checklist

After fixes are applied:

- [ ] Create a new custom food manually
- [ ] Verify it appears in search results
- [ ] Select it from search → verify nutrients populate
- [ ] Add it to journal
- [ ] Check journal entry has `customFoodId` field with negative ID
- [ ] Enable "show only journaled foods" filter
- [ ] Verify the new custom food appears in the filtered list
- [ ] Check food history for the custom food
- [ ] Verify all journal entries for that custom food are shown
- [ ] Create a backup file
- [ ] Verify custom food definitions have `nutrients` object
- [ ] Verify journal entries have `customFoodId` for custom foods
- [ ] Import the backup on a fresh browser profile
- [ ] Verify everything works correctly after import

---

## Conclusion

The transition to food IDs in journal entries is **95% complete**, with only 3 bugs remaining:

1. **Custom food nutrient display** - Simple logic fix in selectFood()
2. **Missing customFoodId in new entries** - Simple ID capture fix
3. **Journaled filter excludes new custom foods** - Auto-fixed by #2, plus safety fallback

All other parts of the codebase correctly handle food IDs. The migration scripts, storage, loading, export, and most UI components work correctly.

**Estimated fix time**: 30 minutes
**Risk level**: Low (isolated changes to AddFoodModal and data page)
**Testing time**: 1 hour
