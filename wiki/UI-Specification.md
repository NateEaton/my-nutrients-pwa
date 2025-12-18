# My Nutrients - UI Specification

**Version**: 1.0.0
**Last Updated**: December 2025

---

## Overview

This document specifies the user interface for My Nutrients, including layouts, component behaviors, and user flows.

## Design Principles

1. **Senior-Friendly**: Large touch targets (≥44px), clear typography, high contrast
2. **Progressive Disclosure**: Hide complexity until needed
3. **Consistency**: Maintain patterns from My Calcium where possible
4. **Accessibility**: WCAG 2.1 AA compliance

---

## Component Specifications

### SummaryCard (Daily Overview)

**Purpose**: Show date and progress for selected nutrients

**Layout** (Mobile):
```
┌────────────────────────────────────┐
│  ← [Date: Dec 7, 2025] →   Today  │
├────────────────────────────────────┤
│  Protein        37g / 60g    62%   │
│  ████████░░░░░░░░                  │
│                                     │
│  Calcium      856mg / 1200mg  71%  │
│  ██████████░░░░░                   │
│                                     │
│  Fiber         18g / 25g     72%   │
│  ██████████░░░░░                   │
│                                     │
│  Vitamin D    12mcg / 20mcg  60%   │
│  ████████░░░░░░░░                  │
└────────────────────────────────────┘
```

**Interactions**:
- Swipe left/right on date to navigate days
- Tap "Today" to jump to current date
- Tap nutrient row to navigate to Nutrients page for that nutrient

---

### FoodEntry (Individual Food Card)

**Layout**:
```
┌────────────────────────────────────┐
│ Milk, whole                     [⋮] │
│ 1 cup                               │
│                                     │
│ 37g protein | 276mg calcium |       │
│ 0g fiber | 2.5mcg vitaminD          │
│                                     │
│ 8:30 AM                             │
└────────────────────────────────────┘
```

**[⋮] Menu**:
- Edit
- Delete
- Duplicate

**Compact Mode** (when >5 foods):
```
Milk, whole (1 cup)
37g | 276mg | 0g | 2.5mcg
```

---

### Add Food Modal

**Search Tab**:
```
┌────────────────────────────────────┐
│ Add Food                      [✕]  │
├────────────────────────────────────┤
│ [Search foods.....................] │
│                                     │
│ Results:                            │
│ ┌────────────────────────────────┐ │
│ │ Milk, whole                    │ │
│ │ 37g | 276mg | 0g | 2.5mcg      │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ Greek yogurt, plain, nonfat    │ │
│ │ 17g | 187mg | 0g | 0mcg        │ │
│ └────────────────────────────────┘ │
│                                     │
│ Tabs: [Search] [Custom] [Scan]     │
└────────────────────────────────────┘
```

**After Selection**:
```
┌────────────────────────────────────┐
│ Milk, whole                        │
├────────────────────────────────────┤
│ Serving: [1 cup ▼] Qty: [1.0]     │
│                                     │
│ Nutrients per serving:             │
│   Protein      37g                 │
│   Calcium      276mg               │
│   Fiber        0g                  │
│   Vitamin D    2.5mcg              │
│                                     │
│ Notes: [.........................]  │
│                                     │
│ [Cancel]              [Add Food]   │
└────────────────────────────────────┘
```

---

### Nutrient Settings Modal

**Layout**:
```
┌────────────────────────────────────┐
│ Manage Nutrients             [✕]  │
├────────────────────────────────────┤
│ Select up to 4 nutrients to        │
│ display in food cards:             │
│                                     │
│ ☑ Protein          60 g/day        │
│ ☑ Calcium         1200 mg/day      │
│ ☑ Fiber           25 g/day         │
│ ☑ Vitamin D       20 mcg/day       │
│ ☐ Magnesium       420 mg/day       │
│ ☐ Potassium       3400 mg/day      │
│ ☐ Iron            8 mg/day         │
│ ☐ Zinc            11 mg/day         │
│ ... (more nutrients)                │
│                                     │
│ [4/4 selected]                     │
│                                     │
│ [Set Goals] [Cancel]      [Save]   │
└────────────────────────────────────┘
```

**Set Goals Dialog**:
```
┌────────────────────────────────────┐
│ Nutrient Goals               [✕]  │
├────────────────────────────────────┤
│ Protein                             │
│ [60......] g/day                   │
│                                     │
│ Calcium                             │
│ [1200....] mg/day                  │
│                                     │
│ Fiber                               │
│ [25......] g/day                   │
│                                     │
│ Vitamin D                           │
│ [20......] mcg/day                 │
│                                     │
│ [Restore Defaults]        [Save]   │
└────────────────────────────────────┘
```

---

### Stats Page (Updated)

**Top Section**:
```
┌────────────────────────────────────┐
│ Statistics          [Calcium ▼]    │
│                                     │
│ View: [Weekly] Monthly Yearly      │
├────────────────────────────────────┤
```

**Chart** (same as current, just parameterized by nutrient)

**Nutrient Selector**:
```
Show stats for:
┌─────────────────────────────┐
│ ⭐ Protein                  │
│ ⭐ Calcium (current)        │
│ ⭐ Fiber                    │
│ ⭐ Vitamin D                │
│ ─────────────────────────   │
│ Other nutrients:            │
│   Magnesium                 │
│   Potassium                 │
│   ...                       │
└─────────────────────────────┘
```

---

## User Flows

### Flow 1: Add Food

1. Tap "+" button
2. Search for food or scan UPC
3. Select food from results
4. Adjust serving size if needed
5. See nutrients preview (4 selected nutrients)
6. Tap "Add Food"
7. Food appears in list with nutrients
8. Summary card updates totals

### Flow 2: Change Displayed Nutrients

1. Navigate to Settings
2. Tap "Manage Nutrients"
3. See list with checkboxes
4. Uncheck calcium, check magnesium
5. Tap "Save"
6. Return to main page
7. Food cards now show protein, magnesium, fiber, vitaminD
8. Summary card updated

### Flow 3: View Specific Nutrient

1. Navigate to Nutrients tab
2. See Calcium by default (first displayed nutrient)
3. Tap dropdown or swipe left
4. Select "Protein"
5. See protein progress ring, trend, top sources
6. Swipe left again
7. See Fiber stats

### Flow 4: Export Data

1. Navigate to Data page
2. Tap "Export CSV"
3. See file download with all nutrients in columns
4. Open in Excel/Sheets
5. Analyze trends, create charts

---

## Responsive Design

### Mobile (<768px)
- Single column layout
- Summary card: nutrients stacked vertically
- Food list: full width
- Modals: full screen

### Tablet (768px-1024px)
- Two column layout (list + summary)
- Modals: centered, max-width 600px

### Desktop (>1024px)
- Three column layout (nav + list + detail)
- Wider stats charts
- Side-by-side comparisons possible

---

## Accessibility

- **Keyboard Navigation**: All interactive elements reachable via Tab
- **Screen Readers**: ARIA labels for progress bars, charts
- **Color Contrast**: 4.5:1 minimum for text
- **Touch Targets**: ≥44px × 44px
- **Focus Indicators**: Visible outline on focused elements

---

## Themes

### Light Mode
- Background: #FFFFFF
- Surface: #F5F5F5
- Primary: #1976D2
- Text: #212121

### Dark Mode
- Background: #121212
- Surface: #1E1E1E
- Primary: #64B5F6
- Text: #E0E0E0

---

## Conclusion

This UI specification provides a complete reference for implementing the My Nutrients interface. Key points:

- Progressive disclosure (simple tracking, detailed analysis)
- Mobile-first design
- Clear visual hierarchy
- Accessible to seniors
- Consistent with My Calcium patterns where possible
