# My Nutrients - System Architecture

**Version**: 1.0.0
**Date**: December 2025
**Status**: Design Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture (My Calcium)](#current-architecture-my-calcium)
3. [Proposed Architecture (My Nutrients)](#proposed-architecture-my-nutrients)
4. [Data Layer](#data-layer)
5. [Service Layer](#service-layer)
6. [UI Layer](#ui-layer)
7. [External Services](#external-services)
8. [Data Flow](#data-flow)
9. [Security & Privacy](#security--privacy)

---

## Overview

**My Nutrients** is a Progressive Web App (PWA) that helps seniors track essential nutrients for better health. It builds upon the proven foundation of **My Calcium**, expanding from single-nutrient tracking to comprehensive multi-nutrient monitoring.

### Design Principles

1. **Local-First**: All data stored locally; works offline
2. **Privacy-Focused**: No third-party tracking or analytics
3. **Simple UX**: Optimized for seniors; progressive disclosure of complexity
4. **Data Ownership**: Complete backup/restore/export capabilities
5. **Optional Sync**: Encrypted cross-device synchronization

### Target Nutrients (20+)

**Macronutrients**: Protein, Fiber, Carbohydrates, Sugars, Fat (total, saturated, monounsaturated, polyunsaturated), Omega-3, Omega-6

**Minerals**: Calcium, Magnesium, Potassium, Iron, Zinc

**Vitamins**: Vitamin D, Vitamin B12, Folate, Vitamin B6, Vitamin A, Vitamin C, Vitamin K

---

## Current Architecture (My Calcium)

### Tech Stack

- **Frontend**: SvelteKit 2.37.0 + Svelte 4.2.19
- **Build Tool**: Vite 5.2.11
- **Language**: TypeScript with JSDoc
- **PWA**: vite-plugin-pwa 0.20.0
- **Storage**: IndexedDB (primary), localStorage (settings)
- **Sync Backend**: Cloudflare Workers + KV Store
- **Encryption**: Web Crypto API (AES-GCM)

### Storage Schema (Current)

**IndexedDB Database**: `CalciumTracker` (version 7)

**Object Stores**:
- `customFoods` - User-created foods
- `journalEntries` - Daily food logs
- `favorites` - Favorited food IDs
- `hiddenFoods` - Hidden food IDs
- `servingPreferences` - Preferred serving sizes per food

**localStorage Keys**:
- `calcium_goal` - Daily calcium target
- `calcium_theme` - UI theme preference
- `calcium_sort_settings` - Sort preferences
- `calcium_sync_settings` - Sync configuration

### Current Data Models

```typescript
interface FoodEntry {
  name: string;
  calcium: number;              // Single nutrient only
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
    calcium: number;            // Single nutrient only
  }>;
}

interface JournalEntry {
  date: string;                 // YYYY-MM-DD
  foods: FoodEntry[];
  lastModified: number;
  syncStatus: string;
  totalCalcium: number;         // Single total only
}
```

### Key Services

- **CalciumService**: Business logic for food/journal management
- **SearchService**: Food search with scoring algorithm
- **SyncService**: End-to-end encrypted cloud sync
- **UnitConverter**: Serving size conversions
- **FDCService**: USDA barcode lookup
- **HouseholdMeasureService**: Measure parsing/conversion

---

## Proposed Architecture (My Nutrients)

### New Database Schema

**IndexedDB Database**: `NutrientTracker` (version 1)

**Object Stores**: Same structure, updated data models

### Enhanced Data Models

```typescript
interface NutrientValues {
  // Macronutrients (grams)
  protein?: number;
  fiber?: number;
  carbohydrates?: number;
  sugars?: number;
  fat?: number;
  saturatedFat?: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;
  omega3?: number;
  omega6?: number;

  // Minerals (milligrams)
  calcium?: number;
  magnesium?: number;
  potassium?: number;
  iron?: number;
  zinc?: number;

  // Vitamins (varies)
  vitaminD?: number;         // mcg (or IU)
  vitaminB12?: number;       // mcg
  folate?: number;           // mcg DFE
  vitaminB6?: number;        // mg
  vitaminA?: number;         // mcg RAE (or IU)
  vitaminC?: number;         // mg
  vitaminK?: number;         // mcg
}

interface FoodEntry {
  name: string;
  nutrients: NutrientValues;     // Multi-nutrient support
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
    nutrients: NutrientValues;   // Multi-nutrient per serving
  }>;
}

interface JournalEntry {
  date: string;
  foods: FoodEntry[];
  lastModified: number;
  syncStatus: string;
  totalNutrients: NutrientValues; // Multi-nutrient totals
}

interface NutrientSettings {
  nutrientGoals: Record<string, number>;    // { calcium: 1500, protein: 60, ... }
  displayedNutrients: string[];             // Max 4 for UI display
  theme: string;
  colorScheme: string;
}
```

### Storage Impact Analysis

**Current Storage Usage**:
- Food database: ~400KB (3,876 foods, calcium only)
- Journal entry: ~150 bytes per food
- 365 days typical: ~55KB

**Projected Storage Usage**:
- Food database: ~2-3MB (3,800+ foods, 20+ nutrients)
- Journal entry: ~450 bytes per food (3x increase)
- 365 days typical: ~165KB
- **Total app size**: ~3-4MB (well within PWA best practices)

---

## Data Layer

### IndexedDB Architecture

**Database Name**: `NutrientTracker`
**Version**: 1 (new identity from CalciumTracker v7)

**Object Store Details**:

#### `customFoods`
- **Key Path**: `id` (negative integers, e.g., -1, -2, -3)
- **Indexes**: `name`, `dateAdded`
- **Purpose**: User-created custom foods with full nutrient data

```typescript
interface CustomFood {
  id: number;                    // Negative ID
  name: string;
  nutrients: NutrientValues;     // All nutrients user entered
  measure: string;
  dateAdded: string;
  isCustom: true;
  sourceMetadata?: {             // Optional scan source info
    sourceType: 'manual' | 'upc_scan' | 'ocr_scan';
    upc?: string;
    scanData?: any;
  };
}
```

#### `journalEntries`
- **Key Path**: `date` (YYYY-MM-DD string)
- **Indexes**: `lastModified`, `syncStatus`
- **Purpose**: Daily food logs with multi-nutrient totals

```typescript
interface JournalEntry {
  date: string;                  // Primary key
  foods: FoodEntry[];
  lastModified: number;
  syncStatus: 'pending' | 'synced';
  totalNutrients: NutrientValues;  // Pre-calculated daily totals
}
```

#### `favorites`
- **Key Path**: `foodId`
- **Purpose**: Quick access to frequently used foods

#### `hiddenFoods`
- **Key Path**: `foodId`
- **Purpose**: Foods hidden from search results

#### `servingPreferences`
- **Key Path**: `foodId`
- **Purpose**: Remember user's preferred serving size per food

```typescript
interface UserServingPreference {
  foodId: number;
  preferredQuantity: number;
  preferredUnit: string;
  lastUsed: string;
  preferredMeasureIndex?: number;
}
```

#### `migrations`
- **Key Path**: `name`
- **Purpose**: Track completed data migrations

### localStorage Architecture

**Prefix**: `nutrient_` (new prefix for My Nutrients)

**Keys**:
- `nutrient_goals` - JSON of nutrient goals
- `nutrient_displayed` - JSON array of displayed nutrients (max 4)
- `nutrient_theme` - Theme preference
- `nutrient_sync_settings` - Sync configuration (encrypted key)

---

## Service Layer

### Core Services

#### NutrientService (renamed from CalciumService)

**Responsibilities**:
- Journal management (add/edit/delete food entries)
- Multi-nutrient aggregation
- Settings management
- Backup/restore operations

**Key Methods**:
```typescript
class NutrientService {
  // Food operations
  addFood(food: FoodEntry): Promise<void>
  updateFood(index: number, food: FoodEntry): Promise<void>
  removeFood(index: number): Promise<void>

  // Date navigation
  changeDate(newDate: string): Promise<void>
  loadFoodsForDate(date: string): Promise<FoodEntry[]>
  saveFoodsForDate(date: string, foods: FoodEntry[]): Promise<void>

  // Multi-nutrient aggregation
  calculateTotalNutrients(foods: FoodEntry[]): NutrientValues

  // Settings
  getSettings(): Promise<NutrientSettings>
  updateSettings(settings: Partial<NutrientSettings>): Promise<void>

  // Backup/Restore
  generateBackup(): Promise<BackupData>
  restoreFromBackup(backup: BackupData): Promise<void>
}
```

**Changes from CalciumService**:
- Single `calcium` values → `NutrientValues` objects
- `totalCalcium` → `totalNutrients`
- Goal management: single goal → map of nutrient goals
- Aggregation: sum calcium → sum all nutrients

#### SearchService

**No changes needed** - Already nutrient-agnostic

**Current scoring algorithm**:
- Keyword matching on food names
- Bonus points for favorites, custom foods
- Calcium content bonus → **Remove or make nutrient-agnostic**

**Responsibilities**:
- Fuzzy search across food database + custom foods
- Scoring and ranking
- Filter by favorites, hidden foods

#### SyncService

**Minimal changes** - Architecture is data-agnostic

**Responsibilities**:
- End-to-end encryption (AES-GCM)
- Multi-document sync (metadata, persistent, monthly journals)
- Conflict resolution
- Auto-sync scheduling

**Changes needed**:
- Backup format version bump (2.1.0 → 3.0.0)
- No changes to encryption/sync logic

#### UnitConverter

**No changes needed** - Already nutrient-agnostic

**Responsibilities**:
- Convert between volume/weight units (cups, oz, g, ml)
- Validate unit compatibility
- Suggest unit conversions

#### FDCService (USDA Barcode Lookup)

**Significant changes needed** - Extract all nutrients

**Current**: Extracts only calcium from API response
**New**: Extract all 20+ target nutrients

**Changes**:
```typescript
// Current (line 271)
const calciumNutrient = product.foodNutrients.find(
  nutrient => nutrientNumber === "301"
);

// New approach
const NUTRIENT_MAP = {
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
  // ... etc
};

function extractNutrients(product: FDCProduct): NutrientValues {
  const nutrients: NutrientValues = {};
  for (const [nutrientId, key] of Object.entries(NUTRIENT_MAP)) {
    const nutrient = product.foodNutrients.find(
      n => n.nutrientNumber === nutrientId
    );
    if (nutrient?.value) {
      nutrients[key] = nutrient.value;
    }
  }
  return nutrients;
}
```

---

## UI Layer

### Component Architecture

#### Existing Components (Require Updates)

**SummaryCard.svelte**
- **Current**: Shows daily calcium total vs. goal
- **New**: Shows 3-4 selected nutrients with progress bars
- **Layout**: Horizontal scroll or stacked rows

**FoodEntry.svelte**
- **Current**: Shows calcium value for food
- **New**: Shows 3-4 selected nutrients in compact format
- **Example**: `170 cal | 17g protein | 250mg calcium | 0g fiber`

**AddFoodModal.svelte**
- **Current**: Shows calcium when selecting food
- **New**: Shows 3-4 selected nutrients
- **Complexity**: Medium (more data to display)

**Stats (+page.svelte)**
- **Current**: Charts for calcium over time
- **New**: Nutrient selector dropdown, charts for selected nutrient
- **Complexity**: High (parameterize all aggregation logic)

**Report (+page.svelte)**
- **Current**: Printable calcium report
- **New**: Select nutrient, generate report for that nutrient
- **Complexity**: Medium

#### New Components

**NutrientSelector.svelte**
- **Purpose**: Dropdown/picker for choosing which nutrient to view
- **Features**:
  - Star indicator for displayed nutrients
  - Separator between displayed and other nutrients
  - Horizontal swipe support for mobile

**NutrientCard.svelte**
- **Purpose**: Show progress for a single nutrient
- **Content**:
  - Daily total / goal
  - Progress bar/ring
  - 7-day trend sparkline (optional)

**NutrientSettingsModal.svelte**
- **Purpose**: Configure nutrient goals and display preferences
- **Features**:
  - Checkbox list (max 4 selected)
  - Goal input per nutrient
  - Unit display (mg, g, mcg, IU)
  - Validation (reasonable ranges)

**Nutrients (+page.svelte)** - NEW ROUTE
- **Purpose**: Dedicated page for nutrient-by-nutrient analysis
- **Layout**:
  - Top: Nutrient selector with swipe navigation
  - Main: Selected nutrient's daily total, goal progress, trend
  - Bottom: Top contributing foods for that nutrient
- **Navigation**: Swipe left/right to change nutrients

### Route Structure

```
/routes
  ├── +page.svelte                 # Main tracking page (food journal)
  ├── /nutrients
  │   └── +page.svelte             # NEW: Nutrient-by-nutrient view
  ├── /stats
  │   └── +page.svelte             # Statistics with nutrient selector
  ├── /report
  │   └── +page.svelte             # Reports with nutrient selector
  ├── /settings
  │   └── +page.svelte             # Settings (includes NutrientSettingsModal)
  ├── /data
  │   └── +page.svelte             # Data management (backup/restore/export)
  └── /guide
      └── +page.svelte             # Help/guide
```

### Navigation Bar

**Current**: Tracking | Stats | Report | Settings

**New**: Tracking | **Nutrients** | Stats | Report | Settings

---

## External Services

### USDA FoodData Central (FDC)

**Two integration points**:

1. **CSV Download** (Primary data source)
   - **Endpoint**: https://fdc.nal.usda.gov/download-datasets/
   - **Files**: Foundation Foods + SR Legacy Foods
   - **Format**: CSV with all nutrients per food/serving
   - **Update Frequency**: Biannual (April/October)
   - **Usage**: Offline food database generation

2. **API** (Barcode lookup only)
   - **Endpoint**: `https://api.nal.usda.gov/fdc/v1/foods/search`
   - **Authentication**: API key (DEMO_KEY or custom)
   - **Rate Limits**: DEMO_KEY heavily throttled
   - **Usage**: Smart Scan UPC lookups
   - **Response**: All nutrients per 100g + serving info

### OpenFoodFacts (Fallback)

**Purpose**: Secondary source for barcode lookups when FDC fails

**Endpoint**: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`

**No authentication required**

### OCR Service (Optional)

**Purpose**: Extract nutrients from nutrition label photos

**Endpoint**: OCR.space API (or similar)

**Requires**: `VITE_OCR_API_KEY`

---

## Data Flow

### Food Addition Flow

```
User scans barcode OR searches database
         ↓
    FDCService / SearchService
         ↓
    Extract all nutrients (NutrientValues)
         ↓
    AddFoodModal displays selected nutrients (3-4)
         ↓
    User confirms quantity/serving
         ↓
    NutrientService.addFood(foodEntry)
         ↓
    Save to IndexedDB journalEntries
         ↓
    Calculate totalNutrients for day
         ↓
    Update UI (SummaryCard, FoodEntry cards)
         ↓
    Trigger sync (if enabled)
```

### Nutrient View Flow

```
User navigates to Nutrients page
         ↓
    Load journal data for current day
         ↓
    User selects nutrient from dropdown (or swipes)
         ↓
    Calculate daily total for that nutrient
         ↓
    Display progress vs. goal
         ↓
    Load 7-day history for trend
         ↓
    List top contributing foods
```

### Settings Update Flow

```
User opens Nutrient Settings
         ↓
    Load current settings (goals, displayed nutrients)
         ↓
    User checks/unchecks nutrients (max 4)
         ↓
    User updates goals
         ↓
    NutrientService.updateSettings()
         ↓
    Save to localStorage + IndexedDB
         ↓
    Trigger sync
         ↓
    Update UI to show new displayed nutrients
```

---

## Security & Privacy

### Data Encryption (Sync)

**Algorithm**: AES-GCM (256-bit)
**Key Derivation**: Web Crypto API
**Encryption Scope**: Entire backup blob before upload

**Flow**:
```
Local data → JSON.stringify → encrypt(AES-GCM) → Base64 → Upload to Cloudflare KV
Download → Base64 decode → decrypt(AES-GCM) → JSON.parse → Local storage
```

**Key Management**:
- Encryption key never leaves device
- Stored in localStorage (sync_settings)
- User can regenerate key (creates new sync doc)

### Privacy Guarantees

1. **No Third-Party Tracking**: Zero analytics, ads, or external trackers
2. **Local-First**: All data stored on device, works offline
3. **Optional Sync**: User chooses whether to enable
4. **End-to-End Encrypted**: Server cannot read data
5. **Open Source**: GPL v3, full code review available

### API Key Handling

**USDA FDC API Key**:
- Stored in environment variable: `VITE_FDC_API_KEY`
- Never exposed to client (bundled during build)
- Falls back to DEMO_KEY if not configured

**Sync Keys**:
- Generated on device
- Never transmitted in clear text
- User-controlled (can reset/regenerate)

---

## Performance Considerations

### Bundle Size Optimization

**Food Database**:
- Minified format with key compression
- Rehydration at runtime
- Lazy loading (future enhancement)

**Code Splitting**:
- Stats page: Lazy load charts
- Report page: Lazy load on demand
- Settings: Load modals on demand

### IndexedDB Performance

**Indexing Strategy**:
- Primary keys on frequently queried fields (`date`, `foodId`)
- Composite indexes avoided (minimal benefit, high cost)
- Index on `lastModified` for sync queries

**Query Optimization**:
- Pre-calculate daily totals (avoid re-aggregation)
- Batch writes (transaction per day, not per food)
- Use cursors for large date ranges

### Rendering Optimization

**Svelte Reactivity**:
- Derived stores for computed values (auto-memoization)
- Avoid nested reactivity (flatten where possible)
- Use `{#key}` blocks for efficient re-renders

**Virtualization** (future):
- Food list: Render visible items only
- Stats charts: Downsample for large datasets

---

## Migration Path

### From My Calcium to My Nutrients

**Database Migration**:
- Old: `CalciumTracker` v7
- New: `NutrientTracker` v1
- Strategy: Create new database, migrate data, delete old

**Data Transformation**:
```typescript
// Old format
{ calcium: 250 }

// New format
{ nutrients: { calcium: 250 } }
```

**User Experience**:
- Offline migration via backup file
- No data loss (calcium values preserved)
- New sync pairing required

See `_notes/MIGRATION_GUIDE.md` for detailed steps.

---

## Future Enhancements

### Phase 2+ Features

1. **Meal Planning**: Pre-plan meals, copy to journal
2. **Recipe Support**: Create recipes with nutrient totals
3. **Smart Suggestions**: AI-powered food recommendations to meet goals
4. **Photo Logging**: Take photos of meals with OCR
5. **Advanced Analytics**: Nutrient correlations, trends over time
6. **Multi-Language**: i18n support for global users
7. **Accessibility**: Enhanced screen reader support, high contrast modes

### Scalability

**Current capacity**:
- ~4,000 foods in database
- ~365 days of journal data
- ~50 custom foods per user

**Growth path**:
- Database: Can handle 10,000+ foods with lazy loading
- Journal: IndexedDB supports years of data (multi-GB)
- Sync: Cloudflare KV limits are generous (1GB per namespace)

---

## Conclusion

The My Nutrients architecture builds on the proven, battle-tested foundation of My Calcium while extending it to support comprehensive multi-nutrient tracking. The modular design, clear separation of concerns, and local-first philosophy make this transition straightforward and low-risk.

**Key Strengths**:
- ✅ Minimal changes to sync/backup/restore infrastructure
- ✅ Search and unit conversion are already nutrient-agnostic
- ✅ Well-structured services layer makes refactoring mechanical
- ✅ IndexedDB schema naturally extends to multi-nutrient support
- ✅ Component architecture supports parameterization

**Key Risks**:
- ⚠️ Bundle size increase (mitigated by minification)
- ⚠️ UI complexity increase (mitigated by progressive disclosure)
- ⚠️ Migration complexity (mitigated by offline backup approach)

**Overall Assessment**: **HIGHLY FEASIBLE** with 3-4 weeks of focused development.
