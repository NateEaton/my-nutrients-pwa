#!/usr/bin/env python3
"""
Comprehensive validation for My Nutrients migration.
Validates the nutrients-restore-2025-12-18.json file is ready for deployment.
"""

import json
from collections import Counter

def load_json(filepath):
    """Load and parse a JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def validate_migration():
    """Validate the My Nutrients restore file."""

    print("="*70)
    print("MY NUTRIENTS MIGRATION VALIDATION")
    print("="*70)

    # Load files
    restore_file = 'migration/nutrients-restore-2025-12-18.json'
    merged_file = 'migration/calcium-nutrients-merged-2025-12-18.json'

    restore = load_json(restore_file)
    merged = load_json(merged_file)

    all_checks_passed = True
    warnings = []

    # 1. Journal entry count
    print("\n1. JOURNAL ENTRY COUNT")
    merged_days = len(merged['journalEntries'])
    restore_days = len(restore['journalEntries'])

    if restore_days == merged_days:
        print(f"  ✓ {restore_days} days preserved")
    else:
        print(f"  ✗ MISMATCH: merged={merged_days}, restore={restore_days}")
        all_checks_passed = False

    # 2. Date range
    print("\n2. DATE RANGE")
    dates = sorted(restore['journalEntries'].keys())
    print(f"  Range: {dates[0]} → {dates[-1]}")
    print(f"  Total days: {len(dates)}")

    # Check for critical dates
    critical_dates = [
        ('2025-08-16', 'Apple Health recovery start'),
        ('2025-11-19', 'Last validated from 11-19 backup'),
        ('2025-12-16', 'Most recent entry'),
    ]

    for date, description in critical_dates:
        if date in restore['journalEntries']:
            print(f"  ✓ {date}: {description}")
        else:
            print(f"  ✗ Missing: {date} ({description})")
            all_checks_passed = False

    # 3. Multi-nutrient enhancement
    print("\n3. MULTI-NUTRIENT ENHANCEMENT")

    total_entries = 0
    db_entries = 0
    custom_entries = 0
    nutrient_counts = Counter()
    multi_nutrient_entries = 0

    for date_entries in restore['journalEntries'].values():
        for entry in date_entries:
            total_entries += 1

            if entry.get('isCustom'):
                custom_entries += 1
            else:
                db_entries += 1

            nutrients = entry.get('nutrients', {})
            if len(nutrients) > 1:  # More than just calcium
                multi_nutrient_entries += 1

            for nutrient in nutrients.keys():
                nutrient_counts[nutrient] += 1

    print(f"  Total entries: {total_entries}")
    print(f"  Database food entries: {db_entries}")
    print(f"  Custom food entries: {custom_entries}")
    print(f"  Multi-nutrient entries: {multi_nutrient_entries}")

    if multi_nutrient_entries > 0:
        percentage = round((multi_nutrient_entries / total_entries) * 100)
        print(f"  ✓ {percentage}% of entries have multi-nutrient data")

        if percentage < 20:
            warnings.append(f"Only {percentage}% of entries have multi-nutrients (expected 25-30%)")
    else:
        print(f"  ✗ NO multi-nutrient entries found!")
        all_checks_passed = False

    # Print top nutrients
    print(f"\n  Top nutrients by coverage:")
    for nutrient, count in nutrient_counts.most_common(10):
        percentage = round((count / total_entries) * 100)
        print(f"    {nutrient}: {count}/{total_entries} ({percentage}%)")

    # 4. Custom foods
    print("\n4. CUSTOM FOODS")
    merged_foods = len(merged.get('customFoods', []))
    restore_foods = len(restore.get('customFoods', []))

    if restore_foods == merged_foods:
        print(f"  ✓ {restore_foods} custom foods preserved")
    else:
        print(f"  ✗ MISMATCH: merged={merged_foods}, restore={restore_foods}")
        all_checks_passed = False

    # Check for specific important custom foods
    restore_food_names = {f['name'] for f in restore['customFoods']}
    important_foods = [
        'Calcium Supplement',
        'Mootopia Fat Free Milk',
        'Ovaltine w/Mootopia Fat Free Milk',
    ]

    for food_name in important_foods:
        if food_name in restore_food_names:
            print(f"  ✓ '{food_name}' present")
        else:
            print(f"  ⚠️  '{food_name}' missing")
            warnings.append(f"Important custom food missing: {food_name}")

    # 5. Settings migration
    print("\n5. SETTINGS MIGRATION")
    prefs = restore.get('preferences', {})

    required_fields = ['nutrientGoals', 'displayedNutrients', 'theme']
    for field in required_fields:
        if field in prefs:
            print(f"  ✓ {field}: {prefs[field]}")
        else:
            print(f"  ✗ Missing: {field}")
            all_checks_passed = False

    # Check nutrient goals
    goals = prefs.get('nutrientGoals', {})
    if 'calcium' in goals:
        if goals['calcium'] == 1500:
            print(f"  ✓ Calcium goal preserved: {goals['calcium']}mg")
        else:
            print(f"  ⚠️  Calcium goal changed: {goals['calcium']}mg (was 1500mg)")
            warnings.append(f"Calcium goal changed to {goals['calcium']}mg")
    else:
        print(f"  ✗ Missing calcium goal")
        all_checks_passed = False

    # Check displayed nutrients
    displayed = prefs.get('displayedNutrients', [])
    expected_displayed = ['protein', 'calcium', 'fiber', 'vitaminD']

    if displayed == expected_displayed:
        print(f"  ✓ Default displayed nutrients set correctly")
    else:
        print(f"  ⚠️  Displayed nutrients: {displayed}")
        print(f"     Expected: {expected_displayed}")

    # 6. Favorites & serving preferences
    print("\n6. FAVORITES & SERVING PREFERENCES")
    print(f"  Favorites: {len(restore.get('favorites', []))}")
    print(f"  Serving preferences: {len(restore.get('servingPreferences', []))}")
    print(f"  Hidden foods: {len(restore.get('hiddenFoods', []))}")

    # 7. Metadata
    print("\n7. METADATA")
    metadata = restore.get('metadata', {})
    print(f"  App: {metadata.get('appName')}")
    print(f"  Version: {metadata.get('version')}")
    print(f"  Migrated from: {metadata.get('migratedFrom')}")
    print(f"  Migration date: {metadata.get('migrationDate')}")

    if metadata.get('appName') == 'My Nutrients PWA':
        print(f"  ✓ Correct app name")
    else:
        print(f"  ⚠️  App name: {metadata.get('appName')}")

    if metadata.get('version') == '2.0.0':
        print(f"  ✓ Correct version")
    else:
        print(f"  ⚠️  Version: {metadata.get('version')}")

    # 8. Sample data verification
    print("\n8. SAMPLE DATA VERIFICATION")

    # Pick a recent date and verify entries
    sample_date = dates[-1]
    sample_entries = restore['journalEntries'][sample_date]

    print(f"  Sample date: {sample_date}")
    print(f"  Entries: {len(sample_entries)}")

    # Find first database food entry
    db_entry = next((e for e in sample_entries if not e.get('isCustom')), None)
    custom_entry = next((e for e in sample_entries if e.get('isCustom')), None)

    if db_entry:
        nutrients = db_entry.get('nutrients', {})
        print(f"\n  Database food sample:")
        print(f"    Name: {db_entry['name']}")
        print(f"    Nutrient count: {len(nutrients)}")

        if len(nutrients) > 5:
            print(f"    ✓ Has multiple nutrients")
            sample_nutrients = list(nutrients.items())[:5]
            for nutrient, value in sample_nutrients:
                print(f"      {nutrient}: {value}")
        else:
            print(f"    ⚠️  Only {len(nutrients)} nutrient(s)")

    if custom_entry:
        nutrients = custom_entry.get('nutrients', {})
        print(f"\n  Custom food sample:")
        print(f"    Name: {custom_entry['name']}")
        print(f"    Nutrient count: {len(nutrients)}")

        if 'calcium' in nutrients and len(nutrients) == 1:
            print(f"    ✓ Calcium-only as expected: {nutrients['calcium']}mg")
        else:
            print(f"    ⚠️  Unexpected nutrients: {list(nutrients.keys())}")

    # Final verdict
    print("\n" + "="*70)
    print("VALIDATION RESULT")
    print("="*70)

    if warnings:
        print("\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  - {warning}")

    if all_checks_passed:
        print("\n✅ ALL CHECKS PASSED")
        print("✅ Ready for import into My Nutrients PWA")
        print("\n📋 NEXT STEPS:")
        print("  1. Import restore file into dev environment for testing")
        print("  2. Verify journal entries display correctly")
        print("  3. Check multi-nutrient summary calculations")
        print("  4. Test adding new entries")
        print("  5. Deploy to production when validated")
    else:
        print("\n❌ SOME CHECKS FAILED - Review issues above")

    return all_checks_passed

if __name__ == '__main__':
    try:
        success = validate_migration()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Validation error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
