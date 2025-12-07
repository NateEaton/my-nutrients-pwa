#!/usr/bin/env python3
"""Check what's in those August dates that appear in 11-12 but not 11-19"""

import json

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

# Load both files
migrated_1112 = load_json('/mnt/projects/Ca-pwa-svelte/migration/migrated-backup-2025-11-12-appended.json')
latest_1119 = load_json('/mnt/projects/Ca-pwa-svelte/migration/calcium-tracker-backup-2025-11-19.json')

august_dates = ['2025-08-16', '2025-08-17', '2025-08-18', '2025-08-19']

print("Checking August dates in 11-12 file (not in 11-19):")
print("="*60)

for date in august_dates:
    if date in migrated_1112['journalEntries']:
        entry = migrated_1112['journalEntries'][date]
        print(f"\n{date}:")
        print(f"  Type: {type(entry)}")
        if isinstance(entry, list):
            print(f"  Meals: {len(entry)}")
            for meal in entry:
                if isinstance(meal, dict):
                    print(f"    - {meal.get('name', 'Unknown')}: {len(meal.get('foods', []))} foods")
        elif isinstance(entry, dict):
            meals = entry.get('meals', [])
            print(f"  Meals: {len(meals)}")
            for meal in meals:
                print(f"    - {meal.get('name', 'Unknown')}: {len(meal.get('foods', []))} foods")

print("\n" + "="*60)
print("Checking if these dates exist in 11-19 file:")
for date in august_dates:
    if date in latest_1119['journalEntries']:
        print(f"  {date}: EXISTS in 11-19")
    else:
        print(f"  {date}: NOT in 11-19")
