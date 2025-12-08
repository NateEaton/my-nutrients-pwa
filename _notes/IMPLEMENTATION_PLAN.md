# My Nutrients - Implementation Plan

**Version**: 1.0.0
**Target Timeline**: 3-4 weeks
**Start Date**: December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Data Foundation](#phase-1-data-foundation)
3. [Phase 2: Core Services & Settings](#phase-2-core-services--settings)
4. [Phase 3: UI Updates](#phase-3-ui-updates)
5. [Phase 4: Nutrient Views](#phase-4-nutrient-views)
6. [Phase 5: Stats & Reports](#phase-5-stats--reports)
7. [Phase 6: Polish & Production](#phase-6-polish--production)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Plan](#rollback-plan)

---

## Overview

This implementation plan breaks down the transformation from **My Calcium** to **My Nutrients** into 6 manageable phases over 3-4 weeks. Each phase has clear deliverables, success criteria, and testing requirements.

### Guiding Principles

1. **Incremental Progress**: Each phase builds on the previous
2. **Continuous Testing**: Test after every major change
3. **Maintain Stability**: Calcium tracking should work throughout Phase 1-2
4. **Document as You Go**: Update this plan with actual progress
5. **No Scope Creep**: Stick to MVP for v1.0

### Timeline Assumptions

- **Full-time focus**: 5-7 days per week
- **Uninterrupted work**: Minimal context switching
- **AI assistance**: Available for rapid iteration
- **Flexibility**: Adjust timeline based on actual progress

---

## Phase 1: Data Foundation

**Duration**: 5-7 days (Week 1)
**Goal**: Update data layer without breaking existing UI

### Day 1-2: USDA Data Validation & Pipeline Configuration

#### Tasks

- [ ] Download full USDA FDC CSV files
  - [ ] Foundation Foods CSV from https://fdc.nal.usda.gov/download-datasets/
  - [ ] SR Legacy Foods CSV from same source
  - [ ] Verify file sizes (Foundation ~500MB, SR Legacy ~200MB)

- [ ] Inspect CSV structure
  - [ ] Extract header row from both files
  - [ ] Identify all nutrient columns (protein, calcium, fiber, vitamins, etc.)
  - [ ] Document exact column names for each target nutrient
  - [ ] Note any missing nutrients

- [ ] Combine CSV files
  ```bash
  # macOS/Linux
  cat "Foundation_Foods.csv" "SR_Legacy_Foods.csv" | grep -v '"Data Type"' > combined_input.csv

  # Windows
  type "Foundation_Foods.csv" "SR_Legacy_Foods.csv" | findstr /v /c:"\"Data Type\"" > combined_input.csv
  ```

- [ ] Update `source_data/usda-fdc-config.json`
  - [ ] Add column mappings for all 20+ nutrients
  - [ ] Update dataTypeMapping for proper type conversion
  - [ ] Verify sourceName, sourceIdColumn still correct
  - [ ] Update metadata version to 2025.3

#### Deliverables

- Combined CSV file with all source data
- Updated `usda-fdc-config.json` with nutrient mappings
- Documentation of any missing nutrients

#### Success Criteria

- [ ] CSV combines successfully without errors
- [ ] All 20+ target nutrients identified in CSV columns
- [ ] Config file validates (can be parsed as JSON)

#### Testing

```bash
# Validate JSON syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('source_data/usda-fdc-config.json')))"

# Check CSV line count
wc -l combined_input.csv  # Should be ~100k+ lines
```

---

### Day 3-4: Database Generation

#### Tasks

- [ ] Run data pipeline with new configuration
  ```bash
  cd source_data

  # Step 1: Assign stable appIds
  node master-key-assigner.cjs combined_input.csv mastered-data \
    --config usda-fdc-config.json \
    --map-file appid-mapping.json \
    --output-map appid-mapping-updated.json

  # Step 2: Curate data
  node food-curator.cjs mastered-data.json curated-data \
    --keep-list keep-list.txt \
    --exclude-list exclude-list.txt

  # Step 3: Generate app module
  node data-module-generator.cjs curated-data-abridged.json foodDatabaseData.js \
    --module --minify --minimal
  ```

- [ ] Validate output
  - [ ] Check `curated-data-abridged.json` size (~2-3MB expected)
  - [ ] Verify foods have `nutrients` object with multiple nutrients
  - [ ] Spot-check 10-20 foods for data accuracy
  - [ ] Ensure calcium values match old database for same foods

- [ ] Move generated files
  ```bash
  # Move to app source directory
  mv foodDatabaseData.js ../src/lib/data/

  # Keep curated JSON for reference
  cp curated-data-abridged.json ../source_data/
  ```

- [ ] Update database docs (optional for Phase 1)
  ```bash
  node html-docs-generator.cjs curated-data-abridged.json static/database-docs.html
  ```

#### Deliverables

- `foodDatabaseData.js` with multi-nutrient support
- `curated-data-abridged.json` for reference
- Validation report (manual spot-checking)

#### Success Criteria

- [ ] Database generates without errors
- [ ] File size is 2-3MB (minified)
- [ ] Sample foods contain 15+ nutrients
- [ ] Calcium values consistent with old database

#### Testing

```javascript
// Test in browser console after loading
import { getFoodDatabase } from '$lib/data/foodDatabase.js';

const db = await getFoodDatabase();
console.log('Total foods:', db.length);

// Check a specific food (e.g., milk)
const milk = db.find(f => f.name.toLowerCase().includes('milk, whole'));
console.log('Milk nutrients:', milk.measures[0].nutrients);
// Should see: { calcium: 276, protein: 7.7, vitaminD: 2.4, ... }
```

---

### Day 5-7: Schema & Migration

#### Tasks

- [ ] Update TypeScript interfaces
  - [ ] Create `src/lib/types/nutrients.ts`
    ```typescript
    export interface NutrientValues {
      protein?: number;
      fiber?: number;
      calcium?: number;
      magnesium?: number;
      // ... all 20+ nutrients
    }
    ```

  - [ ] Update `src/lib/types/calcium.ts` (or rename to nutrients.ts)
    ```typescript
    interface FoodEntry {
      name: string;
      nutrients: NutrientValues;  // Changed from: calcium: number
      servingQuantity: number;
      servingUnit: string;
      timestamp: string;
      isCustom?: boolean;
      customFoodId?: number;
      note?: string;
    }

    interface USDAFood {
      id: number;
      name: string;
      measures?: Array<{
        measure: string;
        nutrients: NutrientValues;  // Changed from: calcium: number
      }>;
    }

    interface JournalEntry {
      date: string;
      foods: FoodEntry[];
      lastModified: number;
      syncStatus: string;
      totalNutrients: NutrientValues;  // Changed from: totalCalcium: number
    }

    interface NutrientSettings {
      nutrientGoals: Record<string, number>;
      displayedNutrients: string[];  // Max 4
      theme: string;
      colorScheme: string;
    }
    ```

- [ ] Update IndexedDB schema
  - [ ] Rename database: `CalciumTracker` → `NutrientTracker`
  - [ ] Version: 1 (fresh start for new app identity)
  - [ ] Update `src/lib/services/db.ts` (or wherever DB is initialized)

  ```typescript
  const DB_NAME = 'NutrientTracker';
  const DB_VERSION = 1;

  // Object stores remain the same structure
  // Just data models change
  ```

- [ ] Write migration script
  - [ ] Create `migration/migrate-calcium-to-nutrients.js`
  - [ ] Read old backup file (My Calcium format)
  - [ ] Transform data:
    - `calcium: 250` → `nutrients: { calcium: 250 }`
    - `totalCalcium: 500` → `totalNutrients: { calcium: 500 }`
    - `preferences.dailyGoal` → `nutrientGoals.calcium`
  - [ ] Add default settings:
    - `displayedNutrients: ['protein', 'calcium', 'fiber', 'vitaminD']`
    - `nutrientGoals` for all tracked nutrients (use RDA values)
  - [ ] Write new backup file (My Nutrients format)

- [ ] Test migration with real data
  - [ ] Use wife's latest backup file
  - [ ] Run migration script
  - [ ] Validate output:
    - All journal entries present
    - All custom foods preserved
    - Calcium values match
    - New fields populated with defaults

#### Deliverables

- Updated TypeScript interfaces
- Migration script
- Migrated backup file (ready for Phase 6 deployment)

#### Success Criteria

- [ ] TypeScript compilation succeeds (no errors)
- [ ] Migration script runs without errors
- [ ] Migrated backup passes validation
- [ ] Journal entry count matches (122 days as of Nov 19)
- [ ] Custom food count matches (43 foods)
- [ ] Calcium values unchanged

#### Testing

```bash
# Run migration script
node migration/migrate-calcium-to-nutrients.js \
  --input calcium-backup.json \
  --output nutrients-backup.json

# Validate
node migration/validate-backup.js nutrients-backup.json
```

---

### Phase 1 Acceptance Criteria

Before moving to Phase 2:

- [x] Multi-nutrient database generated and validated
- [x] TypeScript interfaces updated and compiling
- [x] Migration script tested with real backup data
- [x] No regressions in calcium tracking (if testing with old UI)
- [x] All deliverables committed to git

---

## Phase 2: Core Services & Settings

**Duration**: 5-7 days (Week 2)
**Goal**: Backend services support multi-nutrient operations

### Day 8-9: Service Layer Updates

#### Tasks

- [ ] Update `CalciumService.ts`
  - [ ] Rename to `NutrientService.ts` (or keep name, update logic)
  - [ ] Update `addFood()` method
    ```typescript
    // Old
    const entry = { name, calcium, servingQuantity, servingUnit, timestamp };

    // New
    const entry = { name, nutrients, servingQuantity, servingUnit, timestamp };
    ```

  - [ ] Update `saveFoodsForDate()` method
    ```typescript
    // Calculate totalNutrients instead of totalCalcium
    const totalNutrients = this.calculateTotalNutrients(foods);

    const journalEntry = {
      date,
      foods,
      lastModified: Date.now(),
      syncStatus: 'pending',
      totalNutrients  // Changed from totalCalcium
    };
    ```

  - [ ] Add `calculateTotalNutrients()` method
    ```typescript
    calculateTotalNutrients(foods: FoodEntry[]): NutrientValues {
      const totals: NutrientValues = {};

      for (const food of foods) {
        for (const [nutrient, value] of Object.entries(food.nutrients)) {
          totals[nutrient] = (totals[nutrient] || 0) + value;
        }
      }

      return totals;
    }
    ```

  - [ ] Update settings methods
    - `getSettings()` → return `NutrientSettings`
    - `updateSettings()` → handle `nutrientGoals`, `displayedNutrients`

- [ ] Update `FDCService.ts` (Smart Scan)
  - [ ] Add nutrient ID mapping
    ```typescript
    const NUTRIENT_MAP: Record<string, string> = {
      '203': 'protein',
      '291': 'fiber',
      '301': 'calcium',
      '304': 'magnesium',
      '306': 'potassium',
      '303': 'iron',
      '309': 'zinc',
      '328': 'vitaminD',
      '418': 'vitaminB12',
      '435': 'folate',
      '415': 'vitaminB6',
      '320': 'vitaminA',
      '401': 'vitaminC',
      '430': 'vitaminK',
      // Add omega-3, omega-6, fats, carbs, sugars
    };
    ```

  - [ ] Update `parseProductData()` method
    ```typescript
    // Replace single calcium extraction with multi-nutrient
    function extractNutrients(product: FDCProduct): NutrientValues {
      const nutrients: NutrientValues = {};

      for (const [nutrientId, key] of Object.entries(NUTRIENT_MAP)) {
        const nutrient = product.foodNutrients?.find(
          n => n.nutrientNumber === nutrientId || n.nutrientId === parseInt(nutrientId)
        );

        if (nutrient?.value) {
          nutrients[key] = parseFloat(nutrient.value);
        }
      }

      return nutrients;
    }
    ```

- [ ] Update `BackupService.ts`
  - [ ] Update `BackupData` interface
    ```typescript
    interface BackupData {
      metadata: {
        version: '3.0.0',  // Bumped from 2.1.0
        createdAt: string,
        appVersion: string,
        buildId: string,
        syncGenerationId: string
      },
      preferences: NutrientSettings,  // Changed from CalciumSettings
      customFoods: CustomFood[],
      favorites: number[],
      hiddenFoods: number[],
      servingPreferences: UserServingPreference[],
      journalEntries: Record<string, FoodEntry[]>
    }
    ```

  - [ ] Update `generateBackup()` to use new format
  - [ ] Update `restoreFromBackup()` to handle v3.0 format
  - [ ] Add backward compatibility for v2.1 backups (migrate on restore)

- [ ] Update localStorage keys
  - [ ] Change prefix: `calcium_` → `nutrient_`
  - [ ] New keys:
    - `nutrient_goals` (JSON)
    - `nutrient_displayed` (JSON array)
    - `nutrient_theme`
    - `nutrient_sync_settings`
  - [ ] Migration helper to copy old settings (one-time)

#### Deliverables

- Updated service files
- Backward-compatible backup/restore
- localStorage migration helper

#### Success Criteria

- [ ] TypeScript compiles without errors
- [ ] Unit tests pass (if any exist)
- [ ] Can add food with multi-nutrient data
- [ ] Daily totals calculate correctly for all nutrients
- [ ] Backup/restore works with new format

#### Testing

```typescript
// Manual testing in browser console
import { nutrientService } from '$lib/stores/nutrients';

// Add a test food
await nutrientService.addFood({
  name: 'Test Yogurt',
  nutrients: {
    protein: 17,
    calcium: 250,
    vitaminD: 2.5
  },
  servingQuantity: 1,
  servingUnit: 'cup',
  timestamp: new Date().toISOString()
});

// Check daily totals
const foods = await nutrientService.loadFoodsForDate('2025-12-07');
const totals = nutrientService.calculateTotalNutrients(foods);
console.log('Total nutrients:', totals);
// Should show aggregated values
```

---

### Day 10-11: Settings UI

#### Tasks

- [ ] Create `NutrientSettingsModal.svelte`
  - [ ] Component structure:
    ```svelte
    <script>
      import { nutrientService } from '$lib/stores/nutrients';

      let settings = {
        nutrientGoals: {},
        displayedNutrients: [],
        theme: 'auto',
        colorScheme: 'blue'
      };

      let availableNutrients = [
        { id: 'protein', label: 'Protein', unit: 'g', defaultGoal: 60 },
        { id: 'calcium', label: 'Calcium', unit: 'mg', defaultGoal: 1200 },
        { id: 'fiber', label: 'Fiber', unit: 'g', defaultGoal: 25 },
        { id: 'vitaminD', label: 'Vitamin D', unit: 'mcg', defaultGoal: 20 },
        // ... all nutrients
      ];

      const MAX_DISPLAYED = 4;

      function toggleNutrient(nutrientId) {
        // Handle checkbox toggle with max limit
      }

      function saveSettings() {
        nutrientService.updateSettings(settings);
      }
    </script>

    <div class="modal">
      <h2>Manage Nutrients</h2>
      <p>Select up to {MAX_DISPLAYED} nutrients to display in food cards</p>

      <div class="nutrient-list">
        {#each availableNutrients as nutrient}
          <label>
            <input
              type="checkbox"
              checked={settings.displayedNutrients.includes(nutrient.id)}
              on:change={() => toggleNutrient(nutrient.id)}
              disabled={!selected && settings.displayedNutrients.length >= MAX_DISPLAYED}
            />
            {nutrient.label}
            <input
              type="number"
              bind:value={settings.nutrientGoals[nutrient.id]}
              placeholder={nutrient.defaultGoal}
            />
            {nutrient.unit}
          </label>
        {/each}
      </div>

      <button on:click={saveSettings}>Save</button>
    </div>
    ```

- [ ] Add to settings page
  - [ ] Update `routes/settings/+page.svelte`
  - [ ] Add button to open NutrientSettingsModal
  - [ ] Show current displayed nutrients

- [ ] Implement default goals
  - [ ] Use RDA/DV values for seniors (age 65+)
  - [ ] Store in constants file: `src/lib/config/nutrientDefaults.ts`
    ```typescript
    export const DEFAULT_NUTRIENT_GOALS = {
      protein: 60,           // g/day
      fiber: 25,             // g/day
      calcium: 1200,         // mg/day (seniors)
      magnesium: 420,        // mg/day (men), 320 (women)
      potassium: 3400,       // mg/day
      iron: 8,               // mg/day
      zinc: 11,              // mg/day
      vitaminD: 20,          // mcg/day (seniors)
      vitaminB12: 2.4,       // mcg/day
      folate: 400,           // mcg DFE/day
      vitaminB6: 1.7,        // mg/day
      vitaminA: 900,         // mcg RAE/day (men), 700 (women)
      vitaminC: 90,          // mg/day
      vitaminK: 120,         // mcg/day
      // ... etc
    };
    ```

- [ ] Validation logic
  - [ ] Prevent more than 4 nutrients selected
  - [ ] Validate goal values (must be > 0, reasonable ranges)
  - [ ] Show error messages for invalid input

#### Deliverables

- `NutrientSettingsModal.svelte` component
- Updated settings page
- Default goals configuration file

#### Success Criteria

- [ ] Modal opens and closes correctly
- [ ] Can select up to 4 nutrients (no more)
- [ ] Can set goals for each nutrient
- [ ] Settings persist to localStorage
- [ ] Settings sync correctly (if sync enabled)

#### Testing

- [ ] Open settings, select 3 nutrients, save
- [ ] Refresh page, verify selection persists
- [ ] Try to select 5th nutrient (should be disabled)
- [ ] Enter invalid goal (e.g., -10), verify error
- [ ] Export backup, verify settings included

---

### Day 12-14: Integration Testing

#### Tasks

- [ ] Test backup/restore end-to-end
  - [ ] Create backup with new format
  - [ ] Restore in fresh browser profile
  - [ ] Verify all data restored correctly
  - [ ] Test with old v2.1 backup (backward compatibility)

- [ ] Test sync functionality
  - [ ] Enable sync, push data
  - [ ] Pull from another device/browser
  - [ ] Verify nutrient settings sync
  - [ ] Verify journal entries with nutrients sync

- [ ] Test custom food creation
  - [ ] Create custom food with multiple nutrients
  - [ ] Save and reload
  - [ ] Use in journal entry
  - [ ] Verify in backup

- [ ] Test Smart Scan with multi-nutrients
  - [ ] Scan UPC code
  - [ ] Verify all nutrients extracted
  - [ ] Save to journal
  - [ ] Check daily totals

#### Deliverables

- Test results documented
- Bug fixes for any issues found

#### Success Criteria

- [ ] All tests pass without errors
- [ ] No data loss in any scenario
- [ ] Sync works reliably
- [ ] Custom foods support all nutrients

---

### Phase 2 Acceptance Criteria

- [x] Backend services fully multi-nutrient capable
- [x] Settings UI functional and validated
- [x] Backup/restore working with v3.0 format
- [x] Sync operational with new data structure
- [x] All Phase 2 tests passing

---

## Phase 3: UI Updates

**Duration**: 5-7 days (Week 3, Days 15-21)
**Goal**: Update existing UI to display multi-nutrient data

### Day 15-16: Food Cards & Summary

#### Tasks

- [ ] Update `SummaryCard.svelte`
  - [ ] Load displayed nutrients from settings
  - [ ] Show progress for each displayed nutrient (3-4)
  - [ ] Responsive layout (horizontal scroll on mobile, grid on desktop)

  ```svelte
  <script>
    import { nutrientState, displayedNutrients, nutrientGoals } from '$lib/stores/nutrients';

    $: totals = $nutrientState.totalNutrients || {};
    $: displayed = $displayedNutrients || ['protein', 'calcium', 'fiber', 'vitaminD'];
  </script>

  <div class="summary-card">
    <div class="date-section">
      <!-- Existing date navigation -->
    </div>

    <div class="nutrients-grid">
      {#each displayed as nutrientId}
        {@const total = totals[nutrientId] || 0}
        {@const goal = $nutrientGoals[nutrientId] || 0}
        {@const percent = goal > 0 ? (total / goal) * 100 : 0}

        <div class="nutrient-summary">
          <span class="nutrient-name">{getNutrientLabel(nutrientId)}</span>
          <span class="nutrient-value">{total.toFixed(1)}{getNutrientUnit(nutrientId)}</span>
          <progress value={total} max={goal}></progress>
          <span class="nutrient-goal">{percent.toFixed(0)}% of {goal}{getNutrientUnit(nutrientId)}</span>
        </div>
      {/each}
    </div>
  </div>
  ```

- [ ] Update `FoodEntry.svelte`
  - [ ] Show displayed nutrients for each food
  - [ ] Compact format: `170 cal | 17g protein | 250mg calcium | 0g fiber`

  ```svelte
  <script>
    export let food: FoodEntry;
    import { displayedNutrients } from '$lib/stores/nutrients';

    $: displayed = $displayedNutrients || [];
    $: nutrientValues = Object.entries(food.nutrients)
      .filter(([key]) => displayed.includes(key))
      .map(([key, value]) => `${value.toFixed(1)}${getNutrientUnit(key)} ${getNutrientLabel(key)}`)
      .join(' | ');
  </script>

  <div class="food-entry">
    <div class="food-name">{food.name}</div>
    <div class="food-serving">{food.servingQuantity} {food.servingUnit}</div>
    <div class="food-nutrients">{nutrientValues}</div>
    <!-- Edit/delete buttons -->
  </div>
  ```

- [ ] Create utility functions
  - [ ] `src/lib/utils/nutrientHelpers.ts`
    ```typescript
    export function getNutrientLabel(id: string): string {
      const labels = {
        protein: 'Protein',
        calcium: 'Calcium',
        fiber: 'Fiber',
        vitaminD: 'Vitamin D',
        // ... all nutrients
      };
      return labels[id] || id;
    }

    export function getNutrientUnit(id: string): string {
      const units = {
        protein: 'g',
        fiber: 'g',
        calcium: 'mg',
        vitaminD: 'mcg',
        // ... all nutrients
      };
      return units[id] || '';
    }
    ```

- [ ] Update CSS for responsive layout
  - [ ] Grid for 3-4 nutrients
  - [ ] Mobile: vertical stack or horizontal scroll
  - [ ] Desktop: 2x2 grid

#### Deliverables

- Updated SummaryCard component
- Updated FoodEntry component
- Nutrient helper utilities

#### Success Criteria

- [ ] Summary card shows 3-4 selected nutrients
- [ ] Each nutrient shows current total and progress
- [ ] Food cards show compact nutrient info
- [ ] Responsive on mobile and desktop
- [ ] Updates in real-time when food added/removed

---

### Day 17-18: Add Food Modal

#### Tasks

- [ ] Update `AddFoodModal.svelte`
  - [ ] Display selected nutrients when food is selected
  - [ ] Show nutrients updating as serving quantity changes

  ```svelte
  <script>
    export let selectedFood: USDAFood | null;
    export let selectedMeasure: { measure: string; nutrients: NutrientValues } | null;
    export let servingQuantity: number = 1;

    import { displayedNutrients } from '$lib/stores/nutrients';

    $: calculatedNutrients = selectedMeasure ? calculateNutrients(
      selectedMeasure.nutrients,
      servingQuantity
    ) : {};

    function calculateNutrients(base: NutrientValues, quantity: number): NutrientValues {
      const result: NutrientValues = {};
      for (const [key, value] of Object.entries(base)) {
        result[key] = value * quantity;
      }
      return result;
    }
  </script>

  <!-- Food search section -->

  {#if selectedFood}
    <div class="food-details">
      <h3>{selectedFood.name}</h3>

      <!-- Serving selector -->
      <select bind:value={selectedMeasure}>
        {#each selectedFood.measures as measure}
          <option value={measure}>{measure.measure}</option>
        {/each}
      </select>

      <!-- Quantity input -->
      <input type="number" bind:value={servingQuantity} min="0.1" step="0.1" />

      <!-- Nutrient preview -->
      <div class="nutrient-preview">
        <h4>Nutrients per serving</h4>
        {#each $displayedNutrients as nutrientId}
          {@const value = calculatedNutrients[nutrientId] || 0}
          <div class="nutrient-row">
            <span>{getNutrientLabel(nutrientId)}</span>
            <span>{value.toFixed(1)} {getNutrientUnit(nutrientId)}</span>
          </div>
        {/each}
      </div>

      <button on:click={addFood}>Add Food</button>
    </div>
  {/if}
  ```

- [ ] Update Smart Scan flow
  - [ ] Display all extracted nutrients after scan
  - [ ] Show which nutrients are populated vs. missing
  - [ ] Allow manual entry for missing nutrients

- [ ] Update custom food form
  - [ ] Show input fields for displayed nutrients
  - [ ] Optional: Show all nutrients with "Advanced" toggle

  ```svelte
  <div class="custom-food-form">
    <input type="text" bind:value={customFood.name} placeholder="Food name" />
    <input type="text" bind:value={customFood.measure} placeholder="Serving size (e.g., 1 cup)" />

    <h4>Nutrients</h4>
    {#each $displayedNutrients as nutrientId}
      <label>
        {getNutrientLabel(nutrientId)} ({getNutrientUnit(nutrientId)})
        <input type="number" bind:value={customFood.nutrients[nutrientId]} step="0.1" />
      </label>
    {/each}

    <button on:click={toggleAdvanced}>
      {showAllNutrients ? 'Hide' : 'Show'} all nutrients
    </button>

    {#if showAllNutrients}
      <!-- Show inputs for all 20+ nutrients -->
    {/if}
  </div>
  ```

#### Deliverables

- Updated AddFoodModal
- Updated Smart Scan display
- Updated custom food form

#### Success Criteria

- [ ] Nutrient preview updates in real-time
- [ ] All displayed nutrients shown
- [ ] Smart Scan shows all extracted nutrients
- [ ] Custom foods can have any/all nutrients

---

### Day 19-20: Testing & Polish

#### Tasks

- [ ] Cross-browser testing
  - [ ] Chrome/Edge
  - [ ] Firefox
  - [ ] Safari (iOS)
  - [ ] Mobile responsive testing

- [ ] Accessibility testing
  - [ ] Keyboard navigation works
  - [ ] Screen reader announces nutrients correctly
  - [ ] Sufficient color contrast
  - [ ] Touch targets ≥44px

- [ ] Dark/light theme testing
  - [ ] All new components respect theme
  - [ ] Nutrient colors visible in both modes

- [ ] Edge case testing
  - [ ] Empty journal day (no nutrients)
  - [ ] Food with only some nutrients populated
  - [ ] Very large nutrient values (formatting)
  - [ ] Zero goals (division by zero)

- [ ] UI polish
  - [ ] Consistent spacing/padding
  - [ ] Loading states
  - [ ] Error states
  - [ ] Empty states

#### Deliverables

- Test results document
- Bug fixes
- UI polish commits

#### Success Criteria

- [ ] Works across all major browsers
- [ ] Accessible to screen readers
- [ ] Themes work correctly
- [ ] No crashes on edge cases

---

### Phase 3 Acceptance Criteria

- [x] All UI components display multi-nutrient data
- [x] Responsive design works on mobile/tablet/desktop
- [x] Accessibility standards met
- [x] User can add foods and see nutrients updating
- [x] Cross-browser compatibility confirmed

---

## Phase 4: Nutrient Views

**Duration**: 3-5 days (Week 3, Days 19-21 + spillover)
**Goal**: New nutrient-specific analysis page

### Day 19-21: Nutrients Page

#### Tasks

- [ ] Create new route: `src/routes/nutrients/+page.svelte`

- [ ] Implement nutrient selector
  ```svelte
  <script>
    import { nutrientState, displayedNutrients, nutrientGoals } from '$lib/stores/nutrients';
    import NutrientSelector from '$lib/components/NutrientSelector.svelte';

    let selectedNutrient = 'calcium';

    $: currentTotal = $nutrientState.totalNutrients?.[selectedNutrient] || 0;
    $: currentGoal = $nutrientGoals[selectedNutrient] || 0;
    $: percentOfGoal = currentGoal > 0 ? (currentTotal / currentGoal) * 100 : 0;
  </script>

  <div class="nutrients-page">
    <NutrientSelector
      bind:selected={selectedNutrient}
      displayedNutrients={$displayedNutrients}
    />

    <div class="nutrient-detail">
      <h2>{getNutrientLabel(selectedNutrient)}</h2>

      <div class="progress-ring">
        <svg><!-- Circular progress --></svg>
        <div class="progress-text">
          {currentTotal.toFixed(1)} / {currentGoal} {getNutrientUnit(selectedNutrient)}
          <span class="percent">{percentOfGoal.toFixed(0)}%</span>
        </div>
      </div>

      <div class="trend-chart">
        <!-- 7-day sparkline -->
      </div>

      <div class="top-foods">
        <h3>Top sources today</h3>
        <!-- List foods sorted by this nutrient -->
      </div>
    </div>
  </div>
  ```

- [ ] Create `NutrientSelector.svelte` component
  ```svelte
  <script>
    export let selected: string;
    export let displayedNutrients: string[] = [];

    import { allNutrients } from '$lib/config/nutrientDefaults';

    let showDropdown = false;

    $: displayed = allNutrients.filter(n => displayedNutrients.includes(n.id));
    $: others = allNutrients.filter(n => !displayedNutrients.includes(n.id));
  </script>

  <div class="nutrient-selector">
    <button on:click={() => showDropdown = !showDropdown}>
      {getNutrientLabel(selected)} ▼
    </button>

    {#if showDropdown}
      <div class="dropdown">
        <div class="displayed-nutrients">
          {#each displayed as nutrient}
            <button
              class="nutrient-option starred"
              on:click={() => { selected = nutrient.id; showDropdown = false; }}
            >
              ⭐ {nutrient.label}
            </button>
          {/each}
        </div>

        <hr />

        <div class="other-nutrients">
          {#each others as nutrient}
            <button
              class="nutrient-option"
              on:click={() => { selected = nutrient.id; showDropdown = false; }}
            >
              {nutrient.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  ```

- [ ] Implement swipe navigation
  - [ ] Swipe left → next nutrient
  - [ ] Swipe right → previous nutrient
  - [ ] Touch event handlers
  - [ ] Keyboard arrow keys

- [ ] Implement top foods list
  ```typescript
  function getTopFoodsForNutrient(
    foods: FoodEntry[],
    nutrientId: string,
    limit: number = 5
  ): FoodEntry[] {
    return foods
      .filter(f => f.nutrients[nutrientId] && f.nutrients[nutrientId] > 0)
      .sort((a, b) => (b.nutrients[nutrientId] || 0) - (a.nutrients[nutrientId] || 0))
      .slice(0, limit);
  }
  ```

- [ ] Add to main navigation
  - [ ] Update navigation bar/menu
  - [ ] Add "Nutrients" tab/button
  - [ ] Route: `/nutrients`

#### Deliverables

- Nutrients page route
- NutrientSelector component
- Swipe navigation
- Top foods list

#### Success Criteria

- [ ] Can select any nutrient from dropdown
- [ ] Stars indicate displayed nutrients
- [ ] Swipe navigation works smoothly
- [ ] Progress ring shows accurate percentage
- [ ] Top foods sorted correctly

---

### Phase 4 Acceptance Criteria

- [x] Nutrients page functional and accessible
- [x] Swipe navigation works on mobile
- [x] All nutrients viewable (not just displayed ones)
- [x] Visual distinction between displayed and other nutrients

---

## Phase 5: Stats & Reports

**Duration**: 3-5 days (Week 4, Days 22-24)
**Goal**: Parameterize analytics by nutrient

### Day 22-23: Stats Page

#### Tasks

- [ ] Add nutrient selector to Stats page
  - [ ] Reuse `NutrientSelector` component from Phase 4
  - [ ] Add at top of page
  - [ ] Default to first displayed nutrient

- [ ] Refactor aggregation logic
  - [ ] Create generic `aggregateNutrient()` function

  ```typescript
  function aggregateNutrientForPeriod(
    journalEntries: JournalEntry[],
    nutrientId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): { date: string; value: number }[] {
    // Currently hardcoded for calcium
    // Make generic for any nutrient

    return journalEntries.map(entry => ({
      date: entry.date,
      value: entry.totalNutrients?.[nutrientId] || 0
    }));
  }
  ```

- [ ] Update chart rendering
  - [ ] Chart title includes nutrient name
  - [ ] Y-axis label shows unit (mg, g, mcg)
  - [ ] Goal line adjusts to selected nutrient's goal
  - [ ] Color scheme updates (optional)

- [ ] Update summary stats
  - [ ] Average for selected nutrient
  - [ ] Min/max for selected nutrient
  - [ ] Days meeting goal
  - [ ] Streak calculation

#### Deliverables

- Updated Stats page with nutrient selector
- Generic aggregation functions
- Dynamic charts

#### Success Criteria

- [ ] Can switch between nutrients
- [ ] Charts update correctly for each nutrient
- [ ] Goal line matches nutrient's goal
- [ ] Summary stats accurate

---

### Day 24: Report Page

#### Tasks

- [ ] Add nutrient selector to Report page
  - [ ] Similar to Stats page
  - [ ] Selection persists during report generation

- [ ] Update report generation
  - [ ] Parameterize by nutrient
  - [ ] Replace "Calcium" labels with selected nutrient
  - [ ] Update units throughout report

- [ ] Update CSV export
  - [ ] Add columns for all nutrients (not just calcium)
  - [ ] Format: `Date, Food, Serving, Protein(g), Calcium(mg), Fiber(g), ...`
  - [ ] Include daily totals row

  ```typescript
  function generateCSV(journalData: JournalEntry[]): string {
    const headers = [
      'Date',
      'Food',
      'Serving',
      'Protein (g)',
      'Calcium (mg)',
      'Fiber (g)',
      // ... all nutrients
    ];

    const rows = [];
    for (const entry of journalData) {
      for (const food of entry.foods) {
        rows.push([
          entry.date,
          food.name,
          `${food.servingQuantity} ${food.servingUnit}`,
          food.nutrients.protein || '',
          food.nutrients.calcium || '',
          food.nutrients.fiber || '',
          // ... all nutrients
        ]);
      }

      // Daily total row
      rows.push([
        entry.date,
        'DAILY TOTAL',
        '',
        entry.totalNutrients.protein || '',
        entry.totalNutrients.calcium || '',
        entry.totalNutrients.fiber || '',
        // ... all nutrients
      ]);
    }

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
  ```

#### Deliverables

- Updated Report page
- Enhanced CSV export

#### Success Criteria

- [ ] Reports generate for any selected nutrient
- [ ] CSV includes all nutrients in columns
- [ ] Export file is valid CSV format

---

### Phase 5 Acceptance Criteria

- [x] Stats page works for all nutrients
- [x] Reports work for all nutrients
- [x] CSV export includes all nutrient data
- [x] Charts and visualizations accurate

---

## Phase 6: Polish & Production

**Duration**: 3-5 days (Week 4, Days 25-27)
**Goal**: Production-ready deployment

### Day 25: End-to-End Testing

#### Tasks

- [ ] Full user flow testing
  - [ ] Fresh install → settings → add foods → view nutrients → stats → report → backup
  - [ ] Document any issues
  - [ ] Fix critical bugs

- [ ] Migration testing
  - [ ] Use wife's real backup file
  - [ ] Run migration script
  - [ ] Import into app
  - [ ] Verify all data correct:
    - [ ] 122 journal days
    - [ ] 43 custom foods
    - [ ] Calcium values match
    - [ ] All nutrients initialized

- [ ] Performance testing
  - [ ] Load time with 2-3MB database
  - [ ] Search responsiveness with 3,800+ foods
  - [ ] Chart rendering with 365 days of data
  - [ ] Profile with browser DevTools

- [ ] Edge case testing
  - [ ] Offline mode (disable network)
  - [ ] Airplane mode on mobile
  - [ ] Poor network conditions
  - [ ] Very old browser versions (graceful degradation)

#### Deliverables

- Test results document
- Bug fixes
- Performance optimizations (if needed)

#### Success Criteria

- [ ] No critical bugs
- [ ] Migration succeeds with real data
- [ ] Performance acceptable (load <3s, search <500ms)
- [ ] Works offline

---

### Day 26: Production Build & Deploy

#### Tasks

- [ ] Update README.md
  - [ ] Change "My Calcium" → "My Nutrients"
  - [ ] Update feature list
  - [ ] Update screenshots (if available)
  - [ ] Update tech stack versions

- [ ] Update app metadata
  - [ ] `package.json`: name, version (1.0.0), description
  - [ ] `vite.config.js`: PWA manifest name/description
  - [ ] Update app icons (if rebranding)

- [ ] Build production version
  ```bash
  npm run build
  ```

- [ ] Test production build locally
  ```bash
  npm run preview
  # Or serve from build/ directory
  ```

- [ ] Deploy to hosting
  - [ ] Upload `build/` directory to host
  - [ ] Verify deployment successful
  - [ ] Test live URL

- [ ] Migrate wife's data
  - [ ] Open app on wife's device
  - [ ] Export final My Calcium backup
  - [ ] Clear app data / uninstall
  - [ ] Install My Nutrients
  - [ ] Import migrated backup file
  - [ ] Verify data loaded correctly

- [ ] Set up new sync pair
  - [ ] Generate new sync doc ID
  - [ ] Pair phone and iPad
  - [ ] Test sync works both ways

#### Deliverables

- Production deployment
- Wife's device migrated
- Sync configured

#### Success Criteria

- [ ] App deployed and accessible
- [ ] Wife's data migrated successfully
- [ ] Sync working between devices
- [ ] No data loss

---

### Day 27: Monitoring & Documentation

#### Tasks

- [ ] Monitor for issues
  - [ ] Check error logs (if available)
  - [ ] Test sync reliability
  - [ ] User feedback (wife's experience)

- [ ] Update documentation
  - [ ] Mark phases as complete
  - [ ] Document any deviations from plan
  - [ ] Note lessons learned

- [ ] Create v1.0.0 release notes
  - [ ] List all features
  - [ ] Migration instructions
  - [ ] Known issues (if any)

- [ ] Plan v1.1 enhancements (future)
  - [ ] Based on user feedback
  - [ ] Nice-to-have features
  - [ ] Performance improvements

#### Deliverables

- Release notes
- Updated documentation
- v1.1 roadmap (optional)

#### Success Criteria

- [ ] App stable in production
- [ ] Documentation complete
- [ ] User satisfied with migration

---

### Phase 6 Acceptance Criteria

- [x] Production deployment successful
- [x] User data migrated safely
- [x] Sync operational
- [x] No critical issues
- [x] Documentation updated

---

## Testing Strategy

### Unit Testing

**Scope**: Core business logic functions

**Tools**: Vitest (or similar)

**Tests to write** (if time permits):
- `calculateTotalNutrients()` - Verify aggregation
- `extractNutrients()` (FDCService) - Verify nutrient extraction
- `migrateBackup()` - Verify v2.1 → v3.0 conversion
- `getNutrientLabel()`, `getNutrientUnit()` - Verify mappings

**Priority**: Medium (nice to have, not blocking for v1.0)

### Integration Testing

**Scope**: Service interactions, database operations

**Manual tests**:
- Add food → Save to IndexedDB → Reload → Verify persisted
- Update settings → Trigger sync → Pull on other device → Verify synced
- Export backup → Import on fresh install → Verify all data restored

**Priority**: High (critical for v1.0)

### End-to-End Testing

**Scope**: Full user workflows

**Test scenarios**:
1. New user setup
   - Install app
   - Configure settings (select 4 nutrients, set goals)
   - Add first food
   - View nutrients page
   - Generate report

2. Migration scenario
   - Import v2.1 backup
   - Verify journal entries
   - Verify custom foods
   - Add new multi-nutrient food
   - Export new backup

3. Sync scenario
   - Device A: Add food
   - Device B: Sync, verify food appears
   - Device B: Change settings
   - Device A: Sync, verify settings updated

**Priority**: High (blocking for production)

### Browser Compatibility Testing

**Browsers to test**:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (iOS, latest)
- [ ] Chrome (Android, latest)

**Features to verify**:
- IndexedDB works
- Service Worker installs
- Camera access (Smart Scan)
- Touch events (swipe)

**Priority**: High (blocking for production)

---

## Rollback Plan

### If Issues Found in Production

**Scenario 1: Critical bug in My Nutrients**

1. Revert deployment to My Calcium codebase
2. Restore wife's My Calcium backup (keep pre-migration backup safe)
3. Fix bug in development
4. Re-test thoroughly
5. Re-deploy when stable

**Scenario 2: Data corruption during migration**

1. Do NOT sync corrupted data
2. Use pre-migration backup (calcium-backup-2025-12-XX.json)
3. Restore to My Calcium temporarily
4. Debug migration script
5. Re-run migration with fixes
6. Verify integrity before re-deploying

**Scenario 3: Sync issues**

1. Disable auto-sync on both devices
2. Use local data only (offline mode)
3. Debug sync service
4. Create new sync pair when fixed

### Pre-Production Checklist

Before deploying to wife's device:

- [ ] Full backup of current My Calcium data
- [ ] Copy of backup file stored safely (cloud + local)
- [ ] Migration script tested with copy of backup
- [ ] Migrated backup validated (checksums, entry counts)
- [ ] My Nutrients tested with migrated data in dev environment
- [ ] Rollback plan reviewed and understood

---

## Progress Tracking

### How to Use This Document

1. **Before each work session**: Review current phase tasks
2. **During work**: Check off tasks as completed
3. **After each session**: Update status, note any blockers
4. **Phase completion**: Verify acceptance criteria before moving on

### Update Format

When updating this document:

```markdown
### Day X: Task Name

**Status**: ✅ Complete | 🚧 In Progress | ⏸️ Blocked | ❌ Skipped

**Actual time**: X hours/days (vs. estimated Y hours/days)

**Notes**:
- What went well
- What took longer than expected
- Any deviations from plan
- Blockers encountered and how resolved

**Commits**: abc1234, def5678
```

### Example Update

```markdown
### Day 3-4: Database Generation

**Status**: ✅ Complete

**Actual time**: 1.5 days (vs. estimated 2 days)

**Notes**:
- Data pipeline ran smoothly, no issues
- Found that some vitamins use IU instead of mcg, documented in NUTRIENT_MAPPING.md
- Database size came in at 2.1MB (within expected range)
- Spot-checked 20 foods, all nutrients accurate

**Commits**: a1b2c3d, e4f5g6h

**Next**: Moving to Day 5-7 (Schema & Migration)
```

---

## Success Metrics

### v1.0 Launch Goals

**Functionality**:
- [ ] All 20+ nutrients tracked correctly
- [ ] Settings allow selection of 3-4 displayed nutrients
- [ ] Stats and reports work for all nutrients
- [ ] Migration from My Calcium complete with zero data loss

**Performance**:
- [ ] App loads in <3 seconds
- [ ] Food search responds in <500ms
- [ ] No UI jank or freezing
- [ ] Offline mode fully functional

**Quality**:
- [ ] Zero critical bugs in production
- [ ] Sync reliability >99%
- [ ] Cross-browser compatibility confirmed
- [ ] Accessibility standards met (WCAG 2.1 AA)

**User Satisfaction** (wife's feedback):
- [ ] Migration process was smooth
- [ ] App is easy to use
- [ ] Can find and track desired nutrients
- [ ] No confusion or frustration

---

## Post-Launch

### Week 5+: Monitoring & Iteration

- Monitor for any issues in first week
- Collect user feedback
- Plan v1.1 features based on usage patterns
- Consider additional nutrients if requested
- Optimize based on real-world performance data

### Future Enhancements (v1.1+)

- Meal planning
- Recipe support
- Advanced analytics
- Photo logging with OCR
- Multi-language support
- Export to PDF
- Integration with health apps (Apple Health, Google Fit)

---

## Conclusion

This implementation plan provides a structured, phase-by-phase approach to transforming My Calcium into My Nutrients. The 6-phase structure allows for:

- **Incremental progress** with clear milestones
- **Testing at each phase** to catch issues early
- **Flexibility** to adjust timeline based on actual progress
- **Clear acceptance criteria** to know when to move forward
- **Documentation** of decisions and progress

**Estimated total time**: 3-4 weeks of focused work

**Risk level**: Low (building on proven architecture)

**Success probability**: High (clear plan, tested patterns, manageable scope)

Good luck! 🚀
