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
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="history-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Journal History</h3>
        <button class="close-button" on:click={handleClose} title="Close">
          <span class="material-icons">close</span>
        </button>
      </div>

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
          <button class="btn-secondary" on:click={handleClose}>Close</button>
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
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .history-modal {
    background-color: var(--surface);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--divider);
    background-color: var(--background);
  }

  .modal-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background-color: var(--divider);
    color: var(--text-primary);
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
    background-color: var(--hover-bg);
  }

  .date-header .material-icons {
    font-size: 20px;
    color: var(--accent-color);
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--divider);
    background-color: var(--background);
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .btn-secondary {
    padding: 0.5rem 1.25rem;
    border: 1px solid var(--divider);
    background-color: var(--surface);
    color: var(--text-primary);
    border-radius: 6px;
    cursor: pointer;
    font-size: var(--font-size-base);
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background-color: var(--hover-bg);
    border-color: var(--text-secondary);
  }

  @media (max-width: 600px) {
    .history-modal {
      width: 95%;
      max-height: 90vh;
    }

    .modal-header,
    .food-name,
    .modal-footer {
      padding: 1rem;
    }

    .date-header {
      padding: 0.75rem 1rem;
    }

    .entries {
      padding: 0 1rem 0.75rem 2.75rem;
    }
  }
</style>
