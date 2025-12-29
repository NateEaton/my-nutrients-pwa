#!/bin/bash

# USDA FoodData Central Data Downloader
# Downloads Foundation Foods and SR Legacy data for the nutrition app pipeline

set -e

echo "=================================="
echo "USDA FoodData Central Downloader"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="https://fdc.nal.usda.gov/fdc-datasets"

# File names (update these if USDA releases new versions)
FOUNDATION_FILE="FoodData_Central_foundation_food_json_2024-04-24"
SR_LEGACY_FILE="FoodData_Central_sr_legacy_food_json_2018-04"

echo "📥 This script will download:"
echo "  1. Foundation Foods (JSON) - ~30-40 MB uncompressed"
echo "  2. SR Legacy Foods (JSON) - ~800 MB+ uncompressed"
echo ""
echo "⚠️  NOTE: USDA website may block automated downloads."
echo "    If downloads fail, please:"
echo "    1. Visit https://fdc.nal.usda.gov/download-datasets.html"
echo "    2. Manually download Foundation Foods (JSON)"
echo "    3. Manually download SR Legacy (JSON)"
echo "    4. Place the .zip files in this directory"
echo "    5. Run this script again to extract them"
echo ""

# Function to download with retry and user agent
download_file() {
    local url=$1
    local output=$2
    local description=$3

    echo "Downloading ${description}..."

    # Try with curl first
    if command -v curl &> /dev/null; then
        curl -L \
            -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
            -H "Accept: application/zip,*/*" \
            --retry 3 \
            --retry-delay 2 \
            -o "${output}" \
            "${url}" 2>&1 | grep -E "HTTP|curl:"

        # Check if file was downloaded
        if [ -f "${output}" ] && [ -s "${output}" ]; then
            echo -e "${GREEN}✓ Downloaded ${output}${NC}"
            return 0
        fi
    fi

    # Try with wget
    if command -v wget &> /dev/null; then
        wget --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
            --tries=3 \
            -O "${output}" \
            "${url}"

        if [ -f "${output}" ] && [ -s "${output}" ]; then
            echo -e "${GREEN}✓ Downloaded ${output}${NC}"
            return 0
        fi
    fi

    echo -e "${RED}✗ Download failed${NC}"
    return 1
}

# Function to extract zip file
extract_file() {
    local zipfile=$1
    local description=$2

    if [ ! -f "${zipfile}" ]; then
        echo -e "${YELLOW}⚠ ${zipfile} not found${NC}"
        return 1
    fi

    if [ ! -s "${zipfile}" ]; then
        echo -e "${YELLOW}⚠ ${zipfile} is empty (0 bytes)${NC}"
        return 1
    fi

    echo "Extracting ${description}..."
    unzip -o -q "${zipfile}"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Extracted ${zipfile}${NC}"
        return 0
    else
        echo -e "${RED}✗ Extraction failed${NC}"
        return 1
    fi
}

# Download or check for Foundation Foods
echo ""
echo "--- Foundation Foods ---"
if [ -f "${FOUNDATION_FILE}.zip" ] && [ -s "${FOUNDATION_FILE}.zip" ]; then
    echo "Found existing ${FOUNDATION_FILE}.zip"
else
    download_file \
        "${BASE_URL}/${FOUNDATION_FILE}.zip" \
        "${FOUNDATION_FILE}.zip" \
        "Foundation Foods" || true
fi

extract_file "${FOUNDATION_FILE}.zip" "Foundation Foods" || echo -e "${YELLOW}Please manually download Foundation Foods${NC}"

# Download or check for SR Legacy
echo ""
echo "--- SR Legacy Foods ---"
if [ -f "${SR_LEGACY_FILE}.zip" ] && [ -s "${SR_LEGACY_FILE}.zip" ]; then
    echo "Found existing ${SR_LEGACY_FILE}.zip"
else
    download_file \
        "${BASE_URL}/${SR_LEGACY_FILE}.zip" \
        "${SR_LEGACY_FILE}.zip" \
        "SR Legacy Foods" || true
fi

extract_file "${SR_LEGACY_FILE}.zip" "SR Legacy Foods" || echo -e "${YELLOW}Please manually download SR Legacy${NC}"

# Check what we have
echo ""
echo "==================================="
echo "Download Status"
echo "==================================="

FOUNDATION_JSON=$(ls FoodData_Central_foundation_food_json_*.json 2>/dev/null | head -1)
SR_LEGACY_JSON=$(ls FoodData_Central_sr_legacy_food_json_*.json 2>/dev/null | head -1)

if [ -f "$FOUNDATION_JSON" ]; then
    echo -e "${GREEN}✓ Foundation Foods JSON: ${FOUNDATION_JSON}${NC}"
    ls -lh "$FOUNDATION_JSON"
else
    echo -e "${RED}✗ Foundation Foods JSON not found${NC}"
    echo "  Manual download: https://fdc.nal.usda.gov/download-datasets.html"
fi

echo ""

if [ -f "$SR_LEGACY_JSON" ]; then
    echo -e "${GREEN}✓ SR Legacy JSON: ${SR_LEGACY_JSON}${NC}"
    ls -lh "$SR_LEGACY_JSON"
else
    echo -e "${RED}✗ SR Legacy JSON not found${NC}"
    echo "  Manual download: https://fdc.nal.usda.gov/download-datasets.html"
fi

echo ""

if [ -f "$FOUNDATION_JSON" ] && [ -f "$SR_LEGACY_JSON" ]; then
    echo -e "${GREEN}✅ All data files ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./run-pipeline.sh"
    echo "  or"
    echo "  2. Run pipeline manually (see README.md)"
else
    echo -e "${YELLOW}⚠️  Some data files are missing${NC}"
    echo ""
    echo "Manual download instructions:"
    echo "  1. Visit: https://fdc.nal.usda.gov/download-datasets.html"
    echo "  2. Download Foundation Foods (JSON format)"
    echo "  3. Download SR Legacy (JSON format)"
    echo "  4. Place .zip files in this directory (source_data/)"
    echo "  5. Run this script again"
fi

echo ""
