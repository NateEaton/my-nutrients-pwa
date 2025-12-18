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
-->

<script>
  import { createEventDispatcher } from "svelte";
  import { sortSettings } from "$lib/stores/nutrients";
  import { getNutrientLabel } from "$lib/config/nutrientDefaults";

  export let displayedNutrients = [];

  const dispatch = createEventDispatcher();
  
  // Track which nutrient is active
  let activeNutrientId = 'protein';
  let showNutrientMenu = false;
  let longPressTimer;
  let isLongPress = false;

  // Reactively update active nutrient
  $: if (displayedNutrients.length > 0) {
    if (!displayedNutrients.includes(activeNutrientId)) {
      activeNutrientId = displayedNutrients[0];
    }
  }

  // Sync if global sort changes
  $: if ($sortSettings.sortBy && 
         $sortSettings.sortBy !== 'time' && 
         $sortSettings.sortBy !== 'name' && 
         displayedNutrients.includes($sortSettings.sortBy)) {
    activeNutrientId = $sortSettings.sortBy;
  }

  $: activeLabel = getNutrientLabel(activeNutrientId);
  $: displayLabel = activeLabel.length > 8 ? activeLabel.slice(0, 6) + '..' : activeLabel;

  function handleSortClick(sortBy) {
    dispatch("sortChange", { sortBy });
  }

  // --- Robust Long Press Logic (Pointer Events) ---
  
  function handlePointerDown(e) {
    // Only left click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      if (displayedNutrients.length > 1) {
        showNutrientMenu = true;
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500); // 500ms threshold
  }

  function handlePointerUpOrLeave() {
    clearTimeout(longPressTimer);
  }

  function handleNutrientBtnClick(e) {
    // If it was a long press, stop here (menu is already open)
    if (isLongPress) {
      isLongPress = false;
      return;
    }
    
    // If menu is currently open, close it and don't toggle sort
    if (showNutrientMenu) {
      showNutrientMenu = false;
      return;
    }

    // Normal click: toggle sort
    handleSortClick(activeNutrientId);
  }

  function selectNutrientFromMenu(id) {
    activeNutrientId = id;
    showNutrientMenu = false;
    handleSortClick(id);
  }

  function handleWindowClick() {
    if (showNutrientMenu) {
      showNutrientMenu = false;
    }
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="sort-controls" class:muted={$sortSettings.isLoading}>
  <div class="sort-label">
    <span class="material-icons sort-section-icon">sort</span>
  </div>

  <div class="sort-options">
    <!-- Added Button -->
    <button
      class="sort-option"
      class:active={$sortSettings.sortBy === "time"}
      on:click={() => handleSortClick("added")}
    >
      <span class="material-icons">schedule</span>
      <span class="sort-text">Added</span>
      <span class="material-icons sort-icon">
        {$sortSettings.sortBy === "time"
          ? $sortSettings.sortOrder === "asc" ? "expand_less" : "expand_more"
          : "unfold_more"}
      </span>
    </button>

    <!-- Name Button -->
    <button
      class="sort-option"
      class:active={$sortSettings.sortBy === "name"}
      on:click={() => handleSortClick("name")}
    >
      <span class="material-icons">sort_by_alpha</span>
      <span class="sort-text">Name</span>
      <span class="material-icons sort-icon">
        {$sortSettings.sortBy === "name"
          ? $sortSettings.sortOrder === "asc" ? "expand_less" : "expand_more"
          : "unfold_more"}
      </span>
    </button>

    <!-- Dynamic Nutrient Button -->
    <div class="nutrient-sort-wrapper">
      <button
        class="sort-option nutrient-btn"
        class:active={$sortSettings.sortBy === activeNutrientId}
        on:pointerdown={handlePointerDown}
        on:pointerup={handlePointerUpOrLeave}
        on:pointerleave={handlePointerUpOrLeave}
        on:click|stopPropagation={handleNutrientBtnClick}
        on:contextmenu|preventDefault
        title="Tap to sort. Long-press to change nutrient."
      >
        <span class="material-icons">science</span>
        <span class="sort-text">{displayLabel}</span>
        <span class="material-icons sort-icon">
          {$sortSettings.sortBy === activeNutrientId
            ? $sortSettings.sortOrder === "asc" ? "expand_less" : "expand_more"
            : "unfold_more"}
        </span>
        {#if displayedNutrients.length > 1}
          <div class="long-press-hint"></div>
        {/if}
      </button>

      {#if showNutrientMenu}
        <div class="nutrient-menu" on:click|stopPropagation>
          <div class="menu-header">Sort by:</div>
          {#each displayedNutrients as id}
            <button 
              class="menu-item" 
              class:selected={activeNutrientId === id}
              on:click={() => selectNutrientFromMenu(id)}
            >
              {getNutrientLabel(id)}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .sort-controls {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: transparent;
  }

  .sort-controls.muted {
    opacity: 0.4;
    pointer-events: none;
  }

  .sort-label {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    height: var(--touch-target-min); /* Align icon with buttons */
  }

  .sort-section-icon {
    font-size: var(--icon-size-lg);
    color: var(--text-secondary);
  }

  .sort-options {
    display: flex;
    flex: 1;
    gap: var(--spacing-sm);
    /* CHANGED: Use wrap instead of overflow to allow menus to pop out */
    flex-wrap: wrap; 
  }

  .sort-option {
    display: flex;
    align-items: center;
    gap: 0.1875rem;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--spacing-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    transition: all 0.2s ease;
    border: 1px solid transparent;
    flex: 1;
    justify-content: center;
    text-align: center;
    min-height: var(--touch-target-min);
    background: none;
    white-space: nowrap;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    
    /* CRITICAL for mobile long-press: prevents scrolling while holding */
    touch-action: none; 
  }

  .sort-option:hover {
    background-color: var(--surface-variant);
  }

  .sort-option.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .sort-icon {
    font-size: var(--icon-size-sm);
  }

  .sort-option.active .sort-icon {
    color: white;
  }

  /* Nutrient Menu Wrapper */
  .nutrient-sort-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    min-width: 0; /* Prevents flex item from overflowing */
  }
  
  .nutrient-btn {
    width: 100%;
  }

  .long-press-hint {
    position: absolute;
    bottom: 3px;
    right: 50%;
    transform: translateX(50%);
    width: 16px;
    height: 2px;
    background-color: currentColor;
    opacity: 0.4;
    border-radius: 1px;
  }

  /* Popup Menu */
  .nutrient-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--surface);
    border: 1px solid var(--divider);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    z-index: 2000; /* Ensure it floats above other content */
    min-width: 150px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .menu-header {
    padding: 8px 12px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: var(--surface-variant);
    border-bottom: 1px solid var(--divider);
    font-weight: 500;
    text-transform: uppercase;
  }

  .menu-item {
    background: none;
    border: none;
    padding: 12px 16px; /* Larger touch target for menu items */
    text-align: left;
    font-size: 0.9rem;
    color: var(--text-primary);
    cursor: pointer;
    transition: background-color 0.2s;
    border-bottom: 1px solid var(--divider);
  }

  .menu-item:last-child {
    border-bottom: none;
  }

  .menu-item:hover {
    background-color: var(--surface-variant);
  }

  .menu-item.selected {
    color: var(--primary-color);
    font-weight: 600;
    background-color: var(--primary-alpha-5);
  }

  /* Responsive adjustments */
  @media (max-width: 30rem) {
    .sort-text {
      display: none;
    }
    
    .sort-option {
      gap: var(--spacing-xs);
      padding: var(--spacing-sm);
    }

    .sort-label span:not(.material-icons) {
      display: none;
    }
  }

  @media (min-width: 30.0625rem) {
    .sort-option {
      justify-content: center;
      gap: var(--spacing-sm);
    }
  }
</style>