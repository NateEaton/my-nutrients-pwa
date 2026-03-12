# Quick Conversions for Adjective-Modified Measures

**Date**: March 2026
**Branch**: `enhancement/quick-conversions`
**Status**: Implementation

---

## Problem

USDA serving sizes often include descriptive adjectives after the unit, e.g., "1 cup, shredded", "1 cup, chopped", "1 tbsp, ground". The quick conversions feature (which offers alternatives like "16 Tbsp" when the serving is "1 cup") requires an exact unit match against the conversion table. When adjectives are present, the full string (e.g., "cup, shredded") fails the lookup and returns `unitType: "unknown"`, suppressing quick conversions entirely.

Roughly 20% of USDA measures include qualifiers. The most common adjective format is comma-separated: "cup, shredded", "cup, chopped", "cup, diced", "cup, cooked", etc.

## Validity of Conversion

Adjectives like "shredded", "grated", "chopped" describe the food's physical form, not the measurement unit. A cup is a cup regardless of whether the contents are shredded or whole. The volume-to-volume conversion ratio (e.g., 1 cup = 16 Tbsp) is mathematically valid regardless of the adjective.

Importantly, the USDA nutrient values are already calibrated for the specific form. "1 cup, shredded" cheese has nutrient values measured for shredded cheese in a cup. Converting to "2 Tbsp, shredded" at a 2/16 ratio correctly scales those nutrients proportionally.

## Solution

Enhance `parseSimpleMeasure()` in `UnitConverter.ts` to detect and strip comma-separated descriptors before unit lookup, while preserving the descriptor in a new `descriptor` field on `ParsedMeasure`. The UI then appends the descriptor to display text and quick conversion suggestions.

### Design Decisions

- **Strip comma-separated adjectives** - This is the dominant USDA format and is unambiguous to parse (e.g., "cup, shredded").
- **Also strip known adjectives without commas** - A maintained allowlist (`KNOWN_MEASURE_ADJECTIVES`) catches no-comma cases like "cup shredded". Only words confirmed in USDA data are included to avoid false positives from pasta shapes or parenthetical contexts.
- **No changes to data storage** - The descriptor is extracted at parse time and recombined for display. Journal entries and database records are unaffected.
- **Descriptor carries through to display** - "1 cup, shredded" converts to "16 Tbsp, shredded", preserving context.
- **Try full string first** - If the full string (including comma) somehow matches a known unit, use it as-is. Only attempt descriptor stripping as a fallback.

## Files Modified

### `src/lib/services/UnitConverter.ts`

1. **`ParsedMeasure` interface** (~line 28): Add optional `descriptor?: string` field.

2. **`KNOWN_MEASURE_ADJECTIVES` constant**: A `Set` of ~30 known preparation/form adjectives (chopped, shredded, sliced, diced, cooked, ground, whole, etc.) used for no-comma descriptor stripping.

3. **`parseSimpleMeasure()`** (~line 341): Three-stage fallback: (a) try full string, (b) try stripping comma-separated descriptor, (c) try stripping a known adjective without comma.

3. **`parseUSDAMeasure()`** (~line 327-335): Thread `descriptor` from `parseSimpleMeasure()` into the returned `ParsedMeasure` object.

### `src/lib/components/AddFoodModal.svelte`

1. **`servingUnit` initialization** (~lines 421, 444): When setting `servingUnit` from parsed measure, append `, descriptor` if present.

2. **`updateUnitSuggestions()`** (~line 617): Pass the clean unit (without descriptor) to `detectBestAlternativeUnits()` so conversion lookups succeed.

3. **Quick conversion button display** (~line 1646): Append descriptor to each suggestion's display text.

4. **`selectUnitSuggestion()`** (~line 628): When a suggestion is selected, set `servingUnit` to include the descriptor (e.g., "tbsp, shredded").

5. **`updateCalculatedNutrients()`** (~line 509): Strip descriptor from `servingUnit` before passing to `calculateNutrientForConvertedUnits()`, since the conversion engine needs the clean unit.

## Risks & Edge Cases

| Concern | Assessment |
|---------|------------|
| **False positives** | Mitigated by only stripping when the pre-comma portion matches a known unit in the conversion table. |
| **Density-affecting descriptors** (e.g., "packed") | USDA nutrients already account for the specific form. Proportional scaling remains correct. |
| **Multiple comma-separated descriptors** (e.g., "cup, crushed, sliced, or chunks") | Handled naturally - everything after the first comma is treated as the full descriptor string. |
| **Journal compatibility** | No storage format changes. `servingUnit` in saved journal entries will include the descriptor as before. Editing a saved entry re-parses the measure. |
| **Non-adjective comma content** | Rare in practice. The guard (pre-comma must match a known unit) prevents false matches. |

## Verification

1. Select a food with "1 cup, shredded" measure - verify quick conversions appear (e.g., "16 Tbsp, shredded")
2. Click a conversion - verify unit updates to "Tbsp, shredded" and nutrients scale correctly
3. Select a food with plain "1 cup" - verify existing behavior unchanged
4. Test edge case: "1 cup, crushed, sliced, or chunks" - descriptor should be "crushed, sliced, or chunks"
5. Log a food with converted adjective measure - verify journal saves and edits correctly
6. Run existing test suite
