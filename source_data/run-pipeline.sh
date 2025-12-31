#!/bin/bash

#
# run-pipeline.sh - Hybrid Data Pipeline Orchestrator
#
# Runs the complete food database pipeline with review checkpoints.
# Supports resuming from specific stages and non-interactive mode.
#

set -e  # Exit on error

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR"

# Default file names
FOUNDATION_JSON="FoodData_Central_foundation_food_json_2025-04-24.json"
SR_LEGACY_JSON="FoodData_Central_sr_legacy_food_json_2018-04.json"

# Pipeline output files
COMBINED_DATA="combined-nutrient-data.json"
MASTERED_DATA="mastered-nutrient-data.json"
CANDIDATES="candidates"
DERIVED_FOODS="derived-foods"
CURATED="curated-nutrients"
FINAL_OUTPUT="../src/lib/data/foodDatabaseData.js"
COVERAGE_REPORT="coverage_report.txt"
DIFF_REPORT="diff_report"
PROVENANCE_DIR="../static/data/provenance"

# --- Colors for output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Helper Functions ---
print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_stage() {
    echo -e "${CYAN}[Stage $1] $2${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

wait_for_review() {
    if [ "$NON_INTERACTIVE" = true ]; then
        echo -e "${YELLOW}(Non-interactive mode: skipping review)${NC}"
        return 0
    fi

    echo ""
    echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  REVIEW CHECKPOINT: $1${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Please review the generated files before continuing."
    echo "Files to review: $2"
    echo ""
    read -p "Press Enter to continue, or Ctrl+C to abort... "
    echo ""
}

# --- Argument Parsing ---
FROM_STAGE=1
NON_INTERACTIVE=false
SKIP_DIFF=false
SKIP_PROVENANCE=false
HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --from-stage)
            FROM_STAGE="$2"
            shift 2
            ;;
        --non-interactive)
            NON_INTERACTIVE=true
            shift
            ;;
        --skip-diff)
            SKIP_DIFF=true
            shift
            ;;
        --skip-provenance)
            SKIP_PROVENANCE=true
            shift
            ;;
        --foundation)
            FOUNDATION_JSON="$2"
            shift 2
            ;;
        --sr-legacy)
            SR_LEGACY_JSON="$2"
            shift 2
            ;;
        --help|-h)
            HELP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ "$HELP" = true ]; then
    echo ""
    echo "Usage: ./run-pipeline.sh [OPTIONS]"
    echo ""
    echo "Run the hybrid food database pipeline with review checkpoints."
    echo ""
    echo "Options:"
    echo "  --from-stage N      Start from stage N (1-9, default: 1)"
    echo "  --non-interactive   Skip review prompts (for automated runs)"
    echo "  --skip-diff         Skip diff validation (stage 8)"
    echo "  --skip-provenance   Skip provenance generation (stage 9)"
    echo "  --foundation FILE   Foundation Foods JSON file name"
    echo "  --sr-legacy FILE    SR Legacy JSON file name"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Stages:"
    echo "  1: Extract nutrients from USDA JSON files"
    echo "  2: Assign stable appIds"
    echo "  3: Generate FF↔SRL candidates (creates audit CSV)"
    echo "  4: ★ REVIEW: Audit candidates_review.csv"
    echo "  5: Derive serving sizes"
    echo "  6: Curate and filter foods"
    echo "  7: Generate app module + coverage report"
    echo "  8: Validate against previous version"
    echo "  9: Generate provenance data for UI"
    echo ""
    echo "Examples:"
    echo "  ./run-pipeline.sh                    # Full pipeline with reviews"
    echo "  ./run-pipeline.sh --from-stage 5    # Resume from serving derivation"
    echo "  ./run-pipeline.sh --non-interactive  # Automated run (no prompts)"
    echo ""
    exit 0
fi

# --- Main Pipeline ---

cd "$SCRIPT_DIR"

print_header "Hybrid Data Pipeline"
echo "Starting from stage: $FROM_STAGE"
echo "Non-interactive: $NON_INTERACTIVE"
echo "Working directory: $SCRIPT_DIR"
echo ""

# Stage 1: Extract nutrients from USDA JSON
if [ "$FROM_STAGE" -le 1 ]; then
    print_stage 1 "Extract Multi-Nutrient Data"

    # Check for source files
    if [ ! -f "$FOUNDATION_JSON" ]; then
        print_error "Foundation Foods JSON not found: $FOUNDATION_JSON"
        echo "Please download from: https://fdc.nal.usda.gov/download-datasets/"
        exit 1
    fi

    if [ ! -f "$SR_LEGACY_JSON" ]; then
        print_error "SR Legacy JSON not found: $SR_LEGACY_JSON"
        echo "Please download from: https://fdc.nal.usda.gov/download-datasets/"
        exit 1
    fi

    node json-data-processor.cjs \
        --foundation "$FOUNDATION_JSON" \
        --sr-legacy "$SR_LEGACY_JSON" \
        --output "${COMBINED_DATA%.json}"

    print_success "Created $COMBINED_DATA"
fi

# Stage 2: Assign stable IDs
if [ "$FROM_STAGE" -le 2 ]; then
    print_stage 2 "Assign Stable App IDs"

    if [ ! -f "$COMBINED_DATA" ]; then
        print_error "Input file not found: $COMBINED_DATA"
        echo "Run from stage 1 first."
        exit 1
    fi

    node master-key-assigner-json.cjs \
        --input "$COMBINED_DATA" \
        --map master-key-map.json \
        --output "$MASTERED_DATA"

    print_success "Created $MASTERED_DATA"
fi

# Stage 3: Generate candidates (FF↔SRL matching)
if [ "$FROM_STAGE" -le 3 ]; then
    print_stage 3 "Generate Candidates (Hybrid Matching)"

    if [ ! -f "$MASTERED_DATA" ]; then
        print_error "Input file not found: $MASTERED_DATA"
        echo "Run from stage 2 first."
        exit 1
    fi

    node candidate-generator.cjs \
        --input "$MASTERED_DATA" \
        --output "$CANDIDATES" \
        --threshold 0.70

    print_success "Created ${CANDIDATES}.json"
    print_success "Created ${CANDIDATES}_review.csv (audit file)"
fi

# Stage 4: Human review checkpoint
if [ "$FROM_STAGE" -le 4 ]; then
    print_stage 4 "★ REVIEW: Candidate Audit"

    echo ""
    echo "Review ${CANDIDATES}_review.csv for potential issues:"
    echo "  - Foods with action = 'REVIEW' (low scores or warnings)"
    echo "  - Density warnings (may indicate mismatched foods)"
    echo "  - Low-score matches (<0.75)"
    echo ""

    # Show summary if file exists
    if [ -f "${CANDIDATES}_review.csv" ]; then
        REVIEW_COUNT=$(grep -c ",REVIEW$" "${CANDIDATES}_review.csv" 2>/dev/null || echo "0")
        DENSITY_WARNINGS=$(grep -c ",true," "${CANDIDATES}_review.csv" 2>/dev/null || echo "0")
        FF_MATCHES=$(grep -c "^.*,Foundation," "${CANDIDATES}_review.csv" 2>/dev/null || echo "0")

        echo "Quick Stats:"
        echo "  - Foods needing review: $REVIEW_COUNT"
        echo "  - Density warnings: $DENSITY_WARNINGS"
        echo "  - Foundation Foods matches: $FF_MATCHES"
    fi

    wait_for_review "Candidate Audit" "${CANDIDATES}_review.csv"
fi

# Stage 5: Derive serving sizes
if [ "$FROM_STAGE" -le 5 ]; then
    print_stage 5 "Derive Serving Sizes"

    if [ ! -f "${CANDIDATES}.json" ]; then
        print_error "Input file not found: ${CANDIDATES}.json"
        echo "Run from stage 3 first."
        exit 1
    fi

    node serving-deriver.cjs \
        --input "${CANDIDATES}.json" \
        --output "$DERIVED_FOODS" \
        --data-dir .

    print_success "Created ${DERIVED_FOODS}.json"
fi

# Stage 6: Curate and filter
if [ "$FROM_STAGE" -le 6 ]; then
    print_stage 6 "Curate and Filter Foods"

    if [ ! -f "${DERIVED_FOODS}.json" ]; then
        print_error "Input file not found: ${DERIVED_FOODS}.json"
        echo "Run from stage 5 first."
        exit 1
    fi

    CURATOR_ARGS="${DERIVED_FOODS}.json $CURATED"

    if [ -f "keep-list.txt" ]; then
        CURATOR_ARGS="$CURATOR_ARGS --keep-list keep-list.txt"
    fi

    if [ -f "exclude-list.txt" ]; then
        CURATOR_ARGS="$CURATOR_ARGS --exclude-list exclude-list.txt"
    fi

    node food-curator-nutrients.cjs $CURATOR_ARGS

    print_success "Created ${CURATED}-full.json"
    print_success "Created ${CURATED}-abridged.json"
fi

# Stage 7: Generate app module
if [ "$FROM_STAGE" -le 7 ]; then
    print_stage 7 "Generate App Module"

    if [ ! -f "${CURATED}-abridged.json" ]; then
        print_error "Input file not found: ${CURATED}-abridged.json"
        echo "Run from stage 6 first."
        exit 1
    fi

    # Backup existing output if it exists
    if [ -f "$FINAL_OUTPUT" ]; then
        cp "$FINAL_OUTPUT" "${FINAL_OUTPUT}.bak"
        print_warning "Backed up existing output to ${FINAL_OUTPUT}.bak"
    fi

    node data-module-generator-nutrients.cjs \
        "${CURATED}-abridged.json" \
        "$FINAL_OUTPUT" \
        --module --minify --minimal \
        --coverage "$COVERAGE_REPORT"

    print_success "Created $FINAL_OUTPUT"
    print_success "Created $COVERAGE_REPORT"

    # Display coverage summary
    if [ -f "$COVERAGE_REPORT" ]; then
        echo ""
        echo "Coverage Summary:"
        head -20 "$COVERAGE_REPORT"
    fi
fi

# Stage 8: Validate against previous
if [ "$FROM_STAGE" -le 8 ] && [ "$SKIP_DIFF" = false ]; then
    print_stage 8 "Validate Against Previous Version"

    if [ ! -f "${FINAL_OUTPUT}.bak" ]; then
        print_warning "No backup file found (${FINAL_OUTPUT}.bak)"
        echo "Skipping diff validation. This is expected on first run."
    else
        node diff-validator.cjs \
            --old "${FINAL_OUTPUT}.bak" \
            --new "$FINAL_OUTPUT" \
            --output "$DIFF_REPORT" \
            --verbose

        print_success "Created ${DIFF_REPORT}.json"
        print_success "Created ${DIFF_REPORT}.txt"

        # Check for high-severity issues
        if [ -f "${DIFF_REPORT}.json" ]; then
            HIGH_SEVERITY=$(node -e "const d=require('./${DIFF_REPORT}.json'); console.log(d.summary?.highSeverityCount || 0)")
            if [ "$HIGH_SEVERITY" -gt 0 ]; then
                print_warning "Found $HIGH_SEVERITY high-severity issues!"
                echo "Review ${DIFF_REPORT}.txt for details."
                wait_for_review "Diff Validation" "${DIFF_REPORT}.txt"
            fi
        fi
    fi
fi

# Stage 9: Generate provenance data
if [ "$FROM_STAGE" -le 9 ] && [ "$SKIP_PROVENANCE" = false ]; then
    print_stage 9 "Generate Provenance Data"

    if [ ! -f "${CURATED}-abridged.json" ]; then
        print_error "Input file not found: ${CURATED}-abridged.json"
        echo "Run from stage 6 first."
        exit 1
    fi

    if [ ! -f "$MASTERED_DATA" ]; then
        print_error "Input file not found: $MASTERED_DATA"
        echo "Run from stage 2 first."
        exit 1
    fi

    # Create provenance directory if needed
    mkdir -p "$PROVENANCE_DIR"

    node provenance-generator.cjs \
        "${CURATED}-abridged.json" \
        "$MASTERED_DATA" \
        "$PROVENANCE_DIR"

    print_success "Created provenance data in $PROVENANCE_DIR"
fi

# --- Complete ---
print_header "Pipeline Complete!"

echo "Output files:"
echo "  - Final module: $FINAL_OUTPUT"
if [ -f "$COVERAGE_REPORT" ]; then
    echo "  - Coverage: $COVERAGE_REPORT"
fi
if [ -f "${DIFF_REPORT}.txt" ]; then
    echo "  - Diff report: ${DIFF_REPORT}.txt"
fi
if [ -d "$PROVENANCE_DIR" ]; then
    echo "  - Provenance: $PROVENANCE_DIR"
fi

echo ""
echo "Next steps:"
echo "  1. Review the coverage report"
echo "  2. Test the app with the new database"
echo "  3. Commit changes if everything looks good"
echo ""

print_success "Done!"
