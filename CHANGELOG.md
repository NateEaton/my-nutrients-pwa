# Changelog

All notable changes to My Nutrients will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for v1.1
- Meal planning functionality
- Recipe support with nutrient aggregation
- Enhanced analytics (trends, correlations)
- Photo logging with OCR
- Multi-language support

---

## [1.0.0] - TBD (In Development)

### Added
- **Multi-nutrient tracking**: Track 20+ essential nutrients including protein, fiber, vitamins, and minerals
- **Nutrient selection**: Choose up to 4 nutrients to display in food cards and summaries
- **Nutrients analysis page**: Dedicated view for analyzing individual nutrients
- **Nutrient-specific stats**: Charts and reports for any tracked nutrient
- **Smart defaults**: RDA-based goals for seniors (age 65+)
- **Enhanced food database**: 3,800+ foods with comprehensive nutrient data
- **Swipe navigation**: Swipe between nutrients on mobile devices
- **CSV export enhancement**: Export all nutrients to spreadsheet

### Changed
- **App name**: "My Calcium" → "My Nutrients"
- **Database**: 400KB (calcium only) → 2-3MB (20+ nutrients)
- **Backup format**: v2.1.0 → v3.0.0 (multi-nutrient support)
- **IndexedDB**: CalciumTracker v7 → NutrientTracker v1
- **Settings**: Single goal → per-nutrient goals

### Migration Notes
- Requires backup file migration (see `_notes/MIGRATION_GUIDE.md`)
- New sync pair required (v2.1 ↔ v3.0 incompatible)
- All calcium data preserved during migration

### Breaking Changes
- Not compatible with My Calcium backups without migration
- Sync not compatible between v2.x and v3.0
- localStorage keys changed (`calcium_*` → `nutrient_*`)

---

## [2.1.0] - 2025-11-19 (My Calcium - Final Version)

### Added
- Smart Scan UPC barcode lookup
- Multi-measure support for foods
- Enhanced custom food creation with source metadata
- OpenFoodFacts fallback for barcode lookups

### Changed
- Database expanded to 3,876 foods (from ~3,000)
- Improved serving size selection algorithm
- Updated UI with better mobile responsiveness

### Fixed
- Sync reliability improvements
- Custom food saving edge cases
- Date navigation issues

---

## [2.0.0] - 2025-08-09 (My Calcium)

### Added
- Curated food database with 3,000+ USDA foods
- Multi-measure serving options
- Stable appId system for food references
- Database documentation page
- Migration utilities

### Changed
- Switched from API-based to CSV-based food data
- Improved search algorithm with better scoring
- Enhanced backup/restore with versioning

---

## [1.0.0] - 2024 (My Calcium - Initial Release)

### Added
- Daily calcium tracking
- Custom food creation
- Food search from USDA database
- Daily, weekly, monthly, yearly statistics
- Printable reports
- CSV export
- Backup and restore
- End-to-end encrypted sync
- Progressive Web App (offline support)
- Dark mode
- Touch-friendly UI

---

## Version History

- **1.0.0** (TBD): My Nutrients - Multi-nutrient tracking for seniors
- **2.1.0** (2025-11-19): My Calcium - Smart Scan added
- **2.0.0** (2025-08-09): My Calcium - Curated database
- **1.0.0** (2024): My Calcium - Initial release

---

## Migration Path

- **My Calcium v2.x → My Nutrients v1.0**: Use migration script (`migration/migrate-calcium-to-nutrients.js`)
- **My Nutrients v1.x → v2.x**: TBD (not yet planned)

---

## Acknowledgments

- USDA FoodData Central for comprehensive nutrient data
- OpenFoodFacts for barcode database
- Users for feedback and testing
