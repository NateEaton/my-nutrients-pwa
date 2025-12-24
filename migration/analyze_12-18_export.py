#!/usr/bin/env python3
"""Quick analysis of the 12-18 backup export."""

import json

def analyze_export():
    print("="*70)
    print("ANALYZING 12-18 EXPORT")
    print("="*70)

    with open('migration/calcium-tracker-backup-2025-12-18.json') as f:
        data = json.load(f)

    # Basic stats
    print("\n📊 BASIC STATISTICS:")
    print(f"  Metadata version: {data['metadata']['version']}")
    print(f"  Build ID: {data['metadata']['buildId']}")
    print(f"  Export date: {data['metadata']['createdAt']}")

    # Journal entries
    journal_dates = sorted(data['journalEntries'].keys())
    print(f"\n📅 JOURNAL ENTRIES:")
    print(f"  Total days: {len(journal_dates)}")
    print(f"  Date range: {journal_dates[0]} → {journal_dates[-1]}")

    # Custom foods
    print(f"\n🍽️  CUSTOM FOODS:")
    print(f"  Total: {len(data['customFoods'])}")

    # Check for dates after 11-19 (expected new data)
    new_dates = [d for d in journal_dates if d > '2025-11-19']
    print(f"\n🆕 NEW DATES (after 2025-11-19):")
    print(f"  Count: {len(new_dates)}")
    if new_dates:
        print(f"  First new: {new_dates[0]}")
        print(f"  Last new: {new_dates[-1]}")
        print(f"  Dates: {', '.join(new_dates[:10])}")
        if len(new_dates) > 10:
            print(f"  ... and {len(new_dates) - 10} more")

    # Check for dates that should already be in 11-19 backup
    overlap_dates = [d for d in journal_dates if d <= '2025-11-19']
    print(f"\n🔄 OVERLAP WITH 11-19 BACKUP:")
    print(f"  Count: {len(overlap_dates)}")
    print(f"  Range: {overlap_dates[0]} → {overlap_dates[-1]}")

    # Other data
    print(f"\n📋 OTHER DATA:")
    print(f"  Favorites: {len(data.get('favorites', []))}")
    print(f"  Hidden foods: {len(data.get('hiddenFoods', []))}")
    print(f"  Serving preferences: {len(data.get('servingPreferences', []))}")

    # Preferences
    print(f"\n⚙️  PREFERENCES:")
    prefs = data.get('preferences', {})
    for key, value in prefs.items():
        print(f"  {key}: {value}")

    print("\n" + "="*70)
    print("VALIDATION")
    print("="*70)

    # Check structure
    checks_passed = True

    if len(new_dates) == 0:
        print("⚠️  WARNING: No new dates found after 2025-11-19!")
        checks_passed = False
    else:
        print(f"✓ Found {len(new_dates)} new dates")

    if len(data['customFoods']) < 43:
        print(f"⚠️  WARNING: Only {len(data['customFoods'])} custom foods (expected 43+)")
        checks_passed = False
    else:
        print(f"✓ {len(data['customFoods'])} custom foods present")

    if checks_passed:
        print("\n✅ Export looks good - ready for merge")
    else:
        print("\n⚠️  Some validation issues - review above")

if __name__ == '__main__':
    analyze_export()
