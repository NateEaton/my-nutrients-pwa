# My Nutrients - Future Enhancements

**Version**: 1.0
**Date**: December 17, 2025
**Status**: Post v1.0 Release

---

## Overview

This document tracks feature ideas and enhancements deferred from the v1.0 release.

---

## Planned Enhancements

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

---

### 2. Meal Planning

**Description**: Pre-plan meals for future days

**Features**:
- Create meal templates
- Copy meals to journal
- Recurring meal patterns
- Meal categories (breakfast, lunch, dinner, snacks)

---

### 3. Recipe Builder

**Description**: Create recipes with automatic nutrient totals

**Features**:
- Add multiple ingredients
- Calculate total nutrients per serving
- Save and reuse recipes
- Export/share recipes

---

### 4. Nutrition Label Scanning

**Description**: Scan nutrition labels to quickly add foods

**Potential Approaches**:
- **Option A: Traditional OCR**: Use OCR service (e.g., OCR.space) to extract text from nutrition label photos, then parse the text for nutrient values
- **Option B: Cloud AI Vision**: Use vision-capable AI models (e.g., Cloudflare Workers AI) to directly understand nutrition labels and extract structured nutrient data

**Features**:
- Camera integration for capturing nutrition label photos
- Automatic nutrient extraction
- Manual correction/editing of extracted values
- Save as custom food entry

---

### 5. Advanced Analytics

**Description**: Nutrient correlations, trends, predictions

**Features**:
- Identify nutrient co-occurrence patterns
- Predict nutrient intake based on time of day
- Suggest foods to meet goals
- Weekly/monthly trend analysis

---

### 6. Multi-Language Support

**Description**: i18n support for global users

**Features**:
- Translation system
- Locale-specific date/number formats
- RTL language support
- Food database translations

---

### 7. Health App Integration

**Description**: Sync with Apple Health, Google Fit, etc.

**Features**:
- Export data to health platforms
- Import activity data
- Two-way synchronization

---

## Technical Improvements

### 8. Database Page Table Virtualization

**Description**: Render only visible rows for better performance

**Current State**: All 4,000+ foods rendered at once

**Enhancement**: Virtual scrolling to render ~50 visible items

**Benefits**:
- Faster initial render
- Better performance on low-end devices
- Smooth scrolling with large datasets

---

### 9. Stats Chart Lazy Loading

**Description**: Defer chart rendering until visible

**Current State**: Charts render on page load

**Enhancement**: Load charts on-demand when user navigates to view

**Benefits**:
- Faster page load
- Reduced initial bundle size

---

### 10. Progressive Database Loading

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

---

## Feature Requests

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

**Last Updated**: December 17, 2025
**Maintained By**: Nathan A. Eaton Jr.
