#!/usr/bin/env python3
"""
Merge 11-19 base (stable appIds through 11/19) with
12-18 migrated (stable appIds for new data 11/20+).
"""

import json

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def save_json(data, filepath):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def merge_with_appids():
    print("="*70)
    print("MERGING WITH STABLE APPIDS")
    print("="*70)

    # Load files
    base = load_json('migration/migrated-backup-2025-11-19.json')
    new_migrated = load_json('migration/migrated-backup-2025-12-18-with-appids.json')

    print(f"\n📦 BASE (11-19 migrated):")
    print(f"  Journal days: {len(base['journalEntries'])}")
    print(f"  Favorites: {base.get('favorites', [])}")
    print(f"  Serving prefs: {len(base.get('servingPreferences', []))}")

    print(f"\n📦 NEW (12-18 migrated with appIds):")
    print(f"  Journal days: {len(new_migrated['journalEntries'])}")
    print(f"  Favorites: {new_migrated.get('favorites', [])}")
    print(f"  Serving prefs: {len(new_migrated.get('servingPreferences', []))}")

    # Start with base
    merged = dict(base)

    # Add NEW journal entries (after 11-19)
    print(f"\n📝 Adding new journal entries...")
    cutoff_date = '2025-11-19'
    added_count = 0

    for date in sorted(new_migrated['journalEntries'].keys()):
        if date > cutoff_date:
            merged['journalEntries'][date] = new_migrated['journalEntries'][date]
            added_count += 1
            print(f"  ✓ Added {date}")

    print(f"\nAdded {added_count} new journal days")

    # Use 12-18 migrated's favorites/hidden/serving prefs (they have stable appIds)
    print(f"\n📋 Updating preferences with stable appIds...")
    merged['favorites'] = new_migrated.get('favorites', [])
    merged['hiddenFoods'] = new_migrated.get('hiddenFoods', [])
    merged['servingPreferences'] = new_migrated.get('servingPreferences', [])

    print(f"  Favorites: {merged['favorites']}")
    print(f"  Hidden foods: {len(merged['hiddenFoods'])}")
    print(f"  Serving prefs: {len(merged['servingPreferences'])}")

    # Add new custom foods
    print(f"\n🍽️  Merging custom foods...")
    base_food_names = {f['name'] for f in merged['customFoods']}
    new_food_names = {f['name'] for f in new_migrated['customFoods']}

    new_foods = new_food_names - base_food_names

    if new_foods:
        min_id = min(f['id'] for f in merged['customFoods'])
        next_id = min_id - 1

        for food_name in sorted(new_foods):
            food = next(f for f in new_migrated['customFoods'] if f['name'] == food_name)
            food['id'] = next_id
            next_id -= 1
            merged['customFoods'].append(food)
            print(f"  ✓ Added: {food_name} (ID: {food['id']})")
    else:
        print(f"  No new custom foods")

    # Save
    output = 'migration/calcium-nutrients-merged-stable-appids.json'
    save_json(merged, output)

    print(f"\n✅ Merged file saved: {output}")
    print(f"\n📊 Final counts:")
    print(f"  Journal days: {len(merged['journalEntries'])}")
    print(f"  Custom foods: {len(merged['customFoods'])}")
    print(f"  Favorites: {len(merged['favorites'])}")
    print(f"  Hidden foods: {len(merged['hiddenFoods'])}")
    print(f"  Serving prefs: {len(merged['servingPreferences'])}")

if __name__ == '__main__':
    merge_with_appids()
