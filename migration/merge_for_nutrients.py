#!/usr/bin/env python3
"""
Merge validated 11-19 backup with latest 12-18 export for My Nutrients migration.

Strategy:
- Base: migrated-backup-2025-11-19.json (has stable appIds through 11-19)
- New: calcium-tracker-backup-2025-12-18.json (has new data 11-20 onwards)
- Output: calcium-nutrients-merged-2025-12-18.json (combined, ready for nutrient enhancement)
"""

import json
from datetime import datetime

def load_json(filepath):
    """Load and parse a JSON file."""
    print(f"Loading {filepath}...")
    with open(filepath, 'r') as f:
        return json.load(f)

def save_json(data, filepath):
    """Save data to a JSON file."""
    print(f"Saving to {filepath}...")
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"✅ Saved successfully!")

def merge_backups():
    """Merge the validated 11-19 backup with the 12-18 export."""

    print("="*70)
    print("MERGING BACKUPS FOR MY NUTRIENTS MIGRATION")
    print("="*70)

    # Load files
    base_file = 'migration/migrated-backup-2025-11-19.json'
    new_file = 'migration/calcium-tracker-backup-2025-12-18.json'
    output_file = 'migration/calcium-nutrients-merged-2025-12-18.json'

    base = load_json(base_file)
    new = load_json(new_file)

    print("\n" + "="*70)
    print("SOURCE FILES ANALYSIS")
    print("="*70)

    print(f"\n📦 BASE (11-19 migrated backup):")
    print(f"  Journal days: {len(base['journalEntries'])}")
    print(f"  Custom foods: {len(base['customFoods'])}")
    print(f"  Favorites: {len(base.get('favorites', []))}")
    print(f"  Date range: {min(base['journalEntries'].keys())} → {max(base['journalEntries'].keys())}")

    print(f"\n📦 NEW (12-18 export):")
    print(f"  Journal days: {len(new['journalEntries'])}")
    print(f"  Custom foods: {len(new['customFoods'])}")
    print(f"  Favorites: {len(new.get('favorites', []))}")
    print(f"  Date range: {min(new['journalEntries'].keys())} → {max(new['journalEntries'].keys())}")

    # Start with base (has stable appIds)
    merged = dict(base)

    print("\n" + "="*70)
    print("MERGING PROCESS")
    print("="*70)

    # 1. Merge journal entries - add new dates only
    print("\n1. JOURNAL ENTRIES:")
    cutoff_date = '2025-11-19'
    base_dates = set(base['journalEntries'].keys())
    new_dates = set(new['journalEntries'].keys())

    dates_to_add = [d for d in new_dates if d > cutoff_date]
    dates_to_add.sort()

    print(f"  Base has: {len(base_dates)} days through {cutoff_date}")
    print(f"  Adding: {len(dates_to_add)} new dates from 12-18 export")

    for date in dates_to_add:
        merged['journalEntries'][date] = new['journalEntries'][date]
        print(f"    ✓ Added {date}")

    # 2. Check for new custom foods
    print("\n2. CUSTOM FOODS:")
    base_food_names = {f['name'] for f in base['customFoods']}
    new_food_names = {f['name'] for f in new['customFoods']}

    new_foods = new_food_names - base_food_names

    if new_foods:
        print(f"  ⚠️  Found {len(new_foods)} NEW custom foods in 12-18 export:")

        # Get the lowest existing custom food ID (they're negative: -1, -2, -3, etc.)
        min_id = min(f['id'] for f in merged['customFoods'])
        next_id = min_id - 1  # Continue from lowest: -43 becomes -44

        for food_name in sorted(new_foods):
            # Find the food in new export
            food = next(f for f in new['customFoods'] if f['name'] == food_name)

            # Assign new negative ID
            food['id'] = next_id
            next_id -= 1  # Decrement to get more negative

            merged['customFoods'].append(food)
            print(f"    ✓ Added: {food_name} (ID: {food['id']})")
    else:
        print(f"  ✓ No new custom foods (same {len(base_food_names)} as base)")

    # 3. Update favorites, hidden foods, serving preferences from 12-18
    # (These use the NEW IDs from production, will be migrated later)
    print("\n3. OTHER PREFERENCES:")

    # Use the NEW export's favorites/hidden/serving prefs
    # The migration script will map these IDs to stable appIds
    merged['favorites'] = new.get('favorites', [])
    merged['hiddenFoods'] = new.get('hiddenFoods', [])
    merged['servingPreferences'] = new.get('servingPreferences', [])

    print(f"  ✓ Updated favorites: {len(merged['favorites'])}")
    print(f"  ✓ Updated hidden foods: {len(merged['hiddenFoods'])}")
    print(f"  ✓ Updated serving preferences: {len(merged['servingPreferences'])}")

    # 4. Keep base preferences (will be transformed to nutrient settings later)
    print("\n4. APP PREFERENCES:")
    print(f"  ✓ Keeping from base: {base['preferences']}")

    # 5. Update metadata
    print("\n5. METADATA:")
    merged['metadata'] = {
        'version': '2.1.0',
        'createdAt': datetime.now().isoformat(),
        'mergedFrom': {
            'base': base_file,
            'new': new_file
        },
        'baseDateRange': f"{min(base['journalEntries'].keys())} to {max(base['journalEntries'].keys())}",
        'newDatesAdded': len(dates_to_add),
        'totalDays': len(merged['journalEntries'])
    }
    print(f"  ✓ Created merge metadata")

    # Save merged file
    print("\n" + "="*70)
    print("SAVING MERGED FILE")
    print("="*70)
    save_json(merged, output_file)

    # Summary
    print("\n" + "="*70)
    print("MERGE COMPLETE")
    print("="*70)

    dates = sorted(merged['journalEntries'].keys())
    print(f"\n📊 FINAL COUNTS:")
    print(f"  Total journal days: {len(dates)}")
    print(f"  Date range: {dates[0]} → {dates[-1]}")
    print(f"  Custom foods: {len(merged['customFoods'])}")
    print(f"  Favorites: {len(merged['favorites'])}")
    print(f"  Hidden foods: {len(merged['hiddenFoods'])}")
    print(f"  Serving preferences: {len(merged['servingPreferences'])}")

    print(f"\n🎯 NEXT STEP:")
    print(f"  Run migration script to:")
    print(f"    1. Map all IDs to stable appIds")
    print(f"    2. Enhance journal entries with multi-nutrient data")
    print(f"    3. Transform settings for My Nutrients")
    print(f"\n  File ready: {output_file}")

if __name__ == '__main__':
    merge_backups()
