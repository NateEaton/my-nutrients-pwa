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
  import { createEventDispatcher } from 'svelte';
  import { getNutrientLabel, getNutrientUnit } from '$lib/config/nutrientDefaults';

  export let usdaResult = null;
  export let offResult = null;
  export let upcCode = '';
  export let displayedNutrients = ['protein', 'calcium', 'fiber', 'vitaminD'];

  const dispatch = createEventDispatcher();

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
    <h3>Select Data Source</h3>
    <p class="upc-display">UPC: {upcCode}</p>
  </div>

  <div class="cards-container">
    <!-- USDA Card -->
    {#if usdaResult}
      <button
        class="source-card usda"
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

        <div class="card-footer">
          <span class="tap-hint">Tap to use this data</span>
        </div>
      </button>
    {:else}
      <div class="source-card usda not-found">
        <div class="card-header">
          <span class="source-badge usda">USDA</span>
          <span class="not-found-badge">Not Found</span>
        </div>
        <div class="card-body empty">
          <span class="empty-message">No product data available</span>
        </div>
      </div>
    {/if}

    <!-- OpenFoodFacts Card -->
    {#if offResult}
      <button
        class="source-card off"
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

        <div class="card-footer">
          <span class="tap-hint">Tap to use this data</span>
        </div>
      </button>
    {:else}
      <div class="source-card off not-found">
        <div class="card-header">
          <span class="source-badge off">OpenFoodFacts</span>
          <span class="not-found-badge">Not Found</span>
        </div>
        <div class="card-body empty">
          <span class="empty-message">No product data available</span>
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
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
    font-family: inherit;
  }

  .source-card:not(.not-found):hover {
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .source-card:not(.not-found):active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  /* Focus styles for keyboard navigation */
  .source-card:not(.not-found):focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .source-card:not(.not-found):focus-visible {
    outline: 3px solid var(--primary-color);
    outline-offset: 2px;
  }

  .source-card.not-found {
    cursor: default;
    opacity: 0.6;
  }

  .source-card.usda:not(.not-found) {
    border-color: #2563eb20;
  }

  .source-card.usda:not(.not-found):hover {
    border-color: #2563eb;
  }

  .source-card.off:not(.not-found) {
    border-color: #16a34a20;
  }

  .source-card.off:not(.not-found):hover {
    border-color: #16a34a;
  }

  /* Card Header */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--divider);
    background: var(--surface-variant);
    border-radius: var(--spacing-sm) var(--spacing-sm) 0 0;
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
    padding: var(--spacing-lg);
    align-items: center;
    justify-content: center;
  }

  .empty-message {
    color: var(--text-secondary);
    font-style: italic;
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

  /* For 1-2 nutrients, use single column */
  .nutrients-grid:has(.nutrient-item:nth-child(2):last-child) {
    grid-template-columns: repeat(2, 1fr);
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

  /* Card Footer */
  .card-footer {
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--surface-variant);
    border-top: 1px solid var(--divider);
    border-radius: 0 0 var(--spacing-sm) var(--spacing-sm);
    text-align: center;
  }

  .tap-hint {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .source-card.usda:not(.not-found) .tap-hint {
    color: #1d4ed8;
  }

  .source-card.off:not(.not-found) .tap-hint {
    color: #15803d;
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

  /* Large font / enlarged display support */
  @media (min-width: 400px) {
    .nutrients-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* When user prefers larger text, stack nutrients vertically */
  @media (max-width: 399px), (prefers-reduced-motion: reduce) {
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
