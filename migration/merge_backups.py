#!/usr/bin/env python3
"""
Merge two calcium tracker backup files to create a complete backup.

Use this BEFORE running the migration scripts when you need to:
- Combine backups with different date ranges
- Restore missing data from an older backup
- Merge historical data with current data

Output includes:
- All journal entries from both files (union, latest wins on conflicts)
- All custom foods from both files (deduplicated by name, latest wins)
- Serving preferences, favorites, settings from latest file
"""

import json
import sys
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
    print(f"Saved successfully!")

def merge_custom_foods(foods1, foods2):
    """
    Merge two lists of custom foods, avoiding duplicates.
    Uses food name as the deduplication key.
    If a food exists in both, prefer the version from foods2 (newer).
    """
    foods_by_name = {}

    # Add foods from first list
    for food in foods1:
        name = food.get('name', '')
        if name:
            foods_by_name[name] = food

    # Add/override with foods from second list (newer takes precedence)
    for food in foods2:
        name = food.get('name', '')
        if name:
            foods_by_name[name] = food

    # Return as list
    return list(foods_by_name.values())

def merge_journal_entries(entries1, entries2):
    """
    Merge two journal entry dictionaries.
    If a date exists in both, prefer entries2 (newer).
    """
    merged = dict(entries1)  # Start with all entries from first

    # Add/override with entries from second
    for date, entry in entries2.items():
        merged[date] = entry

    return merged

def main():
    # Parse command line arguments
    if len(sys.argv) != 4:
        print("Usage: python3 merge_backups.py <base-file> <latest-file> <output-file>")
        print("")
        print("Arguments:")
        print("  base-file    - Older backup file (e.g., with restored missing data)")
        print("  latest-file  - Current backup file (has latest preferences/favorites)")
        print("  output-file  - Output merged file path")
        print("")
        print("Example:")
        print("  python3 merge_backups.py \\")
        print("    calcium-tracker-backup-2025-11-10-updated.json \\")
        print("    calcium-tracker-backup-2025-11-19.json \\")
        print("    calcium-tracker-backup-2025-11-19-merged.json")
        sys.exit(1)

    base_file = sys.argv[1]
    latest_file = sys.argv[2]
    output_file = sys.argv[3]

    print("="*60)
    print("MERGING BACKUP FILES (PRE-MIGRATION)")
    print("="*60)
    print(f"\nBase file:   {base_file}")
    print(f"Latest file: {latest_file}")
    print(f"Output file: {output_file}")

    # Load both files
    base_data = load_json(base_file)
    latest_data = load_json(latest_file)

    print("\n" + "="*60)
    print("ANALYZING SOURCE FILES")
    print("="*60)

    print(f"\nBase file:")
    print(f"  Journal entries: {len(base_data.get('journalEntries', {}))}")
    print(f"  Custom foods: {len(base_data.get('customFoods', []))}")
    print(f"  Favorites: {len(base_data.get('favorites', []))}")
    print(f"  Serving preferences: {len(base_data.get('servingPreferences', {}))}")

    print(f"\nLatest file:")
    print(f"  Journal entries: {len(latest_data.get('journalEntries', {}))}")
    print(f"  Custom foods: {len(latest_data.get('customFoods', []))}")
    print(f"  Favorites: {len(latest_data.get('favorites', []))}")
    print(f"  Serving preferences: {len(latest_data.get('servingPreferences', {}))}")

    # Create merged data structure
    print("\n" + "="*60)
    print("MERGING DATA")
    print("="*60)

    merged_data = {}

    # Merge journal entries (union of both, latest wins on conflicts)
    print("\nMerging journal entries...")
    merged_data['journalEntries'] = merge_journal_entries(
        base_data.get('journalEntries', {}),
        latest_data.get('journalEntries', {})
    )
    print(f"  Result: {len(merged_data['journalEntries'])} entries")

    # Merge custom foods (deduplicate by name, latest wins)
    print("\nMerging custom foods...")
    merged_data['customFoods'] = merge_custom_foods(
        base_data.get('customFoods', []),
        latest_data.get('customFoods', [])
    )
    print(f"  Result: {len(merged_data['customFoods'])} custom foods")

    # List the custom foods for verification
    print("  Custom foods in merged file:")
    for food in sorted(merged_data['customFoods'], key=lambda f: f.get('name', '')):
        print(f"    - {food.get('name', 'Unknown')}")

    # Use latest data for favorites (she may have added/removed some)
    print("\nUsing favorites from latest file...")
    merged_data['favorites'] = latest_data.get('favorites', [])
    print(f"  Result: {len(merged_data['favorites'])} favorites")

    # Use latest data for serving preferences
    print("\nUsing serving preferences from latest file...")
    merged_data['servingPreferences'] = latest_data.get('servingPreferences', {})
    print(f"  Result: {len(merged_data['servingPreferences'])} preferences")

    # Use latest preferences (app settings)
    print("\nUsing preferences from latest file...")
    merged_data['preferences'] = latest_data.get('preferences', {})
    print(f"  Result: {merged_data['preferences']}")

    # Use latest hidden foods
    print("\nUsing hidden foods from latest file...")
    merged_data['hiddenFoods'] = latest_data.get('hiddenFoods', [])
    print(f"  Result: {len(merged_data['hiddenFoods'])} hidden foods")

    # Include metadata from latest
    print("\nUsing metadata from latest file...")
    merged_data['metadata'] = latest_data.get('metadata', {})
    if merged_data['metadata']:
        print(f"  App version: {merged_data['metadata'].get('appVersion', 'unknown')}")
        print(f"  Export date: {merged_data['metadata'].get('exportDate', 'unknown')}")

    # Save merged data
    print("\n" + "="*60)
    print("SAVING MERGED FILE")
    print("="*60)
    save_json(merged_data, output_file)

    # Summary
    print("\n" + "="*60)
    print("MERGE COMPLETE")
    print("="*60)
    print(f"\nOutput file: {output_file}")
    print(f"\nFinal counts:")
    print(f"  Journal entries: {len(merged_data['journalEntries'])}")
    print(f"  Custom foods: {len(merged_data['customFoods'])}")
    print(f"  Favorites: {len(merged_data['favorites'])}")
    print(f"  Serving preferences: {len(merged_data['servingPreferences'])}")
    print(f"  Hidden foods: {len(merged_data['hiddenFoods'])}")
    print(f"  Preferences: {merged_data['preferences']}")

    # Show date range
    if merged_data['journalEntries']:
        dates = sorted(merged_data['journalEntries'].keys())
        print(f"\nJournal date range: {dates[0]} to {dates[-1]}")

    print("\n" + "="*60)
    print("NEXT STEPS")
    print("="*60)
    print("1. Proceed with migration workflow (see README.md):")
    print("   - Step 1: ID Mapping (migrate-backup-enhanced.mjs)")
    print("   - Step 2: Multi-Nutrient Transform (migrate_to_nutrients.mjs)")
    print("")
    print(f"2. Start with: node migrate-backup-enhanced.mjs --old-backup {output_file} ...")
    print("3. Follow complete migration instructions in README.md")

if __name__ == '__main__':
    main()
