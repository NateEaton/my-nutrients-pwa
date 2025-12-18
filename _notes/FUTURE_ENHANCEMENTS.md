# My Nutrients - Future Enhancements Backlog

**Version**: 1.0
**Date**: December 13, 2025
**Status**: Post v1.0 Release

---

## Overview

This document tracks feature ideas and enhancements deferred from the v1.0 release. Items are organized by priority and estimated complexity.

---

## High Priority (v1.1 Candidates)

### 1. Enhanced Nutrient Selector on Stats/Reports Pages

**Current State**: Selector shows only the 1-4 tracked nutrients

**Enhancement**: Add ability to view stats/reports for any nutrient, not just tracked ones

**Proposed Implementation**:
- Keep current dropdown showing tracked nutrients
- Add small "+" or "View All" button next to selector
- Opens modal/sheet to select from all 25 nutrients
- Selected nutrient becomes temporarily active for viewing stats
- Doesn't change user's tracked nutrients settings

**Benefits**:
- Explore any nutrient without changing settings
- Useful for one-off analysis
- Maintains simple default behavior

**Complexity**: Medium (2-3 hours)
**Priority**: High - improves flexibility without complexity

---

### 2. Multi-Nutrient Database Documentation HTML

**Current State**: HTML docs generated with calcium only

**Enhancement**: Generate HTML showing multiple nutrients

**Options**:
- **Option A**: Fixed 4 nutrients (protein, calcium, fiber, vitamin D)
- **Option B**: All 25 nutrients (large file, ~10-15MB)
- **Option C**: Configurable during build (specify which nutrients to include)

**Proposed Implementation** (Option A):
- Update `source_data/html-docs-generator.cjs`
- Show 4 fixed nutrients in table columns
- Add prominent note: "For complete nutrient information, use the Database page in the app"
- Estimated file size: 2-3MB (manageable)

**Benefits**:
- More useful as a reference document
- Still reasonable file size
- Consistent with default app behavior

**Complexity**: Low-Medium (4-6 hours)
**Priority**: Medium - nice to have, not critical

---

## Medium Priority (v1.2+ Candidates)

### 3. Advanced Tracking Page Sorting Options

**Current State**: Cycling button rotates through tracked nutrients

**Enhancement**: Dropdown menu for nutrient selection

**Implementation** (Option B from completion plan):
```
Sort: [Added] [Name] [Nutrients ▼]
                      ↓
            [✓ Protein]
            [  Calcium]
            [  Fiber]
            [  Vitamin D]
```

**Benefits**:
- More discoverable than cycling
- Clear visual feedback
- Familiar pattern

**Trade-offs**:
- Slightly more complex UI
- Extra tap required

**Alternative** (Option C): Long-press or swipe gesture to cycle
- Most space-efficient
- Power-user friendly
- Discoverability issue (needs tooltip)

**Complexity**: Low (2-3 hours)
**Priority**: Medium - current cycling approach is functional

---

### 4. Meal Planning

**Description**: Pre-plan meals for future days

**Features**:
- Create meal templates
- Copy meals to journal
- Recurring meal patterns
- Meal categories (breakfast, lunch, dinner, snacks)

**Complexity**: High (2-3 days)
**Priority**: Medium

---

### 5. Recipe Builder

**Description**: Create recipes with automatic nutrient totals

**Features**:
- Add multiple ingredients
- Calculate total nutrients per serving
- Save and reuse recipes
- Export/share recipes

**Complexity**: High (3-4 days)
**Priority**: Medium

---

## Low Priority (v2.0+ Candidates)

### 6. Photo Logging with OCR

**Description**: Take photos of meals and extract nutrients via OCR

**Features**:
- Camera integration
- OCR for nutrition labels
- Smart nutrient extraction
- Manual correction/editing

**Complexity**: Very High (5+ days)
**Priority**: Low - OCR already exists for nutrition labels

---

### 7. Advanced Analytics

**Description**: Nutrient correlations, trends, predictions

**Features**:
- Identify nutrient co-occurrence patterns
- Predict nutrient intake based on time of day
- Suggest foods to meet goals
- Weekly/monthly trend analysis

**Complexity**: Very High (1-2 weeks)
**Priority**: Low

---

### 8. Multi-Language Support

**Description**: i18n support for global users

**Features**:
- Translation system
- Locale-specific date/number formats
- RTL language support
- Food database translations

**Complexity**: Very High (2-3 weeks)
**Priority**: Low

---

### 9. Health App Integration

**Description**: Sync with Apple Health, Google Fit, etc.

**Features**:
- Export data to health platforms
- Import activity data
- Two-way synchronization

**Complexity**: Very High (2+ weeks)
**Priority**: Low - privacy concerns, platform-specific

---

## Deferred Technical Improvements

### 10. Database Page Table Virtualization

**Description**: Render only visible rows for better performance

**Current State**: All 4,000+ foods rendered at once

**Enhancement**: Virtual scrolling to render ~50 visible items

**Benefits**:
- Faster initial render
- Better performance on low-end devices
- Smooth scrolling with large datasets

**Complexity**: Medium (1 day)
**Priority**: Low - current performance is acceptable

---

### 11. Stats Chart Lazy Loading

**Description**: Defer chart rendering until visible

**Current State**: Charts render on page load

**Enhancement**: Load charts on-demand when user navigates to view

**Benefits**:
- Faster page load
- Reduced initial bundle size

**Complexity**: Low (2-3 hours)
**Priority**: Low

---

### 12. Progressive Database Loading

**Description**: Split food database into chunks, load on-demand

**Current State**: Entire 2-5MB database loaded on app start

**Enhancement**:
- Core foods loaded immediately (~500KB)
- Additional foods loaded in background
- Search triggers loading of unloaded segments

**Benefits**:
- Much faster initial load
- Better perceived performance

**Trade-offs**:
- More complex loading logic
- Potential search delays for uncommon foods

**Complexity**: High (2-3 days)
**Priority**: Low - acceptable with current 3s load time

---

### 13. Enhanced Toast Notification System

**Description**: Adopt the more sophisticated toast system from my-pt-pwa

**Current State**:
- Single toast at a time (new toasts replace existing)
- Fixed 3-second duration
- No manual dismiss
- No icons
- Full background color

**Enhancement Features**:
- **Queue Support**: Multiple toasts can display simultaneously
- **Manual Dismiss**: Click toast or X button to close
- **Duplicate Prevention**: Same message won't show twice
- **Material Icons**: Visual indicators for each type (success, error, warning, info)
- **Better Styling**: Left border accent with surface background (instead of full solid color)
- **Keyboard Support**: Enter/Space to dismiss
- **Unique IDs**: Each toast tracked independently
- **Configurable Duration**: Can override default 3-second timeout per toast

**Implementation Notes**:
- Source: `https://github.com/NateEaton/my-pt-pwa/blob/main/src/lib/components/Toast.svelte`
- Create new `src/lib/stores/toast.ts` with queue logic
- Replace `Toast.svelte` component
- Keep `showToast()` wrapper for backward compatibility
- All 38 existing toast calls remain unchanged

**Benefits**:
- More professional appearance
- Better UX with manual dismiss
- Can show update notification + error simultaneously
- Improved accessibility (ARIA labels, keyboard support)
- Prevents duplicate message spam

**Complexity**: Low-Medium (2-3 hours)
**Priority**: Low - current system works, but enhancement would be nice

---

## Feature Requests (User-Submitted)

*This section will be populated with user feedback after v1.0 launch*

---

## Evaluation Criteria

When prioritizing backlog items, consider:

1. **User Impact**: Does it solve a real user pain point?
2. **Complexity**: How much development time required?
3. **Risk**: Potential for bugs or regressions?
4. **Dependencies**: Requires other features first?
5. **Maintenance**: Ongoing maintenance burden?

---

## Version Planning

### v1.1 (Post-Launch Polish)
- Enhanced nutrient selector (backlog #1)
- Multi-nutrient HTML docs (backlog #2)
- Bug fixes from user feedback
- Performance optimizations

### v1.2 (Feature Expansion)
- Meal planning (backlog #4)
- Recipe builder (backlog #5)
- Advanced sorting options (backlog #3)

### v2.0 (Major Features)
- Advanced analytics (backlog #7)
- Photo logging improvements (backlog #6)
- Multi-language support (backlog #8)

---

**Last Updated**: December 13, 2025
**Maintained By**: Nathan A. Eaton Jr.
