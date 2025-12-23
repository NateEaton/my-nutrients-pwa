# When you get user's latest backup:
cd migration

# Step 1: ID mapping
node migrate-backup-enhanced.mjs \
  [user-backup].json \
  ../src/lib/data/foodDatabaseData.js \
  merged-output.json

# Step 2: Multi-nutrient transform  
node migrate_to_nutrients.mjs \
  --merged-backup merged-output.json \
  --new-database ../src/lib/data/foodDatabaseData.js \
  --output nutrients-restore-PRODUCTION.json

# Step 3: User imports nutrients-restore-PRODUCTION.json
