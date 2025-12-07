#!/usr/bin/env python3
"""
Analyze backup files for migration to ensure data completeness.
"""

import json
from datetime import datetime
from collections import defaultdict

def load_json(filepath):
    """Load and parse a JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def analyze_backup(data, label):
    """Analyze a backup file and return key metrics."""
    print(f"\n{'='*60}")
    print(f"ANALYSIS: {label}")
    print(f"{'='*60}")

    # Journal entries
    journal_dates = set()
    if 'journalEntries' in data:
        journal_dates = set(data['journalEntries'].keys())
        print(f"Journal entries: {len(journal_dates)} days")
        if journal_dates:
            sorted_dates = sorted(journal_dates)
            print(f"  Date range: {sorted_dates[0]} to {sorted_dates[-1]}")

    # Custom foods
    custom_foods = []
    if 'customFoods' in data:
        custom_foods = data['customFoods']
        print(f"Custom foods: {len(custom_foods)}")
        if custom_foods:
            for food in custom_foods[:5]:  # Show first 5
                print(f"  - {food.get('name', 'Unknown')}")
            if len(custom_foods) > 5:
                print(f"  ... and {len(custom_foods) - 5} more")

    # Favorites
    favorites = []
    if 'favorites' in data:
        favorites = data['favorites']
        print(f"Favorites: {len(favorites)}")

    # Serving preferences
    serving_prefs = {}
    if 'servingPreferences' in data:
        serving_prefs = data['servingPreferences']
        print(f"Serving preferences: {len(serving_prefs)} items")

    # Settings
    if 'settings' in data:
        print(f"Settings: {len(data['settings'])} items")

    return {
        'label': label,
        'journal_dates': journal_dates,
        'custom_foods': custom_foods,
        'favorites': favorites,
        'serving_preferences': serving_prefs
    }

def compare_backups(backup1, backup2, label1, label2):
    """Compare two backup analyses."""
    print(f"\n{'='*60}")
    print(f"COMPARISON: {label1} vs {label2}")
    print(f"{'='*60}")

    # Journal entries comparison
    dates1 = backup1['journal_dates']
    dates2 = backup2['journal_dates']

    only_in_1 = dates1 - dates2
    only_in_2 = dates2 - dates1

    print(f"\nJournal Entries:")
    print(f"  In {label1} only: {len(only_in_1)} days")
    if only_in_1:
        sorted_dates = sorted(only_in_1)
        print(f"    Dates: {sorted_dates[:10]}")
        if len(sorted_dates) > 10:
            print(f"    ... and {len(sorted_dates) - 10} more")

    print(f"  In {label2} only: {len(only_in_2)} days")
    if only_in_2:
        sorted_dates = sorted(only_in_2)
        print(f"    Dates: {sorted_dates[:10]}")
        if len(sorted_dates) > 10:
            print(f"    ... and {len(sorted_dates) - 10} more")

    # Custom foods comparison
    foods1_names = set(f.get('name', '') for f in backup1['custom_foods'])
    foods2_names = set(f.get('name', '') for f in backup2['custom_foods'])

    only_in_1_foods = foods1_names - foods2_names
    only_in_2_foods = foods2_names - foods1_names

    print(f"\nCustom Foods:")
    print(f"  In {label1} only: {len(only_in_1_foods)} foods")
    if only_in_1_foods:
        for food in list(only_in_1_foods)[:10]:
            print(f"    - {food}")
        if len(only_in_1_foods) > 10:
            print(f"    ... and {len(only_in_1_foods) - 10} more")

    print(f"  In {label2} only: {len(only_in_2_foods)} foods")
    if only_in_2_foods:
        for food in list(only_in_2_foods)[:10]:
            print(f"    - {food}")
        if len(only_in_2_foods) > 10:
            print(f"    ... and {len(only_in_2_foods) - 10} more")

    # Favorites comparison
    fav1 = set(f.get('id', '') if isinstance(f, dict) else str(f) for f in backup1['favorites'])
    fav2 = set(f.get('id', '') if isinstance(f, dict) else str(f) for f in backup2['favorites'])

    print(f"\nFavorites:")
    print(f"  In {label1} only: {len(fav1 - fav2)} items")
    print(f"  In {label2} only: {len(fav2 - fav1)} items")

def main():
    files = {
        '11-09 Original': '/mnt/projects/Ca-pwa-svelte/migration/calcium-tracker-backup-2025-11-09.json',
        '11-10 Updated': '/mnt/projects/Ca-pwa-svelte/migration/calcium-tracker-backup-2025-11-10-updated-with-missing-data.json',
        '11-10 Migrated': '/mnt/projects/Ca-pwa-svelte/migration/migrated-backup-2025-11-10.json',
        '11-12 Appended': '/mnt/projects/Ca-pwa-svelte/migration/migrated-backup-2025-11-12-appended.json',
        '11-19 Latest': '/mnt/projects/Ca-pwa-svelte/migration/calcium-tracker-backup-2025-11-19.json'
    }

    # Load and analyze all files
    analyses = {}
    for label, filepath in files.items():
        try:
            data = load_json(filepath)
            analyses[label] = analyze_backup(data, label)
        except Exception as e:
            print(f"Error loading {label}: {e}")

    # Key comparisons
    print("\n" + "="*60)
    print("KEY COMPARISONS")
    print("="*60)

    # Compare latest original export with latest migrated
    if '11-19 Latest' in analyses and '11-12 Appended' in analyses:
        compare_backups(analyses['11-19 Latest'], analyses['11-12 Appended'],
                       '11-19 Latest', '11-12 Appended (current target)')

    # Compare 11-10 versions
    if '11-10 Updated' in analyses and '11-10 Migrated' in analyses:
        compare_backups(analyses['11-10 Updated'], analyses['11-10 Migrated'],
                       '11-10 Updated', '11-10 Migrated')

    # Summary recommendations
    print("\n" + "="*60)
    print("RECOMMENDATIONS")
    print("="*60)

    if '11-19 Latest' in analyses and '11-12 Appended' in analyses:
        latest = analyses['11-19 Latest']
        current_target = analyses['11-12 Appended']

        missing_dates = latest['journal_dates'] - current_target['journal_dates']
        missing_foods = set(f.get('name', '') for f in latest['custom_foods']) - \
                       set(f.get('name', '') for f in current_target['custom_foods'])

        print(f"\nMissing from target migration file (11-12 Appended):")
        print(f"  - {len(missing_dates)} journal entry days")
        print(f"  - {len(missing_foods)} custom foods")

        if missing_dates or missing_foods:
            print("\n⚠️  ACTION REQUIRED:")
            if missing_dates:
                print(f"  1. Copy {len(missing_dates)} missing journal entries from 11-19 to migration target")
            if missing_foods:
                print(f"  2. CRITICAL: {len(missing_foods)} new custom foods need to be included!")
                print("     These custom foods exist in the latest backup but not in the migration target:")
                for food in list(missing_foods)[:10]:
                    print(f"       - {food}")
                if len(missing_foods) > 10:
                    print(f"       ... and {len(missing_foods) - 10} more")
        else:
            print("\n✓ No missing data detected! Migration target appears complete.")

if __name__ == '__main__':
    main()
