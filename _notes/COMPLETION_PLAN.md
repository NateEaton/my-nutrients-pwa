# My Nutrients - Completion Plan

**Version**: 1.0
**Date**: December 13, 2025
**Status**: Post-Phase 5 Analysis

---

## Executive Summary

This document outlines the remaining work to complete the My Nutrients PWA. The application has successfully transitioned from single-nutrient (calcium) tracking to comprehensive multi-nutrient tracking with 25+ supported nutrients. **Phases 1-3 and Phase 5 are complete. Phase 4 was intentionally skipped** as the proposed nutrient analysis page was deemed redundant with the existing stats page.

### Current State

**✅ Completed**:
- Multi-nutrient data layer with 25 nutrients
- IndexedDB schema supporting `NutrientValues` interface
- Service layer (CalciumService) fully multi-nutrient capable
- UI components displaying up to 4 selected nutrients
- Nutrient settings modal for selection and goal management
- Stats page with nutrient selector
- Reports page with nutrient selector
- Backup/restore with multi-nutrient format
- PWA capabilities (offline, installable)
- Cross-device sync (feature-flagged)

**⚠️ Issues Identified**:
1. Branding inconsistency ("My Calcium" hardcoded throughout)
2. Nutrient selection modal UX bug (can't select new nutrient after unchecking)
3. Nutrient selector too tall on mobile (stats/reports pages)
4. Database page calcium-focused (needs multi-nutrient redesign)
5. Tracking page sorting limited to calcium (needs multi-nutrient support)
6. HTML documentation generation concerns (size, relevance)

---

## Remaining Work Breakdown

### Phase 6: Critical Fixes & UX Improvements

**Duration**: 2-3 days
**Priority**: High
**Goal**: Fix blocking UX issues and branding inconsistencies

#### Task 6.1: Fix Nutrient Selection Modal Bug

**Issue**: When a user unchecks a nutrient (reducing from 4 to 3 selected), they cannot select a different nutrient until they save and re-enter the modal.

**Root Cause**: The reactive statement checking `displayedNutrients.length < MAX_DISPLAYED` doesn't trigger properly when the array changes.

**Solution**:
```javascript
// In NutrientSettingsModal.svelte, update canSelectMore() to be reactive
$: canSelectMore = settings.displayedNutrients.length < MAX_DISPLAYED;

// Update the disabled attribute on checkboxes
<input
  type="checkbox"
  checked={isDisplayed(nutrient.id)}
  on:change={() => toggleNutrient(nutrient.id)}
  disabled={!isDisplayed(nutrient.id) && !canSelectMore}
/>
```

**Testing**:
1. Select 4 nutrients
2. Uncheck one nutrient (should drop to 3)
3. Immediately check a different nutrient (should work without saving)
4. Verify max limit still enforced at 4

**Files**:
- `src/lib/components/NutrientSettingsModal.svelte`

---

#### Task 6.2: Simplify Nutrient Selector on Stats/Reports Pages

**Issue**: The nutrient dropdown shows ALL 25 nutrients in two optgroups ("Tracked" and "All"), making it excessively tall on mobile devices and causing full-screen takeover.

**Solution**: For now, show only the 1-4 selected nutrients in the dropdown. This addresses mobile usability while we can revisit a more sophisticated selector later.

**Implementation**:
```svelte
<!-- Stats and Reports pages -->
<select bind:value={selectedNutrient} on:change={() => loadDataForView()}>
  {#each nutrientSettings.displayedNutrients as nutrientId}
    {@const nutrient = NUTRIENT_METADATA.find(n => n.id === nutrientId)}
    {#if nutrient}
      <option value={nutrient.id}>{nutrient.label} ({nutrient.unit})</option>
    {/if}
  {/each}
</select>
```

**Alternative (if user wants access to all nutrients)**:
- Add a small "+" button next to selector
- Opens modal/sheet to select from all nutrients
- Selected nutrient becomes temporarily active for viewing

**Decision Point**: Does the user want stats/reports limited to tracked nutrients only, or should there be a way to view stats for any nutrient?

**Files**:
- `src/routes/stats/+page.svelte` (lines 1027-1046)
- `src/routes/report/+page.svelte` (similar section)

---

#### Task 6.3: Global Branding Update (My Calcium → My Nutrients)

**Issue**: "My Calcium" branding appears in 60+ locations throughout the codebase, creating confusion and inconsistency.

**Locations to Update**:

1. **HTML/Title**:
   - `src/app.html` line 12: `<title>My Calcium</title>` → `<title>My Nutrients</title>`

2. **PWA Manifest** (vite.config.js):
   - Line 101+: `name: "My Calcium"` → `name: "My Nutrients"`
   - `short_name: "Calcium"` → `short_name: "Nutrients"`
   - `description: "Track calcium..."` → `description: "Track essential nutrients..."`

3. **File Headers** (comment blocks):
   - All `*.svelte` files: "My Calcium Tracker PWA" → "My Nutrients Tracker PWA"
   - All `*.ts` files: Same update
   - Estimated 40+ files

4. **LocalStorage Keys** (optional - backward compatible):
   - Current: `calcium_theme`, `calcium_goal`, etc.
   - Consider: `nutrient_theme`, `nutrient_goals` (requires migration)
   - **Recommendation**: Keep current keys for backward compatibility, only update in comments

5. **Service/Store Names** (optional - breaking change):
   - `CalciumService` → `NutrientService`
   - `calciumState` → `nutrientState`
   - **Recommendation**: Rename in Phase 7 (refactoring) to avoid scope creep

6. **User-Facing Strings**:
   - Settings page headers
   - Menu labels
   - Empty states
   - Toast messages

**Automated Approach**:
```bash
# Find all references
grep -r "My Calcium" src/ --include="*.svelte" --include="*.ts" --include="*.js" --include="*.html"

# Careful manual replacement (don't break code logic)
# Focus on:
# - Comments
# - UI strings
# - Titles
# - Descriptions
```

**Files** (primary):
- `src/app.html`
- `vite.config.js`
- All component headers (40+ files)
- `src/lib/components/Header.svelte` (menu title)
- `src/routes/settings/+page.svelte` (page title)

---

### Phase 7: Database Page Redesign

**Duration**: 3-4 days
**Priority**: High
**Goal**: Redesign database browser to support multi-nutrient display and filtering

#### Current State Analysis

**What Works**:
- Search functionality (nutrient-agnostic)
- Food type filtering (Available/Database/User)
- Sorting by name and type
- Bulk operations (hide, favorite, delete)
- Metadata display with source indicators

**What's Calcium-Specific**:
- Calcium value column (only nutrient shown)
- "Ca" sort button (hardcoded to calcium)
- Calcium range filter (0mg, 1-50mg, 51-200mg, etc.)
- Display format: shows only calcium per serving

#### Design Recommendations

**Option A: Compact Multi-Column Display** (Recommended for Desktop)

Show selected nutrients as compact columns (similar to FoodEntry cards):

```
┌─────────────────────────────────────────────────────────────┐
│ Search: [..................] Filter: [Available ▼]  Sort ▼  │
├─────────────────────────────────────────────────────────────┤
│ Food Name                    | Pro | Ca  | Fiber | Vit D    │
├─────────────────────────────────────────────────────────────┤
│ Milk, whole (1 cup)          | 8g  |276mg|  0g   | 2.5mcg   │
│ Greek yogurt, plain (1 cup)  | 17g |187mg|  0g   |  0mcg    │
│ Broccoli, cooked (1 cup)     | 4g  | 62mg| 5.1g  |  0mcg    │
└─────────────────────────────────────────────────────────────┘
```

**Pros**:
- Shows all tracked nutrients at once
- Easy to compare foods across nutrients
- Familiar spreadsheet-like interface

**Cons**:
- Limited horizontal space on mobile
- More columns = narrower cells
- May need horizontal scroll on small screens

---

**Option B: Mobile-First Stacked Cards** (Recommended for Mobile)

Show each food as a card with nutrients inline:

```
┌──────────────────────────────────────┐
│ Milk, whole                      [⋮] │
│ 1 cup (244g)                         │
│ 8g Pro | 276mg Ca | 0g Fiber | 2.5mcg Vit D │
│ Source: USDA Database                │
└──────────────────────────────────────┘
```

**Pros**:
- Works perfectly on mobile
- Consistent with FoodEntry display
- No horizontal scrolling
- Room for metadata badges

**Cons**:
- Takes more vertical space
- Harder to scan/compare across foods

---

**Recommended Hybrid Approach**:

**Mobile (<768px)**: Stacked cards with inline nutrients
**Desktop (≥768px)**: Multi-column table view

```svelte
<!-- Responsive table/card view -->
{#if windowWidth < 768}
  <!-- Mobile: Cards -->
  {#each filteredFoods as food}
    <div class="food-card">
      <div class="food-name">{food.name}</div>
      <div class="food-measure">{getPrimaryMeasure(food).measure}</div>
      <div class="food-nutrients">
        {#each displayedNutrients as nutrientId}
          {@const value = getPrimaryMeasure(food).nutrients?.[nutrientId] ?? 0}
          <span>{value.toFixed(1)}{getNutrientUnit(nutrientId)} {getNutrientLabel(nutrientId)}</span>
          {#if !$last} | {/if}
        {/each}
      </div>
      <div class="food-actions">...</div>
    </div>
  {/each}
{:else}
  <!-- Desktop: Table -->
  <table class="food-table">
    <thead>
      <tr>
        <th on:click={() => sortBy = 'name'}>Food Name</th>
        {#each displayedNutrients as nutrientId}
          <th on:click={() => sortByNutrient(nutrientId)}>
            {getNutrientLabel(nutrientId)} ({getNutrientUnit(nutrientId)})
          </th>
        {/each}
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each filteredFoods as food}
        <tr>
          <td>{food.name}<br/><small>{getPrimaryMeasure(food).measure}</small></td>
          {#each displayedNutrients as nutrientId}
            <td>{(getPrimaryMeasure(food).nutrients?.[nutrientId] ?? 0).toFixed(1)}</td>
          {/each}
          <td>...</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
```

---

#### Sorting Redesign

**Current**: Three-way rotation on "Ca" button (calcium ascending/descending/type)

**Proposed**: Dynamic nutrient sorting with clearer UI

**Mobile Approach**:
```
Sort by: [Name ▼] [Protein ▼] [Calcium ▼] [Fiber ▼] [Vitamin D ▼] [Type ▼]
```
- Show one sort button per displayed nutrient (max 4)
- Each button cycles: asc → desc → inactive
- Visual indicator (↑ ↓) for direction

**Desktop Approach**:
- Clickable column headers (standard table sorting)
- Arrow indicators in headers
- Multi-column sort (shift+click for secondary sort)

**Implementation**:
```javascript
let currentSort = {
  column: 'name',        // 'name', 'type', or nutrient ID
  direction: 'asc',      // 'asc' or 'desc'
  secondary: null        // Optional secondary sort
};

function sortByNutrient(nutrientId) {
  if (currentSort.column === nutrientId) {
    // Toggle direction
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    // New column, default to descending (highest first)
    currentSort = { column: nutrientId, direction: 'desc', secondary: null };
  }
  applySorting();
}

function applySorting() {
  filteredFoods.sort((a, b) => {
    let comparison = 0;

    if (currentSort.column === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (currentSort.column === 'type') {
      comparison = getTypeSortPriority(a) - getTypeSortPriority(b);
    } else {
      // Sort by nutrient value
      const aValue = getPrimaryMeasure(a).nutrients?.[currentSort.column] ?? 0;
      const bValue = getPrimaryMeasure(b).nutrients?.[currentSort.column] ?? 0;
      comparison = aValue - bValue;
    }

    return currentSort.direction === 'asc' ? comparison : -comparison;
  });
}
```

---

#### Filtering Redesign

**Current**: Calcium range filter (preset ranges like "201-500mg")

**Proposed**: Generic nutrient filter with dynamic ranges

**UI Design**:
```
Filter by nutrient: [Select nutrient ▼] [Range ▼]

Ranges adjust based on selected nutrient:
- Protein: None | Low (<5g) | Medium (5-15g) | High (15-30g) | Very High (30g+)
- Calcium: None | Low (<50mg) | Medium (50-200mg) | High (200-500mg) | Very High (500mg+)
- Fiber: None | Low (<2g) | Medium (2-5g) | High (5-10g) | Very High (10g+)
```

**Implementation**:
```javascript
// Define ranges per nutrient
const NUTRIENT_RANGES = {
  protein: [
    { label: 'Low (<5g)', min: 0, max: 5 },
    { label: 'Medium (5-15g)', min: 5, max: 15 },
    { label: 'High (15-30g)', min: 15, max: 30 },
    { label: 'Very High (30g+)', min: 30, max: Infinity }
  ],
  calcium: [
    { label: 'Low (<50mg)', min: 0, max: 50 },
    { label: 'Medium (50-200mg)', min: 50, max: 200 },
    { label: 'High (200-500mg)', min: 200, max: 500 },
    { label: 'Very High (500mg+)', min: 500, max: Infinity }
  ],
  fiber: [
    { label: 'Low (<2g)', min: 0, max: 2 },
    { label: 'Medium (2-5g)', min: 2, max: 5 },
    { label: 'High (5-10g)', min: 5, max: 10 },
    { label: 'Very High (10g+)', min: 10, max: Infinity }
  ],
  // ... define for all nutrients
};

let nutrientFilter = {
  nutrient: 'calcium',  // Which nutrient to filter by
  range: null           // Selected range object
};

function passesNutrientFilter(food) {
  if (!nutrientFilter.range) return true;

  const value = getPrimaryMeasure(food).nutrients?.[nutrientFilter.nutrient] ?? 0;
  return value >= nutrientFilter.range.min && value <= nutrientFilter.range.max;
}
```

**Simplified Alternative** (if ranges are too complex):
- Single "Minimum value" input field
- Show only foods with nutrient value >= minimum
- Simpler UI, less overwhelming

---

#### Files to Modify

- `src/routes/data/+page.svelte` (main database page)
- `src/lib/config/nutrientDefaults.ts` (add NUTRIENT_RANGES constant)
- `src/lib/data/foodDatabase.js` (helper functions if needed)

---

### Phase 8: Tracking Page Sorting Improvements

**Duration**: 1-2 days
**Priority**: Medium
**Goal**: Allow sorting by any displayed nutrient, not just calcium

#### Current State

The tracking page (main food journal) has `SortControls.svelte` with three buttons:
- Added (time-based)
- Name (alphabetical)
- Ca (calcium value)

**Issue**: The "Ca" button is hardcoded to calcium and doesn't adapt to user's selected nutrients.

#### Design Recommendations

**Option A: Dynamic Nutrient Button** (Simplest)

Replace "Ca" button with a dynamic button that cycles through displayed nutrients:

```
Sort: [Added] [Name] [Protein] → [Calcium] → [Fiber] → [Vit D] → back to [Protein]
```

**Pros**:
- Minimal UI changes
- Consistent button count (3)
- Discoverable (tap to cycle through nutrients)

**Cons**:
- Not obvious that it cycles
- Takes multiple taps to reach desired nutrient
- Icon/label changes on each cycle (could be confusing)

**Implementation**:
```javascript
// In SortControls.svelte or parent page
let nutrientSortIndex = 0;
$: currentNutrientSort = displayedNutrients[nutrientSortIndex];

function cycleNutrientSort() {
  nutrientSortIndex = (nutrientSortIndex + 1) % displayedNutrients.length;
  dispatch('sortChange', { sortBy: currentNutrientSort });
}
```

```svelte
<button on:click={cycleNutrientSort}>
  <span class="material-icons">science</span>
  <span>{getNutrientLabel(currentNutrientSort)}</span>
  <span class="material-icons">
    {sortOrder === 'asc' ? 'expand_less' : 'expand_more'}
  </span>
</button>
```

---

**Option B: Expandable Nutrient Menu** (More Discoverable)

Show a dropdown/menu when tapping the nutrient sort button:

```
Sort: [Added] [Name] [Nutrients ▼]
                      ↓
            [✓ Protein]
            [  Calcium]
            [  Fiber]
            [  Vitamin D]
```

**Pros**:
- Clear which nutrient is active
- All nutrients visible at once
- Familiar dropdown pattern

**Cons**:
- Adds complexity (menu state management)
- Takes up more screen space when open
- Extra tap to select (tap button → tap nutrient)

**Implementation**:
```svelte
<div class="nutrient-sort-container">
  <button on:click={() => showNutrientMenu = !showNutrientMenu}>
    <span class="material-icons">science</span>
    <span>{getNutrientLabel(currentNutrientSort)}</span>
    <span class="material-icons">expand_more</span>
  </button>

  {#if showNutrientMenu}
    <div class="nutrient-menu">
      {#each displayedNutrients as nutrientId}
        <button
          class:active={currentNutrientSort === nutrientId}
          on:click={() => selectNutrientSort(nutrientId)}
        >
          {#if currentNutrientSort === nutrientId}✓{/if}
          {getNutrientLabel(nutrientId)}
        </button>
      {/each}
    </div>
  {/if}
</div>
```

---

**Option C: Gesture-Based Cycling** (Most Space-Efficient)

Keep "Ca" label but make it dynamic, cycle with **long-press** or **swipe**:

```
Sort: [Added] [Name] [Pro] ← shows current, long-press/swipe to change
```

**Pros**:
- Cleanest UI (no extra buttons or menus)
- Power-user friendly
- Maintains 3-button layout

**Cons**:
- Discoverability issue (users won't know to long-press)
- Need tooltip/hint on first use
- More complex gesture handling

---

**Recommendation**: **Option A (Dynamic Cycling)** for Phase 8, **Option B (Dropdown)** as a stretch goal if time permits.

**Why Option A**:
- Simplest implementation
- Consistent with current 3-button layout
- Users can tap multiple times quickly to reach desired nutrient
- Label updates provide clear feedback

**Enhancement**: Add a tooltip on first use: "Tap to cycle through nutrients"

---

#### Files to Modify

- `src/lib/components/SortControls.svelte` (update Ca button to be dynamic)
- `src/routes/+page.svelte` (pass displayedNutrients to SortControls)
- `src/lib/stores/calcium.ts` (update sorting logic to handle any nutrient)

---

### Phase 9: HTML Documentation Generation Review

**Duration**: 1 day
**Priority**: Low
**Goal**: Evaluate and improve database documentation generation

#### Current State

The `source_data/html-docs-generator.cjs` script generates `static/database-docs.html` showing:
- All foods in the curated database
- Collapsed foods (USDA entries merged into curated entries)
- Nutrient values per serving

**In My Calcium**: This was useful to see which USDA foods were hidden/merged.

**Concerns for My Nutrients**:
1. **File Size**: Showing 25 nutrients per food × 4,000+ foods could create a massive HTML file (5-10MB+)
2. **Readability**: A full nutrient table per serving is overwhelming
3. **Purpose**: Is the collapsed food list still valuable to users?

#### Options

**Option A: Keep Full Nutrient Display**
- Show all nutrients in a scrollable table
- Pros: Complete information
- Cons: Very large file, hard to navigate

**Option B: Show Only Displayed Nutrients**
- Only show user's 4 selected nutrients (default: protein, calcium, fiber, vitamin D)
- Pros: Smaller file, more focused
- Cons: Incomplete information, not configurable

**Option C: Collapsible Nutrient Sections**
- Show primary nutrients (protein, calcium) by default
- "Show all nutrients" button per food
- Pros: Best of both worlds
- Cons: Requires JavaScript in static HTML

**Option D: Remove HTML Documentation**
- Don't generate HTML docs
- Provide database browser in-app (already exists)
- Pros: No maintenance, users already have better UI in app
- Cons: Can't reference docs externally

**Option E: Generate CSV Instead**
- Export database to CSV format
- Users can open in Excel/Sheets for analysis
- Pros: Better tool for data exploration
- Cons: Less user-friendly for casual browsing

---

**Recommendation**: **Option B (Show Only Displayed Nutrients)** with a note at the top of the HTML explaining how to view more nutrients in-app.

**Rationale**:
- The database browser page (in-app) is superior for exploration
- HTML docs serve as a quick reference, not exhaustive data dump
- Showing 4 nutrients keeps file size manageable (~2-3MB)
- Users who need detailed analysis can use the in-app browser or export to CSV

**Alternative**: Defer this to post-launch. The HTML docs aren't critical functionality.

---

#### Files to Modify (if implemented)

- `source_data/html-docs-generator.cjs` (update to show limited nutrients)
- Add comment in HTML: "For full nutrient details, use the Database page in the app"

---

### Phase 10: Final Polish & Testing

**Duration**: 2-3 days
**Priority**: High
**Goal**: Production-ready release

#### Task 10.1: Code Cleanup & Consolidation

**Type System Unification**:
- Currently two type files: `calcium.ts` (legacy) and `nutrients.ts` (modern)
- Consolidate into `nutrients.ts` only
- Update all imports throughout codebase

**Service Renaming** (optional):
- `CalciumService` → `NutrientService`
- `calciumState` → `nutrientState`
- This is a large refactor; may defer to v1.1

**Remove Dead Code**:
- Remove unused imports
- Clean up commented-out code
- Remove debug console.logs

---

#### Task 10.2: Cross-Browser Testing

**Browsers**:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari iOS (latest)
- Chrome Android (latest)

**Test Scenarios**:
1. Install PWA
2. Add foods with multi-nutrients
3. Change displayed nutrients in settings
4. View stats for different nutrients
5. Search database
6. Sort by different nutrients
7. Backup and restore
8. Offline mode

---

#### Task 10.3: Accessibility Audit

**Checks**:
- Keyboard navigation (tab through all interactive elements)
- Screen reader compatibility (NVDA/VoiceOver)
- Color contrast (4.5:1 minimum)
- Touch targets (44px minimum)
- Focus indicators visible

**Tools**:
- Lighthouse accessibility audit
- axe DevTools
- Manual testing with screen reader

---

#### Task 10.4: Performance Optimization

**Metrics to Check**:
- Initial load time (<3s)
- Food search response (<500ms)
- Database page rendering (<1s for 4,000 foods)
- Stats chart rendering (<1s)

**Optimizations**:
- Lazy load stats charts
- Virtualize long food lists
- Debounce search input
- Cache computed values

---

#### Task 10.5: Documentation Updates

**User-Facing**:
- Update guide page with nutrient selection instructions
- Add FAQ: "How do I change which nutrients are displayed?"
- Update about page with app description

**Developer-Facing**:
- Update `CLAUDE.md` with new branding
- Update `README.md`
- Update implementation plan with actual completion status
- Document any deviations from original plan

---

### Phase 11: Deployment & Migration

**Duration**: 1 day
**Priority**: High
**Goal**: Deploy to production, migrate user data

#### Task 11.1: Production Build

```bash
npm run build
```

**Verify**:
- Build succeeds without errors
- Bundle size reasonable (~3-4MB with database)
- Service worker registers
- Manifest generated correctly

---

#### Task 11.2: Update Deployment

**Files to Deploy**:
- Entire `build/` directory
- Updated manifest
- New service worker

**Post-Deployment Checks**:
- PWA installs correctly
- Offline mode works
- All routes load
- No console errors

---

#### Task 11.3: Data Migration (if needed)

If user has existing My Calcium data:

1. **Backup Current Data**
   - Export backup from My Calcium app
   - Save to multiple locations

2. **Run Migration Script**
   ```bash
   node source_data/migrate-calcium-to-nutrients.cjs \
     --input calcium-backup.json \
     --output nutrients-backup.json
   ```

3. **Import to My Nutrients**
   - Open My Nutrients app
   - Go to Settings → Restore
   - Import migrated backup
   - Verify all data present

4. **Set Up Sync**
   - Generate new sync doc ID (old My Calcium sync won't work)
   - Pair devices
   - Test synchronization

---

## Summary of Phases

| Phase | Name | Duration | Priority | Status |
|-------|------|----------|----------|--------|
| 6 | Critical Fixes & UX | 2-3 days | High | ⏳ Pending |
| 7 | Database Page Redesign | 3-4 days | High | ⏳ Pending |
| 8 | Tracking Page Sorting | 1-2 days | Medium | ⏳ Pending |
| 9 | HTML Docs Review | 1 day | Low | ⏳ Pending |
| 10 | Final Polish & Testing | 2-3 days | High | ⏳ Pending |
| 11 | Deployment & Migration | 1 day | High | ⏳ Pending |

**Total Estimated Time**: 10-15 days

---

## Discussion Points

Before proceeding, please provide feedback on the following:

### 1. Nutrient Selector Scope (Task 6.2)

Should the stats/reports pages:
- **Option A**: Show only the 1-4 displayed nutrients in dropdown (simpler, mobile-friendly)
- **Option B**: Show all nutrients with displayed ones at the top (current behavior, but tall)
- **Option C**: Show displayed nutrients + "View all" button that opens modal

**Your preference**: _______

---

### 2. Database Page Design (Phase 7)

Which display approach do you prefer:
- **Option A**: Multi-column table (desktop), stacked cards (mobile) - **Recommended**
- **Option B**: Always use stacked cards (simpler, consistent across devices)
- **Option C**: Always use table with horizontal scroll

**Your preference**: _______

---

### 3. Database Page Sorting (Phase 7)

How should nutrient sorting work:
- **Option A**: Show sort buttons for each displayed nutrient (max 4 buttons)
- **Option B**: Single "Nutrient" button that opens dropdown menu
- **Option C**: Clickable column headers (desktop only), dropdown (mobile)

**Your preference**: _______

---

### 4. Tracking Page Sorting (Phase 8)

How should the nutrient sort button work:
- **Option A**: Cycle through displayed nutrients on each tap - **Recommended**
- **Option B**: Open dropdown menu to select nutrient
- **Option C**: Long-press/swipe to cycle (gesture-based)

**Your preference**: _______

---

### 5. HTML Documentation (Phase 9)

What should we do with database documentation:
- **Option A**: Show only displayed nutrients (4 nutrients) - **Recommended**
- **Option B**: Show all 25 nutrients (large file)
- **Option C**: Remove HTML docs entirely, use in-app browser only
- **Option D**: Generate CSV export instead

**Your preference**: _______

---

### 6. Service/Store Renaming

Should we rename `CalciumService` and `calciumState` in Phase 10:
- **Yes**: Clean up naming to reflect multi-nutrient architecture (more refactoring)
- **No**: Keep current names for backward compatibility (simpler, less risk)

**Your preference**: _______

---

## Next Steps

1. **Review this plan** and provide feedback on discussion points
2. **Approve or adjust** the proposed phases
3. **Begin Phase 6** with critical fixes
4. **Iterate** based on testing and user feedback

---

## Open Questions

1. **Migration timing**: When should existing My Calcium users migrate? Immediately or gradual rollout?
2. **Version numbering**: Is this v1.0 or v2.0 (since it's a major feature expansion)?
3. **Sync compatibility**: Should My Nutrients sync be backward compatible with My Calcium sync docs, or fresh start?
4. **Analytics**: Any interest in adding privacy-respecting analytics (local only) to track which nutrients users select most?

---

## Success Criteria

The project is complete when:

- ✅ All user-facing strings say "My Nutrients" (not "My Calcium")
- ✅ Nutrient selection modal works smoothly (no bugs)
- ✅ Stats/Reports nutrient selector is mobile-friendly
- ✅ Database page supports multi-nutrient display and sorting
- ✅ Tracking page can sort by any displayed nutrient
- ✅ All documentation updated
- ✅ Cross-browser testing passed
- ✅ Accessibility audit passed
- ✅ Production deployment successful
- ✅ User data migrated without loss

---

**Document Version**: 1.0
**Last Updated**: December 13, 2025
**Author**: Claude (AI Assistant)
**Maintained By**: Nathan A. Eaton Jr.
