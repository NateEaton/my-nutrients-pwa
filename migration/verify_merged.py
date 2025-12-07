#!/usr/bin/env python3
"""Verify the merged file contains all expected data."""

import json

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

print("="*60)
print("VERIFICATION: Merged Backup File")
print("="*60)

merged = load_json('/mnt/projects/Ca-pwa-svelte/migration/calcium-tracker-backup-2025-11-19-merged.json')

# Check for specific dates we care about
expected_dates = [
    # Missing dates from Apple Health
    '2025-08-16', '2025-08-17', '2025-08-18', '2025-08-19',
    # Recent dates from 11-19 backup
    '2025-11-13', '2025-11-14', '2025-11-15', '2025-11-16',
    '2025-11-17', '2025-11-18', '2025-11-19'
]

print("\nChecking critical journal dates:")
all_present = True
for date in expected_dates:
    if date in merged['journalEntries']:
        print(f"  ✓ {date}")
    else:
        print(f"  ✗ {date} MISSING!")
        all_present = False

# Check for specific custom foods
expected_foods = [
    'Esti Yogurt Gr Nonfat Plain',
    'Esti Greek Yogurt Nonfat Plain',
    'Esti Greek Yogurt Plain nonfat',
    'Fudgesicle',
    'Risotto',
    'Egg, whole'  # From the base file
]

print("\nChecking critical custom foods:")
food_names = set(f.get('name', '') for f in merged['customFoods'])
all_foods_present = True
for food in expected_foods:
    if food in food_names:
        print(f"  ✓ {food}")
    else:
        print(f"  ✗ {food} MISSING!")
        all_foods_present = False

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"Total journal entries: {len(merged['journalEntries'])}")
print(f"Total custom foods: {len(merged['customFoods'])}")
print(f"Total favorites: {len(merged['favorites'])}")
print(f"Total serving preferences: {len(merged['servingPreferences'])}")

if all_present and all_foods_present:
    print("\n✅ ALL CRITICAL DATA VERIFIED - Ready for migration!")
else:
    print("\n⚠️  WARNING: Some expected data is missing!")

# Show all journal dates for sanity check
dates = sorted(merged['journalEntries'].keys())
print(f"\nDate range: {dates[0]} to {dates[-1]}")
print(f"Total days: {len(dates)}")
