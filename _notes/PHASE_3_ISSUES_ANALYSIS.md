# Phase 3 Issues Analysis

**Date**: December 12, 2025
**Status**: All issues are **IN SCOPE** for Phase 3
**Priority**: Must fix before Phase 3 completion

---

## Summary

All reported issues are Phase 3 UI Update bugs that should be fixed immediately. None are deferred to Phase 4 or beyond.

---

## Issue Breakdown

### 1. ✅ **Serving Calculator Making Mistakes** - PHASE 3 BUG

**Example**:
- Food: "beef, grass-fed, ground, raw"
- Serving: "4 oz" (correct)
- Expected calcium: 13.6mg
- Actual display: **54.2mg** ❌

**Root Cause**: Likely in `updateCalcium()` or `calculatedNutrients` reactive statement

**Phase 3 Reference**: Day 17-18 - "Show nutrients updating as serving quantity changes"

**Action**: Debug calculation logic in AddFoodModal.svelte

**Files to Check**:
- `src/lib/components/AddFoodModal.svelte` - lines 87-110 (calculatedNutrients)
- `src/lib/components/AddFoodModal.svelte` - lines 424-486 (updateCalcium function)

---

### 2. ✅ **Available Serving Size Pull-down Shows Calcium** - PHASE 3 UI ISSUE

**Current Behavior**:
```svelte
<option value={index}>
  {formatCalcium(calciumValue)}mg per {measure.measure}
</option>
```

**Problem**:
- Shows calcium-specific information
- Calcium may not be one of the 4 selected nutrients
- Not relevant to all users

**Phase 3 Reference**: Day 15-16 - Food Cards & Summary updates

**Action**: Change to show only serving size info

**Proposed Fix**:
```svelte
<option value={index}>
  {measure.measure}
</option>
```

Or with nutrient count:
```svelte
<option value={index}>
  {measure.measure} ({Object.keys(measure.nutrients).length} nutrients)
</option>
```

**Files**: `src/lib/components/AddFoodModal.svelte` lines 1103-1107

---

### 3. ✅ **Nutrient Value Override Support** - PHASE 3 FEATURE (MISSING)

**Original Calcium App Behavior**:
- Calcium input field had: `bind:value={calcium}`
- Was editable when:
  - Custom mode: Always editable
  - Database mode: Editable when `editingFood` OR `isSelectedFromSearch`
  - Disabled only when: `(!isCustomMode && !editingFood && !isSelectedFromSearch)`

**Current Behavior**: No nutrient inputs shown in normal mode

**Phase 3 Reference**: Day 17-18 - Add Food Modal updates

**Action**: Add editable nutrient inputs in database food mode

**Implementation**:
1. Show nutrient input fields (not just preview) when food is selected
2. Pre-populate with calculated values
3. Allow user to override any nutrient
4. Maintain override when saving

**Files**: `src/lib/components/AddFoodModal.svelte` - need to add input fields in database mode

---

### 4. ✅ **Normal Mode Should Match Custom Mode Display** - PHASE 3 UI CONSISTENCY

**Custom Mode** (working correctly):
```svelte
<input type="number" bind:value={nutrientInputs[nutrientId]} />
<span class="nutrient-unit">{getNutrientUnit(nutrientId)}</span>
```
- Shows: [103.5] mg ✅

**Normal Mode** (needs fixing):
- Currently only shows read-only preview
- Should show editable inputs with unit badges like custom mode

**Phase 3 Reference**: Day 17-18 - Add Food Modal

**Action**: Use same UI pattern (input + unit badge) for both modes

---

### 5. ✅ **Edit Food Dialog Doesn't Show Nutrients** - PHASE 3 BUG

**Current Behavior**:
- When editing database food, only shows name and serving
- No nutrient values displayed

**Expected Behavior**:
- Should show calculated nutrients based on stored food data
- Should allow editing/overriding nutrients (see #3)

**Phase 3 Reference**: Day 17-18 - Add Food Modal

**Root Cause**:
- Edit mode probably not populating `calculatedNutrients`
- Or nutrient display is hidden in edit mode

**Action**:
1. Ensure `calculatedNutrients` populates in edit mode
2. Show nutrient inputs (editable) in edit mode
3. Pre-fill with existing `food.nutrients` values

**Files**: `src/lib/components/AddFoodModal.svelte` - resetForm() and edit mode logic

---

### 6. ✅ **Serving Memory Feature Not Working for Nutrients** - PHASE 3 BUG

**Current Behavior**:
- Food shows in search results with saved serving preference
- But nutrients are missing/not calculated

**Expected Behavior**:
- Search results should show nutrients for the preferred serving
- When selected, should populate with full nutrient data

**Phase 3 Reference**: Day 17-18 - Add Food Modal, Day 15-16 - Food Entry

**Root Cause**:
- Serving preferences likely storing `calcium` field only
- Need to calculate/store full `nutrients` object

**Action**:
1. Check `getServingPreference()` return structure
2. Ensure nutrients are calculated for search results display
3. Populate nutrients when loading preference

**Files**:
- `src/lib/services/CalciumService.ts` - serving preference methods
- `src/lib/components/AddFoodModal.svelte` - search results display (line 1075)

---

## Priority Order for Fixes

### High Priority (Blockers)
1. **Issue #1** - Serving calculator (incorrect nutrient calculations)
2. **Issue #5** - Edit dialog missing nutrients
3. **Issue #6** - Serving memory missing nutrients

### Medium Priority (UX Issues)
4. **Issue #3** - Nutrient value override support
5. **Issue #4** - Normal mode UI consistency with custom mode

### Low Priority (Polish)
6. **Issue #2** - Serving dropdown shows calcium instead of measure only

---

## Testing Checklist

After fixes, verify:

- [ ] Database food selection: "beef, grass-fed, ground, raw" at "4 oz" shows **13.6mg** calcium ✅
- [ ] Database food selection: "1 cubic inch" mozzarella shows **103.5mg** calcium ✅
- [ ] User can override any nutrient value when adding database food
- [ ] Custom mode and normal mode have consistent UI (unit badges, input style)
- [ ] Editing existing database food shows all nutrients
- [ ] Editing allows changing nutrient values
- [ ] Search results with serving preferences show nutrients correctly
- [ ] Selecting food with saved preference populates all nutrients
- [ ] "Available Serving Size" dropdown shows measure info, not calcium-specific text

---

## References

- **IMPLEMENTATION_PLAN.md** - Phase 3: UI Updates (Days 15-21)
- **PHASE_3_STATUS.md** - Previous status (now outdated)
- **Original Calcium App** - Commit 239c391 (initial import)
- **AddFoodModal.svelte** - Main file needing updates

---

**Next Steps**: Address issues in priority order, testing each fix before moving to next.
