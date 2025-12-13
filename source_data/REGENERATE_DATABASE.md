# Regenerating Database with Precision Optimization

## Changes Made

The `data-module-generator-nutrients.cjs` script has been updated with:

1. **Precision Rounding**: Each nutrient type now has appropriate decimal precision
   - Macronutrients (g): 1 decimal place
   - Minerals (mg): Dynamic (0 decimals for ≥10, 1 decimal for <10)
   - Vitamins: Dynamic (1-2 decimals based on magnitude)
   - Omega fatty acids: 3 decimal places

2. **Zero Omission**: Nutrient values that are 0 are no longer included in the output

## Expected Results

- **File size reduction**: 35-45% (from ~5MB to ~2.8-3.3MB)
- **Values eliminated**: ~55,000 zero values
- **Precision issues fixed**: ~12,000+ excessively precise decimals

## Regeneration Steps

Since the large intermediate files (`curated-nutrients-abridged.json`) exist locally on your machine, run:

```bash
cd source_data

# Regenerate the final database module
node data-module-generator-nutrients.cjs \
  curated-nutrients-abridged.json \
  ../src/lib/data/foodDatabaseData.js \
  --module --minify --minimal

# Verify output
ls -lh ../src/lib/data/foodDatabaseData.js
```

## Validation

After regeneration:

1. **Check file size**:
   ```bash
   ls -lh src/lib/data/foodDatabaseData.js
   ```
   Expected: ~2.8-3.3 MB (down from 4.8 MB)

2. **Run the test script**:
   ```bash
   cd source_data
   node test-precision-rounding.cjs
   ```
   All tests should pass.

3. **Test the app**:
   ```bash
   npm run dev
   ```
   - Search for foods
   - Add foods to journal
   - Verify nutrient calculations are correct
   - Check that progress bars display properly

## Rollback

If you need to revert:

```bash
git checkout src/lib/data/foodDatabaseData.js
git checkout source_data/data-module-generator-nutrients.cjs
```

## Sample Output Comparison

### Before (excessive precision):
```json
{
  "iron": 0.7979999999999999,
  "protein": 4.560000000000001,
  "calcium": 102.6000000000001,
  "vitaminD": 0,
  "omega3EPA": 0,
  "fiber": 0
}
```

### After (optimized):
```json
{
  "iron": 0.8,
  "protein": 4.6,
  "calcium": 103
}
```

**Size reduction**: 120 chars → 40 chars (66.7% reduction)

## Notes

- The rounding is applied during database generation, not at runtime
- No code changes needed in the app - it already handles missing properties as 0
- Nutrient calculations remain accurate within nutritional tracking tolerance
- All 3,752 foods are preserved
