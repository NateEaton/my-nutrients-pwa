# Developer Guide

**Version**: 1.0.0
**Last Updated**: December 17, 2025

---

## Project Overview

**My Nutrients PWA** is a Progressive Web App for tracking multiple nutrients across daily food intake, supporting 20+ nutrients including macronutrients, minerals, vitamins, and omega fatty acids.

**Tech Stack**:
- **Frontend**: SvelteKit (SSR + CSR)
- **Storage**: IndexedDB (client-side, offline-first)
- **Data Source**: USDA FoodData Central JSON files
- **Build**: Vite
- **Deployment**: Static site

---

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Git**: For version control

### Setup

```bash
# Clone the repository
git clone https://github.com/NateEaton/my-nutrients-pwa.git
cd my-nutrients-pwa

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at `http://localhost:5173`.

---

## Project Structure

```
my-nutrients-pwa/
├── src/
│   ├── lib/
│   │   ├── components/      # Svelte components
│   │   ├── services/        # Business logic layer
│   │   ├── stores/          # Svelte stores (state)
│   │   ├── data/            # Food database module
│   │   ├── types/           # TypeScript interfaces
│   │   └── config/          # Configuration files
│   ├── routes/              # SvelteKit pages
│   └── app.html             # HTML template
├── static/                  # Static assets
│   └── data/
│       └── provenance/      # Food source provenance data
├── source_data/             # Data pipeline scripts
└── _notes/                  # Documentation
```

---

## Key Technical Patterns

### Multi-Nutrient Data Structure

All nutrient data uses the `NutrientValues` interface (`src/lib/types/nutrients.ts`):

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

### Food Database Structure

Foods in the database follow this structure:

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

### Service Layer Architecture

The application uses a service layer pattern to separate business logic from UI:

**NutrientService** (`src/lib/services/NutrientService.ts`):
- Manages IndexedDB operations
- Handles nutrient calculations
- Provides data access methods
- Centralizes business logic

**Usage Example**:
```javascript
import { nutrientService } from '$lib/services/NutrientService';

// Add a food entry
await nutrientService.addFoodEntry(date, foodData);

// Get daily totals
const totals = await nutrientService.getDayTotals(date);

// Get nutrient settings
const settings = await nutrientService.getNutrientSettings();
```

### State Management

Global state is managed using Svelte stores (`src/lib/stores/nutrients.ts`):

```javascript
import { nutrients } from '$lib/stores/nutrients';

// Subscribe to state changes
$: foods = $nutrients.foods;
$: totalNutrients = $nutrients.totalNutrients;
$: displayedNutrients = $nutrients.displayedNutrients;
```

---

## Component Guidelines

### SummaryCard.svelte

Displays daily progress for tracked nutrients.

**Props**:
```svelte
export let currentDate;
export let totalNutrients = {}; // NutrientValues
export let nutrientGoals = {}; // Record<string, number>
export let displayedNutrients = []; // string[] - max 4
```

### FoodEntry.svelte

Displays individual food entry with nutrients.

**Props**:
```svelte
export let food; // FoodEntry
export let index; // number
export let displayedNutrients = []; // string[]
```

### AddFoodModal.svelte

Modal for adding/editing food entries.

**Key Features**:
- Search database foods with nutrient preview
- Multi-nutrient input for custom foods
- Serving size calculation
- Shows preview of nutrients based on selected serving

---

## Data Pipeline

The food database is generated using scripts in `source_data/`. See the [[Data Pipeline]] wiki page for complete documentation.

**Quick regeneration**:

```bash
cd source_data

# Step 1: Extract nutrients from USDA JSON files
node json-data-processor.cjs \
  --foundation FoodData_Central_foundation_food_json_2024-04-24.json \
  --sr-legacy FoodData_Central_sr_legacy_food_json_2018-04.json \
  --output combined-nutrient-data

# Step 2: Assign stable appIds
node master-key-assigner-json.cjs \
  combined-nutrient-data.json \
  mastered-nutrient-data.json

# Step 3: Curate foods
node food-curator-nutrients.cjs \
  mastered-nutrient-data.json \
  curated-nutrients-abridged.json

# Step 4: Generate module
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal

# Step 5 (Optional): Generate provenance data
node provenance-generator.cjs \
  curated-nutrients-abridged.json \
  mastered-nutrient-data.json \
  ../static/data/provenance
```

**Important**: Large intermediate files (~200MB) exist locally but are NOT committed to git. Only the final `foodDatabaseData.js` (~2-5MB) is committed.

---

## Development Workflow

### Adding a New Feature

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes following existing patterns
3. Test thoroughly in development mode
4. Build and test production build
5. Commit with descriptive message (see Commit Conventions below)
6. Push and create pull request

### Testing

**Manual Testing Checklist**:
- Search functionality works
- Nutrient preview shows correct values
- Custom food entry accepts multiple nutrients
- Food journal shows correct totals
- Progress displays accurately
- Settings changes persist

**Browser Console Validation**:
```javascript
// Check database format
import { getFoodDatabase } from '$lib/data/foodDatabase.js';
const db = await getFoodDatabase();
console.log('Database loaded:', db.length, 'foods');

// Verify food structure
const milk = db.find(f => f.name.toLowerCase().includes('milk'));
console.log('Milk measures:', milk.measures.length);
console.log('First measure nutrients:', milk.measures[0].nutrients);
```

---

## Commit Conventions

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `test`: Adding tests
- `style`: Code formatting

**Examples**:
```
feat(tracking): Add multi-nutrient display to SummaryCard
fix(modal): Handle nutrients structure in AddFoodModal search
docs: Update DATA_PIPELINE.md with JSON parser steps
refactor(services): Extract nutrient formatting to helper function
```

---

## Common Tasks

### Adding a New Nutrient

1. **Update type definition** (`src/lib/types/nutrients.ts`):
   ```typescript
   export interface NutrientValues {
     // ... existing nutrients
     newNutrient?: number; // description
   }
   ```

2. **Add to config** (`src/lib/config/nutrientDefaults.ts`):
   ```javascript
   export const NUTRIENT_INFO = {
     // ... existing nutrients
     newNutrient: {
       name: 'New Nutrient',
       unit: 'mg',
       defaultGoal: 100,
       color: 'hsl(200, 70%, 50%)'
     }
   };
   ```

3. **Update USDA mapping** (`source_data/usda-fdc-json-config.json`):
   ```json
   {
     "nutrientMapping": {
       "123": "newNutrient"
     }
   }
   ```

4. **Regenerate database** (see Data Pipeline section)

### Updating Styles

Styles use CSS custom properties defined in `app.css`:

```css
:root {
  --primary-color: hsl(210, 100%, 50%);
  --bg-color: hsl(0, 0%, 100%);
  /* ... more variables */
}
```

Component-specific styles use `<style>` blocks with scoped CSS.

---

## Troubleshooting

### Common Issues

**Issue**: Search returns no results
- **Solution**: Check browser console for errors. Verify database loaded correctly.

**Issue**: Nutrient values missing in UI
- **Solution**: Ensure `displayedNutrients` prop is passed to components.

**Issue**: IndexedDB errors
- **Solution**: Clear application data in browser DevTools → Application → Storage.

### Debug Mode

Enable verbose logging:

```javascript
// In src/lib/services/NutrientService.ts
const DEBUG = true; // Set to true for console logging
```

---

## Performance Considerations

### Bundle Size

- Food database: ~2-5MB (minified)
- Total bundle: ~500KB (excluding database)
- Use code splitting for large components

### IndexedDB Performance

- Batch operations when possible
- Use indexes for frequent queries
- Avoid loading all data at once

### Rendering Optimization

- Use `{#key}` blocks for list updates
- Implement virtual scrolling for long lists
- Defer heavy computations

---

## Additional Resources

- **[[Architecture]]** - System architecture documentation
- **[[Technical Decisions]]** - Architectural decision records
- **[[UI Specification]]** - Component specifications
- **[[Data Pipeline]]** - Database generation process
- **[[Nutrient Reference]]** - Complete nutrient mapping

---

## Contributing

See the main README for contribution guidelines.

**Before submitting a PR**:
- Test all functionality manually
- Check browser console for errors
- Verify build succeeds (`npm run build`)
- Follow commit conventions
- Update documentation if needed

---

**Last Updated**: December 17, 2025
**Maintained By**: Nathan A. Eaton Jr.
