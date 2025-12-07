#!/usr/bin/env python3
"""Verify the final migrated file contains all expected data."""

import json

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

print("="*60)
print("FINAL MIGRATION VERIFICATION")
print("="*60)

# Load files
original_latest = load_json('/mnt/projects/Ca-pwa-svelte/migration/calcium-tracker-backup-2025-11-19.json')
merged = load_json('/mnt/projects/Ca-pwa-svelte/migration/calcium-tracker-backup-2025-11-19-merged.json')
migrated = load_json('/mnt/projects/Ca-pwa-svelte/migration/migrated-backup-2025-11-19.json')

print("\n1. SOURCE FILES COMPARISON")
print("-" * 60)
print(f"Original 11-19 export:    {len(original_latest['journalEntries'])} journal days, {len(original_latest['customFoods'])} custom foods")
print(f"Merged backup (pre-mig):  {len(merged['journalEntries'])} journal days, {len(merged['customFoods'])} custom foods")
print(f"Migrated backup (final):  {len(migrated['journalEntries'])} journal days, {len(migrated['customFoods'])} custom foods")

# Critical dates check
critical_dates = [
    # Apple Health recovered data
    '2025-08-16', '2025-08-17', '2025-08-18', '2025-08-19',
    # Recent entries from 11-19
    '2025-11-13', '2025-11-14', '2025-11-15', '2025-11-16',
    '2025-11-17', '2025-11-18', '2025-11-19'
]

print("\n2. CRITICAL JOURNAL DATES")
print("-" * 60)
all_dates_present = True
for date in critical_dates:
    status = "✓" if date in migrated['journalEntries'] else "✗ MISSING"
    if date not in migrated['journalEntries']:
        all_dates_present = False
    print(f"  {status} {date}")

# Custom foods check
critical_foods = [
    'Esti Yogurt Gr Nonfat Plain',
    'Esti Greek Yogurt Nonfat Plain',
    'Esti Greek Yogurt Plain nonfat',
    'Fudgesicle',
    'Risotto',
]

print("\n3. CRITICAL CUSTOM FOODS (new since 11-12)")
print("-" * 60)
migrated_food_names = set(f.get('name', '') for f in migrated['customFoods'])
all_foods_present = True
for food in critical_foods:
    status = "✓" if food in migrated_food_names else "✗ MISSING"
    if food not in migrated_food_names:
        all_foods_present = False
    print(f"  {status} {food}")

# Check for new appId structure
print("\n4. DATA STRUCTURE VERIFICATION")
print("-" * 60)

# Check if custom foods have negative appIds
sample_custom = migrated['customFoods'][0] if migrated['customFoods'] else None
if sample_custom:
    print(f"  Custom food appId: {sample_custom.get('appId', 'N/A')} (should be negative)")

# Check a journal entry
sample_date = '2025-11-19'
if sample_date in migrated['journalEntries']:
    entry = migrated['journalEntries'][sample_date]
    if isinstance(entry, list) and len(entry) > 0:
        sample_meal = entry[0]
        if isinstance(sample_meal, dict) and 'foods' in sample_meal and len(sample_meal['foods']) > 0:
            sample_food = sample_meal['foods'][0]
            print(f"  Sample journal food appId: {sample_food.get('appId', 'N/A')} (should use new appId)")

# Count stats
dates = sorted(migrated['journalEntries'].keys())
print("\n5. FINAL STATISTICS")
print("-" * 60)
print(f"  Journal entries: {len(dates)} days")
print(f"  Date range: {dates[0]} to {dates[-1]}")
print(f"  Custom foods: {len(migrated['customFoods'])}")
print(f"  Favorites: {len(migrated.get('favorites', []))}")
print(f"  Serving preferences: {len(migrated.get('servingPreferences', {}))}")

# Final verdict
print("\n6. FINAL VERDICT")
print("=" * 60)

if all_dates_present and all_foods_present:
    print("✅ ALL CRITICAL DATA VERIFIED!")
    print("✅ Ready for deployment to production!")
    print("\nNext steps:")
    print("  1. Import migrated-backup-2025-11-19.json into dev phone")
    print("  2. Sanity check against wife's phone data")
    print("  3. Wipe app data from wife's phone")
    print("  4. Deploy new version to production")
    print("  5. Import on wife's phone")
    print("  6. Set up sync between phone and iPad")
else:
    print("⚠️  WARNING: Some critical data is missing!")
    if not all_dates_present:
        print("   - Missing critical journal dates")
    if not all_foods_present:
        print("   - Missing critical custom foods")
