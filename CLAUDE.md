# My Nutrients PWA - Guide for Claude (AI Assistant)

**Version**: 1.2.0
**Last Updated**: January 17, 2026

---

## Purpose of This Document

This guide is specifically for Claude Code (AI assistant) to understand the project structure, development workflow, and key technical decisions when working on this codebase.

---

## Project Overview

**My Nutrients PWA** is a Progressive Web App for tracking multiple nutrients across daily food intake. Originally designed as "My Calcium Tracker" for single-nutrient tracking, it has been refactored to support 20+ nutrients including macronutrients, minerals, vitamins, and omega fatty acids.

**Tech Stack**:
- **Frontend**: SvelteKit (SSR + CSR)
- **Storage**: IndexedDB (client-side, offline-first)
- **Data Source**: USDA FoodData Central JSON files
- **Build**: Vite
- **Deployment**: Static site

---

## Documentation Structure

This project has comprehensive documentation in `_notes/`:

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System design, component relationships, data flow |
| `DATA_PIPELINE.md` | Food database generation from USDA JSON files |
| `DECISIONS.md` | Technical decisions and rationale |
| `IMPLEMENTATION_PLAN.md` | Phase-by-phase refactoring plan (Phase 1-4) |
| `MIGRATION_GUIDE.md` | Data migration strategy for multi-nutrient upgrade |
| `NUTRIENT_MAPPING.md` | USDA FDC nutrient codes → app nutrient IDs |
| `UI_SPECIFICATION.md` | Component specifications and user flows |
| `PHASE_1_COMPLETION.md` | Phase 1 completion notes |

**Always review relevant documentation before making changes.**

---

## Data Pipeline Workflow

### Pipeline Overview

The food database is generated through a multi-stage pipeline:

```
USDA JSON Files (1GB+ downloaded)
    ↓
json-parser.cjs → combined-nutrient-data.json (~200MB)
    ↓
master-key-assigner-json.cjs → mastered-nutrient-data.json (~200MB)
    ↓
food-curator-nutrients.cjs → curated-nutrients-abridged.json (~50MB)
    ↓
data-module-generator-nutrients.cjs → foodDatabaseData.js (~2-5MB)
    ↓
src/lib/data/foodDatabaseData.js (committed to git)
```

### Critical: File Management in Git

**Important for AI assistants to understand:**

1. **Large intermediate files exist locally but are NOT committed to git:**
   - `source_data/combined-nutrient-data.json` (~200MB)
   - `source_data/mastered-nutrient-data.json` (~200MB)
   - `source_data/curated-nutrients-abridged.json` (~50MB)
   - USDA JSON source files (1GB+ total)

2. **These files are intentionally left as untracked (not in .gitignore):**
   - They show up in `git status` as a reminder during refactoring work
   - This keeps them "top of mind" during development
   - Eventually, sample excerpts will be committed and full files added to .gitignore

3. **Only the final output is committed:**
   - `src/lib/data/foodDatabaseData.js` (~2-5MB minified)
   - `source_data/appid-mapping.json` (keymap for stable IDs)

4. **The developer HAS these files locally and can regenerate:**
   - Do NOT create utility scripts to "fix" the generated output
   - If data structure changes, regenerate using the pipeline scripts
   - Pipeline takes 5-10 minutes to run but produces correct output

### Running the Pipeline

When database structure changes are needed:

```bash
cd source_data

# Step 1: Assign stable appIds
node master-key-assigner-json.cjs combined-nutrient-data.json mastered-nutrient-data.json

# Step 2: Curate foods (filter, clean measures) with keep list
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt

# Step 3: Generate minified JS module
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal

# Verify output
ls -lh ../src/lib/data/foodDatabaseData.js
```

**Expected output**: 2-5MB minified JavaScript module with correct exports:
- `export const KEYS` - Key mappings for rehydration
- `export const MEASURE_KEYS` - Measure object key mappings
- `export const DB` - Minified food database array
- `export const __minified__` - Format flag (true)
- `export const DATABASE_METADATA` - Database metadata

See `_notes/DATA_PIPELINE.md` for complete pipeline documentation.

### Keep List Feature

**Purpose**: Preserve specific foods through the curation pipeline for user data continuity and legacy food support.

**How It Works**:
- Foods listed in `source_data/keep-list.txt` completely **bypass all 5 abridgement steps**:
  1. Cooking method collapse (raw/cooked preference)
  2. Meat cut simplification
  3. Industrial prep filtering (frozen/canned)
  4. Low-nutrient 100g-only filtering
  5. Category filtering (snacks/restaurant)

**Current Keep List**: 179 foods including:
- 6 original staples (milk, cheese, yogurt, almonds, spinach, bison)
- 173 legacy foods from original USDA calcium publication (86% coverage)

**Usage**:
```bash
# Add food names (exact USDA names) to keep-list.txt
echo "Squash, summer, zucchini, includes skin, cooked, boiled, drained" >> keep-list.txt

# Run pipeline with keep list
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients \
  --keep-list keep-list.txt
```

**Important Notes**:
- Food names must match exactly as they appear in USDA source data
- Normalization is applied, but exact names work best
- Keep-listed foods are preserved even if they would normally be filtered
- See `source_data/KEEP-LIST-GUIDE.md` for complete documentation

### "Without Salt" Preference

**Feature**: When collapsing nutritionally identical foods, the pipeline prefers unsalted variants.

**Behavior**:
- Chooses "without salt" over "with salt"
- Chooses "no salt added" over "salted"
- Chooses "unsalted" over "salted"

**Implementation**: `preferNoSalt()` function in `food-curator-nutrients.cjs` (lines 510-522)

**Result**: Salted variants are collapsed into unsalted versions and preserved in provenance data.

**Example**:
- Database contains: "Turnip greens, frozen, cooked, boiled, drained, without salt"
- Provenance shows: Also available as "...with salt" variant
- User searches for "turnip greens" → finds the "without salt" version

---

## Key Technical Patterns

### 1. Multi-Nutrient Data Structure

**Nutrient Values Interface** (`src/lib/types/nutrients.ts`):
```typescript
export interface NutrientValues {
  // Macronutrients (g)
  protein?: number;
  fiber?: number;
  carbohydrates?: number;
  sugars?: number;
  fat?: number;
  saturatedFat?: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;

  // Omega fatty acids (g)
  omega3?: number;
  omega3ALA?: number;
  omega3EPA?: number;
  omega3DHA?: number;
  omega6?: number;

  // Minerals (mg)
  calcium?: number;
  magnesium?: number;
  potassium?: number;
  iron?: number;
  zinc?: number;

  // Vitamins (varies)
  vitaminD?: number; // mcg
  vitaminB12?: number; // mcg
  folate?: number; // mcg DFE
  vitaminB6?: number; // mg
  vitaminA?: number; // mcg RAE
  vitaminC?: number; // mg
  vitaminK?: number; // mcg
}
```

### 2. Food Database Structure

**Database Foods** (`src/lib/types/nutrients.ts`):
```typescript
export interface USDAFood {
  id: number;
  name: string;
  measures: MeasureSet[];
}

export interface MeasureSet {
  measure: string;
  nutrients: NutrientValues;
}
```

**Example**:
```javascript
{
  id: 100,
  name: "Milk, whole, 3.25% milkfat",
  measures: [
    {
      measure: "1 cup (244g)",
      nutrients: {
        protein: 7.99,
        calcium: 276,
        vitaminD: 2.9,
        fiber: 0,
        // ... more nutrients
      }
    },
    {
      measure: "1 fl oz (30.5g)",
      nutrients: {
        protein: 1.00,
        calcium: 34.4,
        vitaminD: 0.36,
        // ... more nutrients
      }
    }
  ]
}
```

### 3. Backward Compatibility

**Always support legacy calcium-only format** when accessing database:

```javascript
// CORRECT - handles both formats
const calciumValue = measure.nutrients?.calcium ?? measure.calcium ?? 0;

// WRONG - fails on legacy data
const calciumValue = measure.nutrients.calcium;
```

### 4. Nutrient Settings

Users can select up to 4 nutrients to track and display. Settings stored in IndexedDB:

```typescript
export interface NutrientSettings {
  nutrientGoals: Record<string, number>; // e.g., { calcium: 1200, protein: 60 }
  displayedNutrients: string[]; // e.g., ['protein', 'calcium', 'fiber', 'vitaminD']
  theme?: 'auto' | 'light' | 'dark';
  colorScheme?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';
}
```

Default settings in `src/lib/config/nutrientDefaults.ts`:
- `DEFAULT_NUTRIENT_GOALS` - RDA/DV values for all nutrients
- `getDefaultDisplayedNutrients()` - Returns `['protein', 'calcium', 'fiber', 'vitaminD']`

---

## Component Guidelines

### SummaryCard.svelte

**Props**:
```svelte
export let currentDate;
export let totalNutrients = {}; // NutrientValues
export let nutrientGoals = {}; // Record<string, number>
export let displayedNutrients = []; // string[] - max 4
```

**Displays**: Grid of nutrient cards with progress bars (2x2 on desktop, stacked on mobile)

### FoodEntry.svelte

**Props**:
```svelte
export let food; // FoodEntry
export let index; // number
export let displayedNutrients = []; // string[]
```

**Displays**: Compact nutrient display: "17.0g Protein | 250mg Calcium | 3.5g Fiber"

### AddFoodModal.svelte

**Key Features**:
- Search database foods with nutrient preview
- Multi-nutrient input for custom foods
- Backward compatible with legacy calcium-only data
- Shows preview of nutrients based on selected serving size

**Critical**: Always load `displayedNutrients` from `nutrientService.getNutrientSettings()` in `onMount()`

---

## Testing Guidelines

### Manual Testing Checklist

1. **Search functionality**: Can find foods by name
2. **Nutrient preview**: Shows correct scaled nutrients per serving
3. **Custom food entry**: Can enter multiple nutrients
4. **Food journal**: Shows correct nutrient totals
5. **Progress display**: Shows accurate progress for each tracked nutrient
6. **Settings**: Can change tracked nutrients and goals

### Browser Console Validation

```javascript
// Check database format
import { getFoodDatabase } from '$lib/data/foodDatabase.js';
const db = await getFoodDatabase();
console.log('Database loaded:', db.length, 'foods');

// Verify food structure
const milk = db.find(f => f.name.toLowerCase().includes('milk'));
console.log('Milk measures:', milk.measures.length);
console.log('First measure nutrients:', milk.measures[0].nutrients);

// Check for expected nutrients
const expectedNutrients = ['protein', 'calcium', 'vitaminD', 'fiber'];
const hasAll = expectedNutrients.every(n => n in milk.measures[0].nutrients);
console.log('Has all nutrients:', hasAll);
```

---

## Common Issues and Solutions

### Issue: "Unknown food database format"

**Cause**: foodDatabaseData.js has incorrect export names

**Solution**: Regenerate using data-module-generator-nutrients.cjs (do NOT create utility patches)

### Issue: Search returns no results

**Cause**: Database not loaded or nutrient access pattern wrong

**Debug**:
1. Check browser console for errors
2. Verify `foodDatabaseData.js` exports: `KEYS`, `MEASURE_KEYS`, `DB`, `__minified__`, `DATABASE_METADATA`
3. Check measure access uses `measure.nutrients?.calcium` not `measure.calcium`

### Issue: Nutrient values missing in UI

**Cause**: Not passing `displayedNutrients` prop to components

**Fix**: Ensure `+page.svelte` loads settings in `onMount()` and passes to child components

---

## Git Workflow

### What to Commit

✅ **Always commit**:
- Source code changes (`src/`, `static/`, etc.)
- Final database module: `src/lib/data/foodDatabaseData.js`
- KeyMap: `source_data/appid-mapping.json`
- Pipeline scripts: `source_data/*.cjs`
- Documentation: `_notes/*.md`, `README.md`, `CLAUDE.md`

❌ **Never commit** (not in .gitignore yet, but will be):
- `source_data/combined-nutrient-data.json`
- `source_data/mastered-nutrient-data.json`
- `source_data/curated-nutrients-abridged.json`
- USDA source JSON files
- `node_modules/`
- `.svelte-kit/`

### Commit Message Style

Follow conventional commits:
```
feat: Add multi-nutrient display to SummaryCard
fix: Handle nutrients structure in AddFoodModal search
docs: Update DATA_PIPELINE.md with JSON parser steps
refactor: Extract nutrient formatting to helper function
```

---

## Current Implementation Status

**Completed Phases**:
- ✅ Phase 1: Backend Services (data pipeline, types, services)
- ✅ Phase 2: Service Integration (IndexedDB, calculations, settings)
- ✅ Phase 3: UI Updates (components, nutrient display, modals)
- ✅ Phase 4: Settings UI (nutrient selection, goals, import/export)

**Migration to Multi-Nutrient Format**:
- ✅ Data pipeline enhancements (keep list, salt preference)
- ✅ Legacy food restoration (298/346 foods, 86% coverage)
- ✅ Migration scripts tested and documented
- ✅ 8 migration fixes applied (serving bugs, nutrient scaling, etc.)
- ✅ Backward compatibility maintained

**Recent Enhancements**:
- ✅ Journal entry food IDs (`appId` for database foods, `customFoodId` for custom foods)
- ✅ Database browser page with food details and provenance
- ✅ Multi-document cloud sync (partitioned by month for efficiency)

**Migration Documentation**:
- `migration/MIGRATION-CORRECTED-2025-12-18.md` - Complete migration log with all fixes
- `migration/MY-NUTRIENTS-MIGRATION-PLAN.md` - Original migration plan
- `FINAL-PRE-MERGE-CHECKLIST.md` - Pre-merge checklist and production migration guide

See `_notes/IMPLEMENTATION_PLAN.md` for detailed phase breakdown.

---

## Food ID System

Journal entries now track food references using stable IDs:

```typescript
interface FoodEntry {
  name: string;
  nutrients: NutrientValues;
  servingQuantity: number;
  servingUnit: string;
  timestamp: string;
  isCustom?: boolean;
  appId?: number;        // For database foods (positive integers)
  customFoodId?: number; // For custom foods (negative integers: -1, -2, -3...)
}
```

**ID Conventions**:
- **Database foods**: Use `appId` with positive integers from the curated database
- **Custom foods**: Use `customFoodId` with negative integers (-1, -2, -3...)
- **Logical deletion**: Custom foods are marked `isDeleted: true` rather than removed (preserves referential integrity)

**Looking up foods**:
```typescript
// In NutrientService
findFoodById(foodId: number, customFoods: CustomFood[]): any | null {
  if (foodId < 0) {
    return customFoods.find(f => f.id === foodId) || null;
  } else {
    return this.foodDatabase.find(f => f.id === foodId) || null;
  }
}
```

---

## Key Files Reference

### Core Application
- `src/routes/+page.svelte` - Main page with food journal
- `src/lib/stores/nutrients.ts` - Global state management (Svelte stores)
- `src/lib/services/NutrientService.ts` - Business logic layer (IndexedDB, CRUD operations)
- `src/lib/services/SyncService.ts` - Cross-device sync with encryption
- `src/lib/data/foodDatabase.js` - Database loader/rehydrator

### Components
- `src/lib/components/SummaryCard.svelte` - Daily progress summary
- `src/lib/components/FoodEntry.svelte` - Individual food display
- `src/lib/components/AddFoodModal.svelte` - Add/edit food modal
- `src/lib/components/NutrientSettingsModal.svelte` - Nutrient goals and display settings
- `src/lib/components/SyncSettingsModal.svelte` - Cloud sync configuration

### Configuration
- `src/lib/config/nutrientDefaults.ts` - Nutrient metadata, defaults, helpers
- `src/lib/types/nutrients.ts` - TypeScript interfaces for foods and entries
- `src/lib/types/sync.ts` - TypeScript interfaces for sync functionality

### Data Pipeline
- `source_data/json-parser.cjs` - Parse USDA JSON files
- `source_data/master-key-assigner-json.cjs` - Assign stable appIds
- `source_data/food-curator-nutrients.cjs` - Filter and clean foods
- `source_data/data-module-generator-nutrients.cjs` - Generate final JS module

---

## Development Commands

```bash
# Install dependencies
npm install

# Run dev server (with HMR)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Regenerate food database
cd source_data
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal
```

---

## Additional Resources

- **USDA FDC**: https://fdc.nal.usda.gov/
- **SvelteKit Docs**: https://kit.svelte.dev/docs
- **IndexedDB API**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

## Notes for AI Assistants

1. **Always read documentation first** before making changes
2. **Respect existing patterns** - don't introduce new patterns without discussion
3. **Test thoroughly** - especially search, nutrient calculations, and data migration
4. **Keep backward compatibility** - support legacy calcium-only format
5. **Don't create workarounds** - if data structure needs changing, regenerate using pipeline
6. **Ask when uncertain** - the developer prefers questions over assumptions

---

**Last Updated**: January 17, 2026
**Maintained By**: Nathan A. Eaton Jr.
