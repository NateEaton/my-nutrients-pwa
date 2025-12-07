# My Nutrients - Key Architectural Decisions

**Version**: 1.0.0
**Last Updated**: December 2025

---

## Decision Log

This document records key architectural and design decisions made during the My Calcium → My Nutrients transformation.

### Format

Each decision follows this structure:
- **Decision**: What was decided
- **Context**: Why this decision was needed
- **Options Considered**: Alternatives evaluated
- **Chosen Approach**: Final decision
- **Rationale**: Why this option was selected
- **Consequences**: Impact of this decision
- **Status**: Active | Superseded | Deprecated

---

## Decision 1: Data Source Strategy

**Decision**: Use USDA FDC CSV downloads as primary data source, not API

**Context**: Need multi-nutrient data for 3,800+ foods with accurate serving sizes

**Options Considered**:
1. USDA FDC API only (fetch nutrients on-demand)
2. CSV download to generate offline database
3. Hybrid (API for new foods, cache in IndexedDB)

**Chosen Approach**: Option 2 - CSV download with offline database

**Rationale**:
- CSV downloads contain **all nutrients** per food/serving measure
- API responses only provide nutrients per 100g (requires manual serving calculations)
- Offline-first architecture preserved (works without network)
- No API rate limits during search
- Serving sizes are accurate from source data
- User already familiar with curated database approach

**Consequences**:
- ✅ Offline functionality maintained
- ✅ Accurate serving sizes
- ✅ Fast search (no network latency)
- ⚠️ Larger initial bundle (~2-3MB vs 400KB)
- ⚠️ Database updates require new app builds
- ⚠️ Data processing pipeline needed

**Status**: Active

---

## Decision 2: Track All Nutrients vs. User-Selected Only

**Decision**: Track all nutrients, let user select 3-4 to display in UI

**Context**: Balance between flexibility and data completeness

**Options Considered**:
1. Track only nutrients user selects (minimize storage)
2. Track all 20+ nutrients, display subset
3. Track all nutrients, let user toggle tracking on/off per nutrient

**Chosen Approach**: Option 2 - Track all, display subset

**Rationale**:
- Simpler implementation (no conditional logic for which nutrients to store)
- User can change display preferences without losing historical data
- Storage impact minimal (~450 bytes per food vs ~150 bytes)
- Future-proof (can add nutrients without data migration)
- Easier migration (all foods have consistent structure)

**Consequences**:
- ✅ User flexibility (change displayed nutrients anytime)
- ✅ Complete historical data
- ✅ Simpler code (no conditionals)
- ⚠️ ~3x journal storage size (still tiny: ~165KB for 365 days)
- ⚠️ Slightly larger sync payloads

**Status**: Active

---

## Decision 3: Database Identity

**Decision**: New database name `NutrientTracker` v1, not `CalciumTracker` v8

**Context**: Major schema change with multi-nutrient support

**Options Considered**:
1. Bump CalciumTracker to v8 (in-place migration)
2. Create new NutrientTracker v1 (fresh start)
3. Keep same name but start version from v1

**Chosen Approach**: Option 2 - New database name and version

**Rationale**:
- Clean break from old schema (no complex upgrade logic)
- Allows old and new to coexist temporarily (safety net)
- Clearer app identity (My Nutrients, not My Calcium)
- Simpler migration via backup file (offline, testable)
- Avoids risk of corrupting production data during upgrade

**Consequences**:
- ✅ Safe migration (old data untouched)
- ✅ Testable (can validate before deleting old DB)
- ✅ Rollback possible (old DB still exists)
- ⚠️ Requires backup/restore step (not automatic)
- ⚠️ User needs to understand it's a new app

**Status**: Active

---

## Decision 4: UI Navigation Pattern

**Decision**: Two-layer approach: Food tracking (main) + Nutrient details (secondary)

**Context**: Need to display multi-nutrient data without overwhelming users

**Options Considered**:
1. Single view with all nutrients always visible
2. Two-layer: Food view (3-4 nutrients) + Nutrient view (all nutrients)
3. Tab-based: One tab per nutrient
4. Accordion: Expand/collapse nutrient sections

**Chosen Approach**: Option 2 - Two-layer approach

**Rationale**:
- Progressive disclosure (complexity hidden until needed)
- Food tracking remains simple (just 3-4 nutrients shown)
- Dedicated nutrient analysis page for deep-dive
- Similar to Apple Health pattern (Browse → Category)
- Familiar to current My Calcium users (minimal change to tracking page)

**Consequences**:
- ✅ Simple UX for daily food logging
- ✅ Powerful analysis when needed
- ✅ Scalable (can add more nutrients without UI clutter)
- ⚠️ Requires new route/page (Nutrients view)
- ⚠️ User needs to learn navigation

**Status**: Active

---

## Decision 5: Displayed Nutrients Limit

**Decision**: Maximum 3-4 nutrients displayed in food cards/summary

**Context**: Need to balance information density with readability

**Options Considered**:
1. No limit (show all tracked nutrients)
2. Fixed 3 nutrients
3. User choice 1-6 nutrients
4. User choice 3-4 nutrients (recommended)

**Chosen Approach**: Option 4 - User choice, 3-4 limit

**Rationale**:
- 3-4 fits well on mobile screens without scrolling
- Research shows seniors prefer fewer choices (cognitive load)
- Most important nutrients can fit (protein, calcium, fiber, vitaminD)
- Still flexible (user picks which 3-4 matter to them)
- Prevents UI clutter on small screens

**Consequences**:
- ✅ Clean, readable UI on mobile
- ✅ User control over what they see
- ✅ Forces prioritization (focus on what matters)
- ⚠️ Some nutrients "hidden" in food cards
- ⚠️ User must navigate to Nutrients page to see others

**Status**: Active

---

## Decision 6: Default Displayed Nutrients

**Decision**: Default to Protein, Calcium, Fiber, Vitamin D

**Context**: First-time users need sensible defaults

**Options Considered**:
1. Prompt user to choose during onboarding
2. Default to calcium only (continuity with My Calcium)
3. Default to 4 important nutrients for seniors
4. Default to most commonly tracked nutrients

**Chosen Approach**: Option 3 - Protein, Calcium, Fiber, Vitamin D

**Rationale**:
- **Protein**: Critical for seniors (sarcopenia prevention)
- **Calcium**: Continuity with My Calcium, bone health
- **Fiber**: Digestive health, often underconsumed
- **Vitamin D**: Bone health, immune function, often deficient in seniors
- Evidence-based (these are commonly deficient in older adults)
- Covers variety (macro, mineral, vitamin)

**Consequences**:
- ✅ Sensible defaults for senior health
- ✅ No onboarding friction
- ✅ User can change anytime
- ⚠️ May not match every user's needs initially

**Status**: Active

---

## Decision 7: Nutrient Goals (RDA vs. Custom)

**Decision**: Provide RDA-based defaults, allow user customization

**Context**: Users need goal targets, but individual needs vary

**Options Considered**:
1. Fixed RDA values (not customizable)
2. Custom only (user must enter all)
3. RDA defaults with customization
4. Age/gender-based recommendations

**Chosen Approach**: Option 3 - RDA defaults, user can override

**Rationale**:
- Reduces setup friction (good defaults provided)
- Evidence-based (Dietary Reference Intakes)
- Flexible (user can adjust for health conditions)
- No gender/age input needed (privacy-friendly)
- Use higher value where RDA differs by gender (safer default)

**Consequences**:
- ✅ Zero-configuration experience
- ✅ Science-based goals
- ✅ Customizable for individual needs
- ⚠️ May not be perfect for everyone
- ⚠️ Doesn't account for health conditions

**Status**: Active

---

## Decision 8: Migration Strategy

**Decision**: Offline migration via backup file, not in-app auto-migration

**Context**: Need to migrate user from My Calcium to My Nutrients

**Options Considered**:
1. In-app auto-migration (detect old DB, upgrade on launch)
2. Server-side migration (during sync)
3. Offline backup file migration
4. Manual re-entry (not acceptable)

**Chosen Approach**: Option 3 - Offline backup file migration

**Rationale**:
- Testable (can validate before production)
- Reversible (old backup preserved)
- No risk of corrupting production data
- Works without sync enabled
- Single-user deployment (wife only, manageable)
- Clear audit trail (before/after backups)

**Consequences**:
- ✅ Safe (original data preserved)
- ✅ Testable (dry-run possible)
- ✅ Simple (no complex upgrade logic)
- ⚠️ Requires manual step (not automatic)
- ⚠️ User must understand process
- ⚠️ Not scalable (wouldn't work for app store distribution)

**Status**: Active

---

## Decision 9: Sync Compatibility

**Decision**: No backward compatibility - require new sync pair for v3.0

**Context**: Backup format changed from v2.1 to v3.0

**Options Considered**:
1. Support syncing between v2.1 and v3.0 devices
2. Require all devices on same version (new sync pair)
3. Server-side format translation

**Chosen Approach**: Option 2 - New sync pair required

**Rationale**:
- Simpler implementation (no translation logic)
- Cleaner (all devices on same format)
- Single-user scenario (only 2 devices to pair)
- Lower risk of data corruption
- Sync doc ID changes anyway (fresh start)

**Consequences**:
- ✅ Simple, clean sync architecture
- ✅ No format translation bugs
- ⚠️ User must re-pair devices
- ⚠️ Can't gradually roll out to devices

**Status**: Active

---

## Decision 10: Bundle Size vs. Lazy Loading

**Decision**: Include full database in initial bundle, no lazy loading for v1.0

**Context**: Database size increased from 400KB to 2-3MB

**Options Considered**:
1. Lazy load database on first search
2. Split database by food group, load on-demand
3. Include full database in bundle
4. Virtualized loading (paginate foods)

**Chosen Approach**: Option 3 - Full database in bundle

**Rationale**:
- Simpler implementation (no async loading complexity)
- PWA caches everything anyway (one-time download)
- 2-3MB is acceptable for modern devices/networks
- Offline-first (database available immediately)
- Faster time-to-interactive after PWA install

**Consequences**:
- ✅ Simple code (no lazy loading logic)
- ✅ Works offline immediately
- ✅ Fast search (no loading states)
- ⚠️ Larger initial download
- ⚠️ May reconsider if database grows significantly

**Status**: Active

---

## Decision 11: Nutrient Selector UI Pattern

**Decision**: Dropdown with star indicators for displayed nutrients

**Context**: Need clear way to distinguish user's selected nutrients from others

**Options Considered**:
1. Flat list (no distinction)
2. Two separate dropdowns (displayed vs. others)
3. Single dropdown with visual distinction (stars, separator)
4. Tabs (one per nutrient)

**Chosen Approach**: Option 3 - Dropdown with stars and separator

**Rationale**:
- Clear visual hierarchy (⭐ = your selected nutrients)
- Single selector (not confusing)
- All nutrients accessible (no hidden functionality)
- Similar to "favorites" pattern (familiar UX)
- Works well on mobile (compact)

**Consequences**:
- ✅ Intuitive distinction
- ✅ One selector to learn
- ✅ All nutrients accessible
- ⚠️ Requires custom component (not standard select)

**Status**: Active

---

## Decision 12: Swipe Navigation

**Decision**: Support swipe left/right to navigate between nutrients

**Context**: Mobile users need easy navigation in Nutrient detail view

**Options Considered**:
1. Dropdown only (no swipe)
2. Swipe + dropdown
3. Arrow buttons + dropdown
4. Gesture-only (no dropdown)

**Chosen Approach**: Option 2 - Swipe + dropdown

**Rationale**:
- Mobile-first (swipe is natural on touchscreens)
- Discoverable (dropdown still visible)
- Fast (swipe is quicker than tapping dropdown)
- Familiar pattern (like image galleries)
- Keyboard accessible (arrow keys also supported)

**Consequences**:
- ✅ Fast mobile navigation
- ✅ Accessible (multiple input methods)
- ⚠️ Requires touch event handling
- ⚠️ Must prevent conflicts with page scroll

**Status**: Active

---

## Decision 13: Statistics & Reports Parameterization

**Decision**: Single Stats/Report page with nutrient selector (not separate pages per nutrient)

**Context**: Need to show charts/reports for any nutrient

**Options Considered**:
1. Separate route per nutrient (`/stats/calcium`, `/stats/protein`)
2. Single page with nutrient parameter (`/stats?nutrient=calcium`)
3. Single page with client-side selector (no URL param)

**Chosen Approach**: Option 3 - Single page, client-side selector

**Rationale**:
- Simpler routing (one page handles all nutrients)
- No URL complexity (cleaner)
- Same component, different data (DRY principle)
- Selector state maintained during navigation
- Easier to add new nutrients (no routing changes)

**Consequences**:
- ✅ Simple implementation
- ✅ One page to maintain
- ⚠️ No direct links to specific nutrients
- ⚠️ Selector state not in URL

**Status**: Active

---

## Decision 14: CSV Export Format

**Decision**: All nutrients in columns, one row per food + daily total rows

**Context**: Export feature needs to support multi-nutrient data

**Options Considered**:
1. One column per nutrient (wide format)
2. Long format (Date, Food, Nutrient, Value)
3. Separate CSV per nutrient

**Chosen Approach**: Option 1 - Wide format with all nutrient columns

**Rationale**:
- Excel/Google Sheets friendly
- Easy to analyze (pivot tables, charts)
- Consistent with existing calcium-only export
- Daily totals clearly visible
- One file for all data

**Consequences**:
- ✅ Compatible with spreadsheets
- ✅ Human-readable
- ⚠️ Very wide file (20+ columns)
- ⚠️ Large file size for long date ranges

**Status**: Active

---

## Decision 15: Smart Scan (UPC) Nutrient Handling

**Decision**: Extract all available nutrients from API, populate food entry

**Context**: Smart Scan should leverage multi-nutrient capability

**Options Considered**:
1. Extract only displayed nutrients (save bandwidth)
2. Extract all available nutrients
3. Let user choose which to extract

**Chosen Approach**: Option 2 - Extract all available

**Rationale**:
- User might change displayed nutrients later
- Data is already in API response (no extra cost)
- Complete historical record
- Consistency with database foods (all have all nutrients)

**Consequences**:
- ✅ Complete data capture
- ✅ User flexibility
- ✅ Consistent with offline database
- ⚠️ Slightly larger API response processing

**Status**: Active

---

## Future Decisions to Document

- Meal planning architecture (if implemented)
- Photo OCR multi-nutrient extraction
- Recipe support (aggregate nutrients)
- Multi-user support (if needed)
- App store distribution strategy

---

## Decision Template

Use this template for future decisions:

```markdown
## Decision X: [Title]

**Decision**: [What was decided]

**Context**: [Why this decision was needed]

**Options Considered**:
1. Option A
2. Option B
3. Option C

**Chosen Approach**: [Which option]

**Rationale**:
- Reason 1
- Reason 2

**Consequences**:
- ✅ Benefit
- ⚠️ Trade-off

**Status**: Active | Superseded | Deprecated

**Date**: YYYY-MM-DD
```

---

## References

- [Architectural Decision Records (ADR)](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
