# My Nutrients - System Architecture

**Version**: 1.0.0
**Date**: December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Layer](#data-layer)
4. [Service Layer](#service-layer)
5. [UI Layer](#ui-layer)
6. [External Services](#external-services)
7. [Data Flow](#data-flow)
8. [Security & Privacy](#security--privacy)
9. [Performance Considerations](#performance-considerations)

---

## Overview

**My Nutrients** is a Progressive Web App (PWA) that helps users track essential nutrients for better health, supporting 20+ nutrients including macronutrients, minerals, vitamins, and omega fatty acids.

### Design Principles

1. **Local-First**: All data stored locally; works offline
2. **Privacy-Focused**: No third-party tracking or analytics
3. **Simple UX**: Progressive disclosure of complexity
4. **Data Ownership**: Complete backup/restore/export capabilities
5. **Optional Sync**: Encrypted cross-device synchronization

### Tracked Nutrients

**Macronutrients**: Protein, Fiber, Carbohydrates, Sugars, Fat (total, saturated, monounsaturated, polyunsaturated), Omega-3, Omega-6

**Minerals**: Calcium, Magnesium, Potassium, Iron, Zinc

**Vitamins**: Vitamin D, Vitamin B12, Folate, Vitamin B6, Vitamin A, Vitamin C, Vitamin K

---

## Architecture

### Tech Stack

- **Frontend**: SvelteKit 2.x + Svelte 4.x
- **Build Tool**: Vite 5.x
- **Storage**: IndexedDB (local-first, offline-capable)
- **Styling**: CSS custom properties + scoped component styles
- **Deployment**: Static site (Vercel)
- **Sync** (Optional): Cloudflare Workers + KV storage

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      UI Layer                            │
│  (SvelteKit Routes + Svelte Components)                 │
│  - Tracking Page (/)                                    │
│  - Stats Page (/stats)                                  │
│  - Reports Page (/reports)                              │
│  - Database Page (/database)                            │
│  - Settings Modal                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│  (Business Logic & State Management)                    │
│  - NutrientService (IndexedDB operations)               │
│  - Svelte Stores (reactive state)                       │
│  - Calculation utilities                                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  - IndexedDB: NutrientTracker (v1)                      │
│    - journalEntries (food logs)                         │
│    - customFoods (user-created foods)                   │
│    - settings (nutrient goals + preferences)            │
│  - Static Food Database (~2-5MB)                        │
│    - 3,500+ USDA foods with nutrients                   │
│  - Provenance Data (optional, chunked JSON)             │
└─────────────────────────────────────────────────────────┘
```

### Data Models

```typescript
interface NutrientValues {
  // Macronutrients (grams)
  protein?: number;
  fiber?: number;
  carbohydrates?: number;
  sugars?: number;
  fat?: number;
  saturated

Fat?: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;
  omega3?: number;
  omega3ALA?: number;
  omega3EPA?: number;
  omega3DHA?: number;
  omega6?: number;

  // Minerals (milligrams)
  calcium?: number;
  magnesium?: number;
  potassium?: number;
  iron?: number;
  zinc?: number;

  // Vitamins (varies)
  vitaminD?: number;         // mcg
  vitaminB12?: number;       // mcg
  folate?: number;           // mcg DFE
  vitaminB6?: number;        // mg
  vitaminA?: number;         // mcg RAE
  vitaminC?: number;         // mg
  vitaminK?: number;         // mcg
}

interface FoodEntry {
  name: string;
  nutrients: NutrientValues;
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
  measures: Array<{
    measure: string;
    nutrients: NutrientValues;
  }>;
}

interface JournalEntry {
  date: string;              // YYYY-MM-DD
  foods: FoodEntry[];
  lastModified: number;
  syncStatus: string;
  totalNutrients: NutrientValues;
}

interface NutrientSettings {
  nutrientGoals: Record<string, number>;     // { protein: 60, calcium: 1200, ... }
  displayedNutrients: string[];              // Max 4 for UI display
  theme: 'auto' | 'light' | 'dark';
  colorScheme: string;
}
```

### Storage Analysis

- Food database: ~2-5MB (3,500+ foods, 20+ nutrients per food)
- Journal entry: ~450 bytes per food
- 365 days typical: ~165KB
- **Total app size**: ~3-6MB (within PWA best practices)

---

## Data Layer

### IndexedDB Architecture

**Database**: `NutrientTracker` (version 1)

**Object Stores**:

1. **`journalEntries`**
   - Key: `date` (string, YYYY-MM-DD format)
   - Stores daily food logs with nutrient totals
   - Indexed by date for efficient range queries

2. **`customFoods`**
   - Key: Auto-increment integer
   - User-created food items with custom nutrient values
   - Allows editing and deletion

3. **`settings`**
   - Key: Setting name (string)
   - Stores nutrient goals, display preferences, theme

**Indexes**:
- `journalEntries`: By date (primary key)
- `journalEntries`: By syncStatus (for sync operations)

### Food Database

The static food database is a minified JavaScript module (`foodDatabaseData.js`) containing:
- 3,500+ USDA-sourced foods
- Multiple serving sizes per food
- 20+ nutrients per serving
- Compressed keys for size optimization

**Format**:
```javascript
{
  i: 100,  // id
  n: "Milk, whole",  // name
  ms: [{  // measures
    s: "1 cup (244g)",  // serving
    n: { p: 7.99, ca: 276, vd: 2.9, ... }  // nutrients
  }]
}
```

**Loading**: Database loaded asynchronously on app start, rehydrated from minified format.

### Provenance Data

Optional chunked JSON files (`provenance_0.json` - `provenance_19.json`) provide source information:
- Which USDA foods were collapsed into each app food
- FDC IDs for reference
- Loaded on-demand when viewing food details

---

## Service Layer

### NutrientService

**Purpose**: Centralized business logic for all nutrient and journal operations

**Responsibilities**:
- IndexedDB CRUD operations
- Nutrient total calculations
- Settings management
- Backup/restore operations
- Data validation

**Key Methods**:
```typescript
class NutrientService {
  // Journal operations
  async addFoodEntry(date: string, food: FoodEntry): Promise<void>
  async deleteFoodEntry(date: string, index: number): Promise<void>
  async getJournalEntry(date: string): Promise<JournalEntry | null>
  async getDayTotals(date: string): Promise<NutrientValues>

  // Custom foods
  async addCustomFood(food: CustomFood): Promise<number>
  async updateCustomFood(id: number, food: CustomFood): Promise<void>
  async deleteCustomFood(id: number): Promise<void>

  // Settings
  async getNutrientSettings(): Promise<NutrientSettings>
  async updateNutrientSettings(settings: Partial<NutrientSettings>): Promise<void>

  // Backup/Restore
  async exportBackup(): Promise<BackupData>
  async importBackup(backup: BackupData): Promise<void>
}
```

### Svelte Stores

**Purpose**: Reactive state management

**Main Store** (`nutrients.ts`):
```javascript
export const nutrients = writable<NutrientState>({
  foods: [],
  totalNutrients: {},
  displayedNutrients: [],
  nutrientGoals: {},
  currentDate: getTodayString()
});
```

**Derived Stores**:
- Progress percentages
- Formatted nutrient displays
- Date navigation state

---

## UI Layer

### Component Architecture

**Pages** (SvelteKit routes):
- `+page.svelte` - Tracking page (main food journal)
- `stats/+page.svelte` - Statistics with charts
- `reports/+page.svelte` - Printable reports
- `database/+page.svelte` - Food database browser
- `database/[id]/+page.svelte` - Food detail page

**Key Components**:

1. **SummaryCard.svelte**
   - Displays daily progress for up to 4 nutrients
   - Progress bars with percentage completion
   - Swipe navigation for date changing

2. **FoodEntry.svelte**
   - Individual food item display
   - Shows selected nutrients inline
   - Edit/delete actions

3. **AddFoodModal.svelte**
   - Search USDA database or add custom foods
   - Multi-nutrient input for custom foods
   - Serving size calculator with live preview

4. **SettingsModal.svelte**
   - Nutrient selection (max 4 displayed)
   - Goal setting per nutrient
   - Theme and preferences

5. **Chart Components**
   - Daily, weekly, monthly, yearly views
   - Nutrient selector
   - Goal line overlay

### Responsive Design

- **Mobile-first**: Optimized for phone screens
- **Breakpoints**:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Touch-optimized**: Swipe gestures, large tap targets

---

## External Services

### Optional: Barcode Scanning

**Providers**:
1. **USDA FoodData Central** (via FDC ID from barcode)
2. **OpenFoodFacts API** (community database)

**Flow**:
```
User scans barcode
     ↓
Query USDA FDC API
     ↓
If found → Add to journal
If not found → Query OpenFoodFacts
     ↓
Convert to app format → Add to journal
```

### Optional: Cross-Device Sync

**Provider**: Cloudflare Workers + KV storage

**Architecture**:
- End-to-end encryption (AES-256-GCM)
- Device pairing via 6-digit code
- Conflict resolution: last-write-wins per date

**Endpoints**:
- `POST /pair` - Initiate device pairing
- `GET /sync/:deviceId` - Retrieve updates
- `POST /sync/:deviceId` - Push updates

---

## Data Flow

### Adding a Food Entry

```
User selects food + serving
         ↓
Calculate nutrients for serving size
         ↓
Create FoodEntry object
         ↓
NutrientService.addFoodEntry()
         ↓
Load existing journal entry for date
         ↓
Append food to entry.foods[]
         ↓
Recalculate totalNutrients
         ↓
Save to IndexedDB
         ↓
Update Svelte store
         ↓
UI updates (reactive)
```

### Loading a Day's Journal

```
User navigates to date
         ↓
NutrientService.getJournalEntry(date)
         ↓
Query IndexedDB by date key
         ↓
Return JournalEntry or null
         ↓
Update Svelte store
         ↓
SummaryCard + FoodEntry components re-render
```

### Searching Foods

```
User types search query
         ↓
Filter food database (client-side)
         ↓
Apply nutrient filters if selected
         ↓
Sort by relevance/nutrients
         ↓
Display results with nutrient preview
```

---

## Security & Privacy

### Data Privacy

- **No server-side storage** (except optional sync)
- **No third-party analytics or tracking**
- **No cookies** (except localStorage for settings)
- **Local-only by default**

### Sync Encryption

When sync is enabled:
- All data encrypted client-side before upload
- Encryption key derived from pairing code
- Server never sees plaintext data
- Automatic key rotation

### Input Validation

- Nutrient values: min/max range validation
- Serving quantities: positive numbers only
- Date inputs: valid date format checks
- SQL injection: N/A (no SQL database)
- XSS: Svelte auto-escapes all bindings

---

## Performance Considerations

### Bundle Size

- Initial JavaScript: ~150KB (gzipped)
- Food database: ~2-5MB (lazy-loaded)
- Total initial load: ~200KB
- Time to interactive: < 2s on 3G

### Rendering Optimization

- Virtual scrolling for long food lists
- Lazy loading of food database
- Debounced search input (300ms)
- Memoized calculations
- Efficient Svelte reactivity

### IndexedDB Performance

- Indexed queries for fast date lookups
- Batch operations for bulk updates
- Transactions for atomicity
- Cursor-based iteration for large datasets

### Caching Strategy

**Service Worker**:
- Cache app shell (HTML, CSS, JS)
- Cache food database
- Network-first for sync operations
- Cache-first for static assets

---

## Conclusion

My Nutrients is built as a local-first PWA prioritizing privacy, offline functionality, and performance. The architecture supports comprehensive multi-nutrient tracking while maintaining a small bundle size and fast load times. Optional sync provides cross-device capabilities without compromising the core local-first design.

---

**Last Updated**: December 17, 2025
**Maintained By**: Nathan A. Eaton Jr.
