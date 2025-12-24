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
  import { goto } from "$app/navigation";
  import { nutrientService } from "$lib/stores/nutrients";

  /** Whether the modal is visible */
  export let show = false;

  /** The food to show history for */
  export let food = null;

  let history = [];
  let isLoading = false;

  function handleClose() {
    show = false;
  }

  function handleBackdropClick(event) {
    // Only close if clicking the backdrop itself, not child elements
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      handleClose();
    }
  }

  async function loadHistory() {
    if (!food || !nutrientService) {
      history = [];
      return;
    }

    isLoading = true;
    try {
      history = await nutrientService.getFoodHistory(food);
    } catch (error) {
      console.error("Error loading food history:", error);
      history = [];
    } finally {
      isLoading = false;
    }
  }

  // Load history when modal opens or food changes
  $: if (show && food) {
    loadHistory();
  }

  async function navigateToDate(dateStr) {
    await nutrientService.changeDate(dateStr);
    handleClose();
    goto('/');
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatServingSize(entry) {
    return `${entry.servingQuantity} ${entry.servingUnit}`;
  }

  // Group history by date to handle multiple entries on the same day
  $: groupedHistory = history.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {});

  $: totalEntries = history.length;
  $: uniqueDates = Object.keys(groupedHistory).length;
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="modal-backdrop">
    <div class="history-modal">
      <header class="modal-header">
        <button class="back-btn" on:click={handleClose} title="Back">
          <span class="material-icons">arrow_back</span>
        </button>
        <div class="header-title">
          <h1>Journal History</h1>
        </div>
      </header>

      <div class="food-name">{food?.name || "Unknown Food"}</div>

      <div class="modal-body">
        {#if isLoading}
          <div class="loading">Loading history...</div>
        {:else if history.length === 0}
          <div class="empty-state">
            <span class="material-icons">search_off</span>
            <p>No journal entries found for this food</p>
          </div>
        {:else}
          <div class="history-list">
            {#each Object.entries(groupedHistory) as [date, entries]}
              <div class="date-group">
                <button
                  class="date-header"
                  on:click={() => navigateToDate(date)}
                  title="Go to this date"
                >
                  <span class="material-icons">calendar_today</span>
                  <span class="date-text">{formatDate(date)}</span>
                  <span class="material-icons arrow">arrow_forward</span>
                </button>
                <div class="entries">
                  {#each entries as entry}
                    <div class="entry-item">
                      <span class="serving">{formatServingSize(entry)}</span>
                      {#if entry.note}
                        <span class="note">{entry.note}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#if history.length > 0}
        <div class="modal-footer">
          <div class="stats">
            <span>{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</span>
            <span>•</span>
            <span>{uniqueDates} {uniqueDates === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--background);
    z-index: 1000;
    display: flex;
    flex-direction: column;
  }

  .history-modal {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--background);
  }

  .modal-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    padding: 1rem 0.5rem 1rem 0.5rem;
    background-color: var(--primary-color);
    color: white;
    box-shadow: var(--shadow);
    gap: 0.5rem;
  }

  .back-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease;
    flex-shrink: 0;
  }

  .back-btn:hover {
    background-color: var(--hover-overlay);
  }

  .back-btn .material-icons {
    font-size: 24px;
  }

  .header-title {
    flex: 1;
    min-width: 0;
  }

  .header-title h1 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .food-name {
    padding: 1rem 1.5rem;
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
    background-color: var(--background);
    border-bottom: 1px solid var(--divider);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-state {
    padding: 3rem 1.5rem;
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-state .material-icons {
    font-size: 48px;
    color: var(--text-disabled);
    margin-bottom: 1rem;
  }

  .empty-state p {
    margin: 0;
    font-size: var(--font-size-base);
  }

  .history-list {
    padding: 0.5rem 0;
  }

  .date-group {
    border-bottom: 1px solid var(--divider);
  }

  .date-group:last-child {
    border-bottom: none;
  }

  .date-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .date-header:hover {
    background-color: var(--primary-alpha-5);
  }

  .date-header .material-icons {
    font-size: 20px;
    color: var(--primary-color);
  }

  .date-header .arrow {
    margin-left: auto;
    color: var(--text-secondary);
  }

  .date-text {
    flex: 1;
    text-align: left;
  }

  .entries {
    padding: 0 1.5rem 1rem 3.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .entry-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .serving {
    font-weight: 500;
    color: var(--text-primary);
  }

  .note {
    font-style: italic;
    color: var(--text-secondary);
  }

  .modal-footer {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--divider);
    background-color: var(--surface);
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
  }
</style>
