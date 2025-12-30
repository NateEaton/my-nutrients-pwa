Here is the revised design specification. It incorporates the architectural safeguards, heuristic improvements, and validation steps discussed in the review.

---

# Design Specification: Rebuilding the Food Curation Pipeline (Rev 2.0)

## 1. Purpose & Scope

This document specifies a ground-up redesign of the food curation pipeline used by My Nutrients PWA. The primary goal is to implement a **Hybrid Data Strategy**: utilizing the modern accuracy of USDA **Foundation Foods** for nutrient data while retaining the usability (serving sizes/household measures) of **SR Legacy**.

The redesign improves:
*   **Systematic Hybridization:** Preferential use of Foundation Foods nutrients with SR Legacy measures.
*   **Physical Fidelity:** Ensuring density (grams per volume) is inherited correctly across datasets.
*   **Auditability:** Introducing intermediate artifacts for human review before final build.
*   **Gap Handling:** Programmatic backfilling of serving data using RACC and density tables.

The output remains fully compatible with `src/lib/data/foodDatabaseData.js` and existing IndexedDB structures.

---

## 2. Guiding Principles

1.  **Foundation-first for Nutrients**
    Foundation Foods are the authoritative source for chemical analysis (macros, micros).

2.  **SR Legacy for Measures (The "Reference" Principle)**
    SR Legacy is the authoritative source for human usability (e.g., "1 cup", "1 slice") and density mapping.

3.  **Food Concepts are Primary**
    Internal "App Foods" are stable identities. They utilize USDA data as "Realizations." A single App Food may use one USDA ID for nutrients and a different USDA ID for serving definitions.

4.  **Strict State Matching**
    "Raw" must never match "Cooked." "Dry" must never match "Boiled." Text overlap is insufficient; semantic state must match.

5.  **Grams are the Contract; Volumes are Derived**
    The pipeline never imports "Cups." It imports the **gram weight** associated with "1 Cup" from the Reference source.

6.  **Trust but Verify**
    The matching algorithms are heuristics. The pipeline must output a human-readable "Candidate Audit" file before generating the final database.

---

## 3. Data Sources & Inputs

The pipeline now requires the following inputs:

1.  **USDA JSON:** Foundation Foods + SR Legacy.
2.  **`master-key-map.json`:** Existing stable App IDs.
3.  **`racc_table.json` (New):** A manual mapping of FDC Category IDs to FDA RACC (Reference Amounts Customarily Consumed) in grams.
4.  **`density_defaults.json` (New):** Fallback densities for specific textures (e.g., `liquid: 240g/cup`, `shredded: 110g/cup`) used when no SR Legacy match exists.

---

## 4. Conceptual Model

### 4.1 The "Food Concept"
A Food Concept is the internal representation (e.g., "Rice, Brown, Long-grain").

### 4.2 Analytical Realizations
Each Concept is constructed from potentially two distinct USDA entries:

| Role | Source | Purpose | Rule |
| :--- | :--- | :--- | :--- |
| **Primary** | Foundation | Nutrient Values | Used if equivalence score > Threshold. |
| **Reference** | SR Legacy | Serving Sizes & Density | Used if primary lacks `foodPortions` (almost always). |
| **Fallback** | SR Legacy | Nutrients | Used if no Foundation match exists OR equivalence is low. |

---

## 5. Nutrient Source Selection Rules

For each Food Concept, the pipeline executes the following **Candidate Generation Logic**:

1.  **Category Lock:** Filter candidates to strict FDC `foodCategory` matches (e.g., "Legumes and Legume Products").
2.  **State Filtering (Stop Words):**
    *   If Concept contains `{raw, dry, uncooked}` → Exclude candidates with `{cooked, boiled, baked}`.
    *   If Concept contains `{cooked, boiled}` → Exclude candidates with `{raw, dry}`.
3.  **Token Scoring:** Calculate normalized name token overlap.
4.  **Selection:**
    *   **Primary:** Highest scoring Foundation Food.
    *   **Reference:** Highest scoring SR Legacy food *that contains `foodPortions` data*.

**Nutrient Backfilling Policy:**
*   Strict Mode (Default): No merging. If Primary is selected, *only* its nutrients are used.
*   *Rationale:* Preventing "Franken-foods" where values from different samples are summed inaccurately.

---

## 6. Serving Model

### 6.1 Serving Archetypes & Derivation Logic

The pipeline assigns an archetype to every food to determine how servings are calculated.

| Archetype | Source Priority | Derivation Logic | Example |
| :--- | :--- | :--- | :--- |
| **Standard** | 1. Reference (SRL) | Inherit gram weights of household measures from Reference food. | Apples, Bread |
| **Regulatory** | 2. RACC Table | Lookup FDC Category in `racc_table.json`. | Yogurt (170g) |
| **Volumetric** | 3. Density Fallback | Map keyword (liquid/solid) to `density_defaults.json`. | New FF beverages |
| **Unit** | 4. Unit Table | Existing manual unit weight table. | Eggs (Large) |
| **Fallback** | 5. 100g | Default if no other data exists. | Exotic herbs |

### 6.2 The Density Transfer Rule
When a **Primary (FF)** differs from **Reference (SRL)**:
1.  Look up "1 Cup" in Reference (SRL).
2.  Extract Weight: 150g.
3.  Apply to Primary: Create serving "1 Cup" = 150g.
4.  Calculate Nutrients: `(150 / 100) * Primary_Nutrients`.

**Safety Check:** If the difference in `water` content between Primary and Reference exceeds 20%, flag as **"Density Mismatch"** in the Audit Log and revert to Fallback (SR Legacy only).

---

## 7. Pipeline Architecture (Revised)

The new pipeline introduces an intermediate "Candidate Audit" step.

```text
[Inputs]
   ↓
[1] Data Loader & Categorizer
    - Load Foundation + SR Legacy
    - Group by FDC Category
   ↓
[2] Candidate Generator
    - Apply Stop Words / State Filtering
    - Calculate Equivalence Scores
    - Select Primary (FF) and Reference (SRL) pairs
   ↓
[3] AUDIT STEP (New)
    - Output: candidates_review.csv
    - Cols: AppID, Name, Primary_FDC, Ref_FDC, Score, Density_Warning
    - (Pipeline pauses here or accepts manual override config)
   ↓
[4] Serving Derivation Engine
    - Apply Reference Portions
    - Apply RACC / Density Defaults
   ↓
[5] Concept Builder
    - Merge Nutrients (Primary) + Servings (Reference/Derived)
   ↓
[6] Module Generator (Minification)
   ↓
[7] Provenance Generator
```

---

## 8. Migration & Validation Strategy

To ensure data integrity during the switch from "SRL Only" to "Hybrid FF/SRL":

### 8.1 The "Diff Script"
A script must run post-build to compare the `OLD` `foodDatabaseData.js` vs `NEW`.

**Alert Thresholds:**
1.  **Calorie Shift:** > 15% change per 100g (Indicates Raw vs Cooked mismatch).
2.  **Serving Weight Shift:** > 10% change for the same serving label (Indicates Density Mismatch).
3.  **Micronutrient Drop:** > 50% drop in key vitamins (Indicates Foundation Food sparsity/missing data).

### 8.2 Validation Workflow
1.  Run pipeline.
2.  Review `candidates_review.csv` for low-score matches.
3.  Run Diff Script.
4.  Manually check top 20 most-logged foods in the PWA.

---

## 9. Artifact Definitions

### `racc_table.json` (Example)
```json
{
  "12": 30,  // Cheese: 30g
  "18": 170, // Yogurt: 170g
  "10": 240  // Milk: 240g
}
```

### `density_defaults.json` (Example)
```json
{
  "liquid": 240,
  "powder": 130,
  "semi-solid": 200,
  "shredded": 110,
  "leafy-greens": 30
}
```

---

## 10. Summary

This revised spec acknowledges that automated matching is imperfect. By adding **State Filtering (Stop Words)**, **Density Safety Checks**, and an **Audit CSV**, the pipeline moves from a "Black Box" to a "Verified Process." It safely bridges the gap between the analytic precision of Foundation Foods and the practical utility of SR Legacy.