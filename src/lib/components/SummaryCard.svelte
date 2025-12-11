<!--
 * My Calcium Tracker PWA
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
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import DatePicker from "./DatePicker.svelte";
  import { addDays } from "$lib/utils/dateUtils";
  import { getNutrientLabel, getNutrientUnit } from "$lib/config/nutrientDefaults";

  export let currentDate;
  export let totalNutrients = {}; // NutrientValues object
  export let nutrientGoals = {}; // Record<string, number>
  export let displayedNutrients = []; // string[] - max 4 nutrients to display

  const dispatch = createEventDispatcher();
  let summaryCardElement;

  // Touch handling
  let touchStartX = 0;
  let touchStartY = 0;
  let isScrolling = false;

  function handleDateChange(event) {
    dispatch("dateChange", event.detail);
  }


  function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isScrolling = false;
  }

  function handleTouchMove(event) {
    if (!touchStartX || !touchStartY) return;
    
    const touch = event.touches[0];
    const diffX = touchStartX - touch.clientX;
    const diffY = touchStartY - touch.clientY;
    
    // Determine if this is a vertical scroll (ignore horizontal swipes)
    if (Math.abs(diffY) > Math.abs(diffX)) {
      isScrolling = true;
      return;
    }
  }

  function handleTouchEnd(event) {
    if (!touchStartX || !touchStartY || isScrolling) {
      touchStartX = 0;
      touchStartY = 0;
      isScrolling = false;
      return;
    }

    const touch = event.changedTouches[0];
    const diffX = touchStartX - touch.clientX;
    const diffY = touchStartY - touch.clientY;
    
    // Minimum swipe distance (50px)
    const minSwipeDistance = 50;
    
    // Ensure horizontal swipe is dominant
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // Swipe left - go to next day
        const newDate = addDays(currentDate, 1);
        dispatch("dateChange", { date: newDate });
      } else {
        // Swipe right - go to previous day
        const newDate = addDays(currentDate, -1);
        dispatch("dateChange", { date: newDate });
      }
    }
    
    touchStartX = 0;
    touchStartY = 0;
    isScrolling = false;
  }

  onDestroy(() => {
    if (summaryCardElement) {
      summaryCardElement.removeEventListener("touchstart", handleTouchStart);
      summaryCardElement.removeEventListener("touchmove", handleTouchMove);
      summaryCardElement.removeEventListener("touchend", handleTouchEnd);
    }
  });

  // Set up touch listeners when summary card element becomes available
  $: if (summaryCardElement) {
    summaryCardElement.addEventListener("touchstart", handleTouchStart, { passive: false });
    summaryCardElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    summaryCardElement.addEventListener("touchend", handleTouchEnd, { passive: false });
  }
</script>

<div class="summary-card" bind:this={summaryCardElement}>
  <DatePicker {currentDate} on:dateChange={handleDateChange} />

  <div class="nutrients-summary">
    {#if displayedNutrients.length === 0}
      <div class="no-nutrients-message">
        <p>No nutrients selected. Go to Settings to choose nutrients to track.</p>
      </div>
    {:else}
      <div class="nutrients-grid" class:single={displayedNutrients.length === 1} class:two={displayedNutrients.length === 2} class:three={displayedNutrients.length === 3} class:four={displayedNutrients.length === 4}>
        {#each displayedNutrients as nutrientId}
          {@const total = totalNutrients[nutrientId] || 0}
          {@const goal = nutrientGoals[nutrientId] || 0}
          {@const percent = goal > 0 ? (total / goal) * 100 : 0}
          {@const progressPercent = Math.min(percent, 100)}

          <div class="nutrient-card">
            <div class="nutrient-header">
              <span class="nutrient-name">{getNutrientLabel(nutrientId)}</span>
            </div>
            <div class="nutrient-value">{total.toFixed(1)}<span class="unit">{getNutrientUnit(nutrientId)}</span></div>
            <div class="progress-bar-container">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  class:incomplete={percent < 100}
                  style="width: {progressPercent}%"
                ></div>
              </div>
            </div>
            <div class="nutrient-goal">
              {percent.toFixed(0)}% of {goal}{getNutrientUnit(nutrientId)}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .summary-card {
    background: var(--surface);
    border: 1px solid var(--divider);
    border-radius: var(--spacing-md);
    padding: var(--spacing-lg) var(--spacing-xl);
    margin: var(--spacing-lg);
    box-shadow: var(--shadow);
  }

  .nutrients-summary {
    margin-top: var(--spacing-lg);
  }

  .no-nutrients-message {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
  }

  .nutrients-grid {
    display: grid;
    gap: var(--spacing-md);
  }

  /* Grid layouts based on number of nutrients */
  .nutrients-grid.single {
    grid-template-columns: 1fr;
  }

  .nutrients-grid.two {
    grid-template-columns: repeat(2, 1fr);
  }

  .nutrients-grid.three {
    grid-template-columns: repeat(3, 1fr);
  }

  .nutrients-grid.four {
    grid-template-columns: repeat(2, 1fr);
  }

  .nutrient-card {
    background: var(--surface-variant);
    border-radius: var(--spacing-sm);
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .nutrient-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nutrient-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .nutrient-value {
    font-size: var(--font-size-2xl);
    font-weight: bold;
    color: var(--text-primary);
    line-height: 1;
  }

  .nutrient-value .unit {
    font-size: var(--font-size-sm);
    font-weight: normal;
    color: var(--text-secondary);
    margin-left: var(--spacing-xs);
  }

  .progress-bar-container {
    margin: var(--spacing-xs) 0;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: var(--background);
    border-radius: var(--spacing-xs);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--primary-color);
    border-radius: var(--spacing-xs);
    transition: width 0.3s ease;
  }

  .progress-fill.incomplete {
    background: var(--error-color);
  }

  .nutrient-goal {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-align: left;
  }

  /* Mobile responsive */
  @media (max-width: 48rem) { /* 768px equivalent - tablet */
    .nutrients-grid.three {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 30rem) { /* 480px equivalent - mobile */
    .summary-card {
      padding: var(--spacing-md) var(--spacing-lg);
      margin: var(--spacing-md);
    }

    .nutrients-grid.two,
    .nutrients-grid.three,
    .nutrients-grid.four {
      grid-template-columns: 1fr;
    }

    .nutrient-card {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .nutrient-value {
      font-size: var(--font-size-xl);
    }
  }
</style>
