#!/bin/bash

# My Nutrients PWA - Complete Data Pipeline Runner
# Runs the full pipeline from USDA JSON files to optimized app database

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}My Nutrients PWA Data Pipeline${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "  Please install Node.js 14 or higher"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo ""

# Find input files
FOUNDATION_JSON=$(ls FoodData_Central_foundation_food_json_*.json 2>/dev/null | head -1)
SR_LEGACY_JSON=$(ls FoodData_Central_sr_legacy_food_json_*.json 2>/dev/null | head -1)

# Check if data files exist
if [ ! -f "$FOUNDATION_JSON" ] || [ ! -f "$SR_LEGACY_JSON" ]; then
    echo -e "${YELLOW}⚠️  USDA data files not found${NC}"
    echo ""
    echo "Expected files:"
    echo "  - FoodData_Central_foundation_food_json_*.json"
    echo "  - FoodData_Central_sr_legacy_food_json_*.json"
    echo ""
    echo "Please run: ./download-usda-data.sh"
    echo "Or manually download from: https://fdc.nal.usda.gov/download-datasets.html"
    exit 1
fi

echo -e "${GREEN}✓ Data files found:${NC}"
echo "  Foundation: $FOUNDATION_JSON"
echo "  SR Legacy:  $SR_LEGACY_JSON"
echo ""

# Pipeline configuration
KEEP_LIST="keep-list.txt"
EXCLUDE_LIST="exclude-list.txt"
MASTER_KEY_MAP="master-key-map.json"

# Output paths
OUTPUT_DIR="../src/lib/data"
COMBINED_DATA="combined-nutrient-data.json"
MERGED_DATA="merged-nutrient-data.json"
PORTIONED_DATA="portioned-nutrient-data.json"
MASTERED_DATA="mastered-nutrient-data.json"
CURATED_DATA="curated-nutrients-abridged.json"
FINAL_OUTPUT="$OUTPUT_DIR/foodDatabaseData.js"
PROVENANCE_DIR="../static/data/provenance"

# Check for required files
if [ ! -f "$KEEP_LIST" ]; then
    echo -e "${YELLOW}⚠️  Keep list not found ($KEEP_LIST)${NC}"
    echo "   Creating empty keep list..."
    touch "$KEEP_LIST"
fi

if [ ! -f "$EXCLUDE_LIST" ]; then
    echo -e "${YELLOW}⚠️  Exclude list not found ($EXCLUDE_LIST)${NC}"
    echo "   Creating empty exclude list..."
    touch "$EXCLUDE_LIST"
fi

echo -e "${BLUE}Starting pipeline...${NC}"
echo ""

# Step 1: Process JSON files (extract nutrients from USDA data)
echo -e "${BLUE}[1/7] Processing USDA JSON files...${NC}"
node json-data-processor.cjs \
  --foundation "$FOUNDATION_JSON" \
  --sr-legacy "$SR_LEGACY_JSON" \
  --output combined-nutrient-data

if [ ! -f "$COMBINED_DATA" ]; then
    echo -e "${RED}✗ Step 1 failed: $COMBINED_DATA not created${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Step 1 complete: $COMBINED_DATA${NC}"
echo ""

# Step 2: Merge Foundation & SR Legacy (NEW STEP)
echo -e "${BLUE}[2/7] Merging Foundation & SR Legacy data...${NC}"
node merge-foundation-sr-legacy.cjs \
  "$COMBINED_DATA" \
  "$MERGED_DATA"

if [ ! -f "$MERGED_DATA" ]; then
    echo -e "${RED}✗ Step 2 failed: $MERGED_DATA not created${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Step 2 complete: $MERGED_DATA${NC}"
echo ""

# Step 3: Synthesize portions (NEW STEP)
echo -e "${BLUE}[3/7] Synthesizing RACC-based portions...${NC}"
node synthesize-portions.cjs \
  "$MERGED_DATA" \
  "$PORTIONED_DATA"

if [ ! -f "$PORTIONED_DATA" ]; then
    echo -e "${RED}✗ Step 3 failed: $PORTIONED_DATA not created${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Step 3 complete: $PORTIONED_DATA${NC}"
echo ""

# Step 4: Assign stable IDs
echo -e "${BLUE}[4/7] Assigning stable appIds...${NC}"
node master-key-assigner-json.cjs \
  --input "$PORTIONED_DATA" \
  --map "$MASTER_KEY_MAP" \
  --output "$MASTERED_DATA"

if [ ! -f "$MASTERED_DATA" ]; then
    echo -e "${RED}✗ Step 4 failed: $MASTERED_DATA not created${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Step 4 complete: $MASTERED_DATA${NC}"
echo ""

# Step 5: Curate foods (filter, deduplicate, abridge)
echo -e "${BLUE}[5/7] Curating food database...${NC}"
node food-curator-nutrients.cjs \
  "$MASTERED_DATA" \
  curated-nutrients \
  --keep-list "$KEEP_LIST" \
  --exclude-list "$EXCLUDE_LIST"

if [ ! -f "$CURATED_DATA" ]; then
    echo -e "${RED}✗ Step 5 failed: $CURATED_DATA not created${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Step 5 complete: $CURATED_DATA${NC}"
echo ""

# Step 6: Generate app module
echo -e "${BLUE}[6/7] Generating optimized app module...${NC}"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

node data-module-generator-nutrients.cjs \
  "$CURATED_DATA" \
  "$FINAL_OUTPUT" \
  --module --minify --minimal

if [ ! -f "$FINAL_OUTPUT" ]; then
    echo -e "${RED}✗ Step 6 failed: $FINAL_OUTPUT not created${NC}"
    exit 1
fi

FILE_SIZE=$(ls -lh "$FINAL_OUTPUT" | awk '{print $5}')
echo -e "${GREEN}✓ Step 6 complete: $FINAL_OUTPUT ($FILE_SIZE)${NC}"
echo ""

# Step 7: Generate provenance data (optional)
echo -e "${BLUE}[7/7] Generating provenance data...${NC}"

mkdir -p "$PROVENANCE_DIR"

if [ -f "provenance-generator.cjs" ]; then
    node provenance-generator.cjs \
      "$CURATED_DATA" \
      "$MASTERED_DATA" \
      "$PROVENANCE_DIR" || echo -e "${YELLOW}⚠️  Provenance generation skipped${NC}"
    echo -e "${GREEN}✓ Step 7 complete${NC}"
else
    echo -e "${YELLOW}⚠️  provenance-generator.cjs not found, skipping${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Pipeline Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "📊 Output Summary:"
echo "  Final database: $FINAL_OUTPUT ($FILE_SIZE)"
if [ -f "$CURATED_DATA" ]; then
    FOOD_COUNT=$(grep -o '"appId"' "$CURATED_DATA" | wc -l)
    echo "  Food count:     ~$FOOD_COUNT foods"
fi
echo ""
echo "📁 Intermediate files:"
echo "  $COMBINED_DATA"
echo "  $MERGED_DATA (with merge report)"
echo "  $PORTIONED_DATA (with synthesis report)"
echo "  $MASTERED_DATA"
echo "  $CURATED_DATA"
echo ""
echo "📋 Reports generated:"
echo "  merge-report.json     - Source merging details"
echo "  synthesis-report.json - Portion synthesis stats"
echo ""
echo "Next steps:"
echo "  1. Review merge-report.json to verify Foundation/SR Legacy merges"
echo "  2. Test the app: npm run dev"
echo "  3. Search for foods to verify portions and data quality"
echo "  4. Commit changes: git add $FINAL_OUTPUT"
echo ""
