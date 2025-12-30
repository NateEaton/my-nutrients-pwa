Design Specification: Rebuilding the Food Curation Pipeline

1. Purpose & Scope

This document specifies a ground-up redesign of the food curation pipeline used by My Nutrients PWA, while preserving the existing application data model and runtime expectations.

The redesign formalizes principles that are already implicit in the current pipeline and improves:

Preferential use of Foundation Foods over SR Legacy for nutrient data

Systematic derivation of common (non-100g) serving sizes

Programmatic reconciliation of overlaps and gaps between USDA datasets

Explicit provenance, confidence, and fallback handling

Long-term maintainability as Foundation Foods expands


The output of the pipeline must remain compatible with:

src/lib/data/foodDatabaseData.js

Existing IndexedDB structures

Existing provenance display and metadata dialogs


No changes to the application runtime schema are assumed.


---

2. Guiding Principles

1. Foundation-first for nutrients
Foundation Foods are always preferred when a suitable analytical match exists.


2. SR Legacy as fallback and metadata source
SR Legacy is retained for:

Coverage gaps

Household serving conventions

Provenance transparency



3. Food concepts are primary; datasets are realizations
Internal food identities ("app foods") must not be keyed directly to FDC IDs.


4. Servings are derived, not authoritative
Household servings are usability constructs, derived deterministically and auditable.


5. Grams are the only hard contract
All serving ↔ nutrient relationships are mediated strictly by gram weights.


6. Curation must be fully programmatic
No manual, per-food decisions at runtime; all logic encoded in rules or tables.




---

3. Current Pipeline (Baseline)

The existing pipeline consists of:

USDA JSON (Foundation + SR Legacy)
  → json-data-processor
  → master-key-assigner
  → food-curator
  → data-module-generator
  → provenance-generator (optional)

Key preserved characteristics:

Stable appId assignment via master-key-map.json

Deduplication and collapse of similar foods (e.g., salted vs unsalted)

Optimized, minified runtime structure

Provenance files mapping app foods to contributing USDA foods


This redesign does not change the final output shape, only how foods are selected, reconciled, and annotated.


---

4. Conceptual Model

4.1 Food Concept

A Food Concept is an internal, stable representation of a real-world food, independent of any single USDA entry.

Examples:

"Egg, whole, raw"

"Milk, whole"

"Rice, white, dry"


Each Food Concept:

Has one appId

May reference multiple USDA foods

Owns serving definitions



---

4.2 Analytical Realizations

Each Food Concept has one or more analytical realizations:

Role	Source	Purpose

Primary	Foundation	Nutrients (preferred)
Fallback	SR Legacy	Nutrients if Foundation missing
Reference	SR Legacy	Serving / household measures


Only one realization is active for nutrient math at any time.


---

5. Nutrient Source Selection Rules

For each Food Concept:

1. Identify all candidate Foundation foods


2. Score equivalence using:

Food category match

Normalized name token overlap

Form/state match (raw, cooked, dry, etc.)



3. Select highest-scoring Foundation food above threshold


4. If none qualify, repeat process using SR Legacy


5. Record both primary and fallback sources in provenance



No nutrient values are ever merged across sources.


---

6. Serving Model

6.1 Serving Archetypes

Each Food Concept is classified into exactly one serving archetype:

Archetype	Examples	Derivation Method

Countable whole	Eggs, apples	Unit weight table
Granular dry	Rice, flour	Density → volume
Amorphous solid	Butter, yogurt	Utensil measure
Liquid	Milk, oil	Volume × density
Regulatory anchor	RACC foods	FDA RACC grams
Edge / fallback	Herbs, yeast	Rule-based default



---

6.2 Serving Derivation Order

For each Food Concept, serving options are generated in priority order:

1. Explicit household measure from SR Legacy or Foundation


2. FDA RACC (if present)


3. Unit weight (countable foods)


4. Density-based volume


5. Default fallback (100g only if unavoidable)



At least one non-100g serving must exist whenever physically meaningful.


---

6.3 Serving Metadata

Each serving option stores:

Display label (e.g. "1 cup", "1 large egg")

Gram weight

Derivation source (SR, unitTable, density, RACC)

Confidence level (high, medium, low)


This metadata is retained for provenance dialogs but may be stripped from minimal runtime builds.


---

7. Nutrient Calculation

Nutrient values for a serving are always computed as:

(servingGrams / 100) × nutrientsPer100g

No precomputed serving nutrients are stored upstream of the final module generation step.


---

8. Deduplication & Food Collapsing

The curator may collapse foods when:

Serving grams are equivalent

Primary nutrients (macros, minerals) differ below tolerance

Differences are limited to optional attributes (e.g., sodium)


Collapsed foods must:

Preserve provenance links to all source foods

Surface differences in the provenance dialog


This preserves current application behavior.


---

9. Provenance Model

Provenance data records:

All contributing FDC IDs

Dataset type (Foundation or SR Legacy)

Role (primary, fallback, reference)

Equivalence score

Collapse rationale (if applicable)


Provenance is generated as chunked JSON, exactly as today.


---

10. Pipeline Architecture (Revised)

USDA JSON
  ↓
[1] Nutrient Extraction (unchanged)
  ↓
[2] Stable ID Assignment (unchanged)
  ↓
[3] Concept Builder (new)
    - Equivalence scoring
    - Source prioritization
  ↓
[4] Serving Derivation Engine (new)
    - Archetype classification
    - Rule-based servings
  ↓
[5] Curator / Deduplicator (refined)
  ↓
[6] Module Generator (unchanged output)
  ↓
[7] Provenance Generator (expanded metadata)


---

11. Backward Compatibility

The following are explicitly preserved:

appId stability

foodDatabaseData.js shape

Measure (ms) structure

Nutrient key minification

IndexedDB expectations


Any new metadata must be removable via --minimal build flags.


---

12. Migration Strategy

1. Run old and new pipelines side-by-side


2. Compare:

Default serving grams

Nutrient totals

Collapsed food sets



3. Validate high-use foods manually


4. Promote new pipeline once parity is achieved




---

13. Non-Goals

Perfect USDA equivalence

Automatic interpretation of cultural serving norms

Elimination of SR Legacy in the near term



---

14. Summary

This redesign:

Makes existing implicit decisions explicit

Separates analytical truth from usability constructs

Enables systematic replacement of SR Legacy over time

Preserves all application-level guarantees


It aligns the pipeline with how FoodData Central is actually structured, while meeting the practical needs of a nutrition-tracking application.