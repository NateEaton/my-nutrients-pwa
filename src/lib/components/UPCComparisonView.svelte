<!--
 * My Nutrients Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
-->

<!--
 * UPC Comparison View Component
 * Displays side-by-side (stacked) comparison of USDA and OpenFoodFacts results
 * User taps a card to select and use that data source
-->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { getNutrientLabel, getNutrientUnit } from '$lib/config/nutrientDefaults';

  export let usdaResult = null;
  export let offResult = null;
  export let upcCode = '';
  export let displayedNutrients = ['protein', 'calcium', 'fiber', 'vitaminD'];

  const dispatch = createEventDispatcher();

  // Track if this is user's first time seeing the comparison view
  let showFirstUseHint = false;

  onMount(() => {
    // Show hint if user hasn't seen it before
    const hasSeenHint = localStorage.getItem('upc-comparison-hint-seen');
    if (!hasSeenHint) {
      showFirstUseHint = true;
    }
  });

  function dismissHint() {
    showFirstUseHint = false;
    localStorage.setItem('upc-comparison-hint-seen', 'true');
  }

  // Short labels for nutrients (module-level constant for efficiency)
  const SHORT_LABELS = {
    protein: 'Prot',
    calcium: 'Ca',
    fiber: 'Fiber',
    vitaminD: 'Vit D',
    vitaminA: 'Vit A',
    vitaminC: 'Vit C',
    vitaminK: 'Vit K',
    vitaminB6: 'B6',
    vitaminB12: 'B12',
    folate: 'Folate',
    iron: 'Iron',
    zinc: 'Zinc',
    magnesium: 'Mg',
    potassium: 'K',
    carbohydrates: 'Carbs',
    sugars: 'Sugar',
    fat: 'Fat',
    saturatedFat: 'Sat Fat',
    omega3: 'Omega-3',
    omega6: 'Omega-6'
  };

  // Format nutrient value with unit
  function formatNutrientValue(result, nutrientKey) {
    if (!result) return null;

    // Try nutrientsPerServing first (USDA), then nutrients (fallback)
    const value = result.nutrientsPerServing?.[nutrientKey]
               ?? result.nutrients?.[nutrientKey]
               ?? null;

    if (value === null || value === undefined) return null;

    const unit = getNutrientUnit(nutrientKey);

    // Format number based on size
    let formatted;
    if (value >= 100) {
      formatted = Math.round(value);
    } else if (value >= 10) {
      formatted = Math.round(value * 10) / 10;
    } else {
      formatted = Math.round(value * 100) / 100;
    }

    return `${formatted}${unit}`;
  }

  // Get short label for nutrient (for compact display)
  function getShortLabel(nutrientKey) {
    return SHORT_LABELS[nutrientKey] || getNutrientLabel(nutrientKey);
  }

  // Handle card selection
  function selectSource(source) {
    const result = source === 'usda' ? usdaResult : offResult;
    if (result) {
      dismissHint(); // Dismiss hint on first selection
      dispatch('select', { source, result });
    }
  }

  // Handle rescan
  function handleRescan() {
    dispatch('rescan');
  }

  // Handle cancel
  function handleCancel() {
    dispatch('cancel');
  }

  // Get confidence badge class
  function getConfidenceClass(confidence) {
    if (!confidence) return 'none';
    return confidence.toLowerCase();
  }
</script>

<div class="comparison-container">
  <div class="comparison-header">
    <h3>Select a Data Source</h3>
    <p class="upc-display">UPC: {upcCode}</p>
  </div>

  <!-- First-use hint overlay -->
  {#if showFirstUseHint}
    <div class="first-use-hint" role="alert">
      <span class="material-icons hint-icon">info</span>
      <p>Select the best match. You can adjust any values on the next screen.</p>
      <button class="hint-dismiss" on:click={dismissHint} aria-label="Dismiss hint">
        <span class="material-icons">close</span>
      </button>
    </div>
  {/if}

  <div class="cards-container">
    <!-- USDA Card -->
    {#if usdaResult}
      <button
        class="source-card usda clickable"
        on:click={() => selectSource('usda')}
        type="button"
        aria-label="Select USDA data for {usdaResult.productName}"
      >
        <div class="card-header">
          <span class="source-badge usda">USDA</span>
          <span class="confidence-badge {getConfidenceClass(usdaResult.confidence)}">
            {usdaResult.confidence || 'unknown'}
          </span>
        </div>

        <div class="card-body">
          <div class="product-info">
            <span class="product-name">{usdaResult.productName}</span>
            {#if usdaResult.brandName}
              <span class="brand-name">{usdaResult.brandName}</span>
            {/if}
          </div>

          <div class="serving-info">
            <span class="serving-label">Serving:</span>
            <span class="serving-value">{usdaResult.servingDisplayText || usdaResult.servingSize || '—'}</span>
          </div>

          <div class="nutrients-grid">
            {#each displayedNutrients as nutrientKey}
              {@const value = formatNutrientValue(usdaResult, nutrientKey)}
              <div class="nutrient-item" class:has-value={value !== null}>
                <span class="nutrient-label">{getShortLabel(nutrientKey)}</span>
                <span class="nutrient-value">{value || '—'}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="card-action">
          <span class="action-text">Use this data</span>
          <span class="material-icons action-icon">chevron_right</span>
        </div>
      </button>
    {:else}
      <div class="source-card usda not-found" aria-disabled="true">
        <div class="card-header">
          <span class="source-badge usda faded">USDA</span>
          <span class="not-found-badge">Not Found</span>
        </div>
        <div class="card-body empty">
          <span class="material-icons empty-icon">search_off</span>
          <span class="empty-message">No data in USDA database</span>
        </div>
      </div>
    {/if}

    <!-- OpenFoodFacts Card -->
    {#if offResult}
      <button
        class="source-card off clickable"
        on:click={() => selectSource('off')}
        type="button"
        aria-label="Select OpenFoodFacts data for {offResult.productName}"
      >
        <div class="card-header">
          <span class="source-badge off">OpenFoodFacts</span>
          <span class="confidence-badge {getConfidenceClass(offResult.confidence)}">
            {offResult.confidence || 'unknown'}
          </span>
        </div>

        <div class="card-body">
          <div class="product-info">
            <span class="product-name">{offResult.productName}</span>
            {#if offResult.brandName}
              <span class="brand-name">{offResult.brandName}</span>
            {/if}
          </div>

          <div class="serving-info">
            <span class="serving-label">Serving:</span>
            <span class="serving-value">{offResult.servingDisplayText || offResult.servingSize || '—'}</span>
          </div>

          <div class="nutrients-grid">
            {#each displayedNutrients as nutrientKey}
              {@const value = formatNutrientValue(offResult, nutrientKey)}
              <div class="nutrient-item" class:has-value={value !== null}>
                <span class="nutrient-label">{getShortLabel(nutrientKey)}</span>
                <span class="nutrient-value">{value || '—'}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="card-action">
          <span class="action-text">Use this data</span>
          <span class="material-icons action-icon">chevron_right</span>
        </div>
      </button>
    {:else}
      <div class="source-card off not-found" aria-disabled="true">
        <div class="card-header">
          <span class="source-badge off faded">OpenFoodFacts</span>
          <span class="not-found-badge">Not Found</span>
        </div>
        <div class="card-body empty">
          <span class="material-icons empty-icon">search_off</span>
          <span class="empty-message">No data in OpenFoodFacts</span>
        </div>
      </div>
    {/if}
  </div>

  <div class="action-buttons">
    <button class="action-btn secondary" on:click={handleRescan}>
      <span class="material-icons">qr_code_scanner</span>
      Scan Again
    </button>
    <button class="action-btn tertiary" on:click={handleCancel}>
      Cancel
    </button>
  </div>
</div>

<style>
  .comparison-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
  }

  .comparison-header {
    text-align: center;
    margin-bottom: var(--spacing-xs);
  }

  .comparison-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .upc-display {
    margin: var(--spacing-xs) 0 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-family: monospace;
  }

  /* First-use hint */
  .first-use-hint {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--primary-color);
    color: white;
    border-radius: var(--spacing-xs);
    font-size: var(--font-size-sm);
  }

  .first-use-hint p {
    margin: 0;
    flex: 1;
  }

  .hint-icon {
    font-size: 20px;
    opacity: 0.9;
  }

  .hint-dismiss {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hint-dismiss:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .hint-dismiss .material-icons {
    font-size: 18px;
  }

  .cards-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  /* Source Card Styling */
  .source-card {
    background: var(--surface);
    border: 2px solid var(--divider);
    border-radius: var(--spacing-sm);
    padding: 0;
    text-align: left;
    width: 100%;
    font-family: inherit;
    overflow: hidden;
  }

  /* Clickable cards - make them obviously interactive */
  .source-card.clickable {
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .source-card.clickable:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  .source-card.clickable:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  /* Focus styles for keyboard navigation */
  .source-card.clickable:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .source-card.clickable:focus-visible {
    outline: 3px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* Source-specific accent colors for clickable cards */
  .source-card.usda.clickable {
    border-left: 4px solid #2563eb;
  }

  .source-card.usda.clickable:hover {
    border-color: #2563eb;
  }

  .source-card.off.clickable {
    border-left: 4px solid #16a34a;
  }

  .source-card.off.clickable:hover {
    border-color: #16a34a;
  }

  /* Not-found cards - clearly disabled */
  .source-card.not-found {
    cursor: not-allowed;
    opacity: 0.5;
    background: var(--surface-variant);
    border-style: dashed;
  }

  /* Card Header */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--divider);
    background: var(--surface-variant);
  }

  .source-badge {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .source-badge.usda {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .source-badge.off {
    background: #dcfce7;
    color: #15803d;
  }

  .source-badge.faded {
    opacity: 0.6;
  }

  .confidence-badge {
    font-size: var(--font-size-xs);
    font-weight: 500;
    text-transform: capitalize;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .confidence-badge.high {
    background: #d1fae5;
    color: #065f46;
  }

  .confidence-badge.medium {
    background: #fef3c7;
    color: #92400e;
  }

  .confidence-badge.low {
    background: #fee2e2;
    color: #991b1b;
  }

  .confidence-badge.none,
  .confidence-badge.unknown {
    background: #f3f4f6;
    color: #6b7280;
  }

  .not-found-badge {
    font-size: var(--font-size-xs);
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
    background: #f3f4f6;
    color: #6b7280;
  }

  /* Card Body */
  .card-body {
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .card-body.empty {
    padding: var(--spacing-lg) var(--spacing-md);
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  .empty-icon {
    font-size: 32px;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .empty-message {
    color: var(--text-secondary);
    font-style: italic;
    font-size: var(--font-size-sm);
  }

  .product-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .product-name {
    font-weight: 500;
    color: var(--text-primary);
    font-size: var(--font-size-md);
    line-height: 1.3;
    /* Truncate long names */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .brand-name {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .serving-info {
    display: flex;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    padding: var(--spacing-xs) 0;
    border-top: 1px dashed var(--divider);
    border-bottom: 1px dashed var(--divider);
  }

  .serving-label {
    color: var(--text-secondary);
  }

  .serving-value {
    color: var(--text-primary);
    font-weight: 500;
  }

  /* Nutrients Grid */
  .nutrients-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-xs) var(--spacing-md);
  }

  .nutrient-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) 0;
  }

  .nutrient-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .nutrient-value {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-secondary);
  }

  .nutrient-item.has-value .nutrient-value {
    color: var(--text-primary);
  }

  /* Card Action - replaces old footer */
  .card-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--surface-variant);
    border-top: 1px solid var(--divider);
    font-weight: 500;
    font-size: var(--font-size-sm);
  }

  .source-card.usda.clickable .card-action {
    color: #1d4ed8;
    background: #eff6ff;
  }

  .source-card.off.clickable .card-action {
    color: #15803d;
    background: #f0fdf4;
  }

  .action-icon {
    font-size: 20px;
    transition: transform 0.2s ease;
  }

  .source-card.clickable:hover .action-icon {
    transform: translateX(4px);
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
  }

  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--spacing-xs);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    /* Accessibility: minimum touch target 44x44px */
    min-height: 44px;
  }

  .action-btn:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .action-btn.secondary {
    background: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--divider);
  }

  .action-btn.secondary:hover {
    background: var(--surface-variant);
    border-color: var(--primary-color);
  }

  .action-btn.tertiary {
    background: transparent;
    color: var(--text-secondary);
  }

  .action-btn.tertiary:hover {
    background: var(--surface-variant);
    color: var(--text-primary);
  }

  .action-btn .material-icons {
    font-size: 18px;
  }

  /* Dark mode adjustments */
  :global(.dark) .source-card {
    background: #1f2937; /* Slightly lighter than typical dark background */
  }

  :global(.dark) .source-card.not-found {
    background: #111827;
  }

  :global(.dark) .card-header,
  :global(.dark) .card-action {
    background: #374151;
  }

  :global(.dark) .source-card.usda.clickable .card-action {
    background: #1e3a5f;
    color: #93c5fd;
  }

  :global(.dark) .source-card.off.clickable .card-action {
    background: #14532d;
    color: #86efac;
  }

  :global(.dark) .source-badge.usda {
    background: #1e3a5f;
    color: #93c5fd;
  }

  :global(.dark) .source-badge.off {
    background: #14532d;
    color: #86efac;
  }

  :global(.dark) .confidence-badge.high {
    background: #064e3b;
    color: #6ee7b7;
  }

  :global(.dark) .confidence-badge.medium {
    background: #78350f;
    color: #fcd34d;
  }

  :global(.dark) .confidence-badge.low {
    background: #7f1d1d;
    color: #fca5a5;
  }

  :global(.dark) .confidence-badge.none,
  :global(.dark) .confidence-badge.unknown,
  :global(.dark) .not-found-badge {
    background: #374151;
    color: #9ca3af;
  }

  :global(.dark) .first-use-hint {
    background: #3b82f6;
  }

  /* Large font / enlarged display support */
  @media (min-width: 400px) {
    .nutrients-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* When user prefers larger text, stack nutrients vertically */
  @media (max-width: 399px) {
    .nutrients-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Support for user font scaling - use relative units */
  @media screen and (min-resolution: 1.5dppx) {
    .product-name {
      -webkit-line-clamp: 3; /* Allow more lines on high-DPI displays */
    }
  }
</style>
