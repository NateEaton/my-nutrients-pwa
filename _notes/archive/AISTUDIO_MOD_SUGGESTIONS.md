Here are four separate markdown documents detailing the steps for each requested task. You can save these as individual files in your `_notes` directory or use them directly as checklists.

---

## Document 1: Cloudflare Worker Configuration

**Filename suggestion:** `_notes/WORKER_SETUP.md`

# Cloudflare Worker Setup & Migration Guide

This guide covers setting up a fresh Cloudflare Worker environment for "My Nutrients," ensuring it is distinct from the old "My Calcium" setup.

## Prerequisites
*   Node.js installed.
*   Terminal open at the project root.
*   Cloudflare account credentials.

## Step 1: Login to Cloudflare
Ensure you are authenticated with the correct account.

```bash
cd worker
npx wrangler login
# This opens a browser window. Allow access.
```

## Step 2: Create New KV Namespace
We need a fresh storage bucket (KV Namespace) so we don't mix "Nutrients" data with old "Calcium" data.

```bash
# Create Prod Namespace
npx wrangler kv:namespace create "NUTRIENTS_SYNC_KV"

# Output will look like this (COPY THE ID):
# { binding = "SYNC_KV", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

*(Optional) Create a Dev Namespace if you want separate dev environment:*
```bash
npx wrangler kv:namespace create "NUTRIENTS_SYNC_KV" --env dev
```

## Step 3: Update `wrangler.toml`
Open `worker/wrangler.toml` (or copy `.example` if it doesn't exist) and update it to reflect the new app identity and new KV IDs.

```toml
name = "nutrients-sync-worker" # Renamed from calcium-sync-worker
main = "src/index.ts"
compatibility_date = "2024-08-11"

# Environment variables
[vars]
# Update these URLs to match your new deployment URLs
ALLOWED_ORIGINS = "https://mynutrients.app,https://nutrients.eatonfamily.net"

# Production KV namespace
[[kv_namespaces]]
binding = "SYNC_KV"
id = "PASTE_YOUR_NEW_PROD_ID_HERE"

# Development environment
[env.dev]
name = "dev-nutrients-sync-worker"

[env.dev.vars]
ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"

[[env.dev.kv_namespaces]]
binding = "SYNC_KV"
id = "PASTE_YOUR_NEW_DEV_ID_HERE" # Or use Prod ID if not separating
```

## Step 4: Update Worker Logic (`src/index.ts`)
Update the worker code to reflect the new branding in health checks.

**File:** `worker/src/index.ts`

```typescript
// ... imports

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ... CORS setup ...

    try {
      if (path === '/ping') {
        // UPDATE THIS LINE:
        return Response.json({ success: true, message: 'My Nutrients sync worker is running' }, { headers: corsHeaders });
      }

      // ... rest of code remains the same
```

## Step 5: Deploy
Deploy the worker to Cloudflare.

```bash
# Deploy Production
npx wrangler deploy

# Deploy Dev (optional)
npx wrangler deploy --env dev
```

**Note the URL output** (e.g., `https://nutrients-sync-worker.yourname.workers.dev`).

## Step 6: Update Frontend Config
Go back to the root of your project and update your `.env` file.

**File:** `.env`
```env
VITE_WORKER_URL=https://nutrients-sync-worker.yourname.workers.dev
```

---

## Document 2: Consolidating Types

**Filename suggestion:** `_notes/TYPE_CONSOLIDATION.md`

# Type System Consolidation Guide

This guide details merging `calcium.ts` into `nutrients.ts` and updating the codebase to use the new unified type system.

## Step 1: Update `src/lib/types/nutrients.ts`
Ensure this file contains all necessary interfaces, including those that were previously in `calcium.ts`.

**File:** `src/lib/types/nutrients.ts`

```typescript
// Add or verify these interfaces exist:

export interface NutrientSettings {
  nutrientGoals: Record<string, number>;
  displayedNutrients: string[];
  theme?: 'auto' | 'light' | 'dark';
  colorScheme?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';
  // Legacy support for sorting preferences
  sortBy?: 'time' | 'name' | 'type' | string; // 'string' allows nutrient IDs
  sortOrder?: 'asc' | 'desc';
}

// Rename CalciumState to NutrientState if not already done
export interface NutrientState {
  currentDate: string;
  foods: FoodEntry[];
  customFoods: CustomFood[];
  favorites: Set<number>;
  hiddenFoods: Set<number>;
  servingPreferences: Map<number, UserServingPreference>;
  settings: NutrientSettings;
  isLoading: boolean;
}

// Ensure other interfaces (FoodEntry, CustomFood, etc.) are present
```

## Step 2: Delete `src/lib/types/calcium.ts`
Delete the file. This will cause build errors, which is good—it highlights exactly what needs fixing.

```bash
rm src/lib/types/calcium.ts
```

## Step 3: Find and Replace Imports
Perform a global find and replace in your IDE across the `src/` directory.

1.  **Find:** `from '$lib/types/calcium'`
2.  **Replace:** `from '$lib/types/nutrients'`

## Step 4: Fix Renamed Interfaces
Perform specific text replacements to match the new interface names.

**1. CalciumSettings -> NutrientSettings**
*   **Search**: `CalciumSettings`
*   **Replace**: `NutrientSettings`

**2. CalciumState -> NutrientState**
*   **Search**: `CalciumState`
*   **Replace**: `NutrientState`

## Step 5: Verify Files
Check these specific files as they were heavy users of the old types:
1.  `src/lib/stores/nutrients.ts`
2.  `src/lib/services/NutrientService.ts`
3.  `src/routes/settings/+page.svelte`

**Compiler Check:**
Run `npm run check` (if svelte-check is installed) or `npm run build` to verify there are no TypeScript errors regarding missing types.

---

## Document 3: Renaming Guide (Strings & Variables)

**Filename suggestion:** `_notes/RENAMING_GUIDE.md`

# Methodical Renaming Guide

This guide helps remove "Calcium" specific branding and variable names.

## ⚠️ Critical Warning
**Do NOT** do a global "Replace All" for the word "calcium".
*   `calcium` is a valid nutrient ID key in your database and `NutrientValues` objects.
*   `calcium` matches the USDA nutrient name.

Only replace "Calcium" where it refers to the **App Name**, **Service Names**, or **Legacy Variables**.

## Part A: User-Facing Strings (UI)

Search for the string "Calcium" (case insensitive) in all `.svelte` and `.html` files.

**Files to check specifically:**
*   `src/app.html`: `<title>My Calcium</title>` -> `My Nutrients`
*   `src/lib/components/Header.svelte`: Default titles
*   `src/routes/settings/+page.svelte`: "Daily Calcium Goal" -> "Daily Goals"
*   `src/lib/components/GoalEditModal.svelte`: "Set Daily Calcium Goal" -> "Set Daily Goal"
*   `src/lib/components/AboutDialog.svelte`: "Calcium Tracker" -> "Nutrient Tracker"
*   `src/routes/guide/+page.svelte`: Mentions of "My Calcium"
*   `static/manifest.webmanifest`: App name and short_name

## Part B: Variable Names (Code)

Use your IDE's "Rename Symbol" (F2 in VS Code) feature for safe refactoring.

### 1. Store & Service Renaming
In `src/lib/stores/nutrients.ts`:
*   Rename `calciumState` -> `nutrientState`
*   Rename `calciumService` -> `nutrientService` (if not already done)
*   Rename `dailyCalcium` -> `dailyTotal` or `dailySummary`

### 2. AddFoodModal.svelte Refactor
This file has local variables named `calcium` that are used for binding.
*   **Action**: Rename local variable `let calcium` to `let nutrientValue` or similar.
*   **Action**: Rename `updateCalcium()` function to `updateNutrientCalculations()`.

### 3. LocalStorage Keys
In `src/lib/services/NutrientService.ts` and `src/routes/+layout.svelte`:
*   `calcium_theme` -> `nutrient_theme`
*   `calcium_goal` -> `nutrient_goal` (or remove if using `nutrient_goals` JSON)
*   `calcium_sort_settings` -> `nutrient_sort_settings`
*   `calcium_sync_settings` -> `nutrient_sync_settings`

### 4. Filenames
Check if any files still have "Calcium" in their name (e.g., `CalciumService.ts`) and rename them (e.g., `NutrientService.ts`). *Note: You already did most of this, but double-check.*

---

## Document 4: Removing Migration Logic

**Filename suggestion:** `_notes/CLEANUP_MIGRATION.md`

# Migration Logic Cleanup Guide

Since data migration is handled externally via backup file conversion, we can remove complexity from the app code.

## 1. Clean `src/lib/services/NutrientService.ts`

### A. Simplify Initialization
Replace the `initializeIndexedDB` method with this version that ignores old schemas:

```typescript
private async initializeIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    // New DB Name means fresh start
    const request = indexedDB.open('NutrientTracker', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      this.db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create all stores fresh
      db.createObjectStore('customFoods', { keyPath: 'id', autoIncrement: true })
        .createIndex('name', 'name', { unique: false });
      
      db.createObjectStore('favorites', { keyPath: 'foodId' });
      db.createObjectStore('hiddenFoods', { keyPath: 'foodId' });
      db.createObjectStore('servingPreferences', { keyPath: 'foodId' });
      
      const journalStore = db.createObjectStore('journalEntries', { keyPath: 'date' });
      journalStore.createIndex('lastModified', 'lastModified', { unique: false });
      journalStore.createIndex('syncStatus', 'syncStatus', { unique: false });
    };
  });
}
```

### B. Delete Methods
Remove these methods entirely:
*   `migrateCustomFoodsIfNeeded`
*   `migrateFavoritesToIDsIfNeeded`
*   `migrateExistingCustomFoods`
*   `migrateCustomFoodsToSourceMetadata`
*   `updateJournalEntriesCustomFoodIds`
*   `getLegacyCustomFoods`
*   `clearLegacyCustomFoods`
*   `getMigrationStatus`
*   `setMigrationStatus`

### C. Simplify `initialize`
```typescript
async initialize(): Promise<void> {
  await this.initializeIndexedDB();
  await this.initializeCustomFoodIdCounter(); // Keep this for custom food IDs
  
  // Load data directly
  await this.loadSettings();
  await this.loadDailyFoods();
  await this.loadCustomFoods();
  await this.loadFavorites();
  await this.loadHiddenFoods();
  await this.loadServingPreferences();
  await this.applySortToFoods();

  nutrientState.update(state => ({ ...state, isLoading: false }));
}
```

## 2. Clean `src/lib/data/foodDatabase.js`

Remove legacy rehydration fallbacks.

```javascript
// Inside rehydrateDatabase function:
// DELETE THIS BLOCK
/*
if (!rehydratedFood.measures && (rehydratedFood.measure || rehydratedFood.calcium)) {
  rehydratedFood.measures = [{
    measure: rehydratedFood.measure || "",
    calcium: parseFloat(rehydratedFood.calcium || 0)
  }];
}
*/

// Update getPrimaryMeasure to be simple
export function getPrimaryMeasure(food) {
  if (food.measures && food.measures.length > 0) {
    return food.measures[0];
  }
  return { measure: "", nutrients: {} };
}
```

## 3. Clean `src/lib/components/AddFoodModal.svelte`

Remove logic that tries to handle foods without a `nutrients` object.

```javascript
// In resetForm() or updateCalculatedNutrients()
// You can assume food.nutrients always exists now.

// OLD:
// const calciumValue = selectedMeasure.nutrients?.calcium ?? selectedMeasure.calcium ?? 0;

// NEW:
// const calciumValue = selectedMeasure.nutrients?.calcium || 0;
```