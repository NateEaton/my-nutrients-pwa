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
  import { calciumService } from "$lib/stores/calcium";
  import { NUTRIENT_METADATA, DEFAULT_NUTRIENT_GOALS } from "$lib/config/nutrientDefaults";

  export let show = false;

  const dispatch = createEventDispatcher();
  const MAX_DISPLAYED = 4;

  let settings = {
    nutrientGoals: {},
    displayedNutrients: [],
    theme: 'auto',
    colorScheme: 'blue'
  };

  let isLoading = true;
  let isSubmitting = false;
  let errorMessage = "";

  // Group nutrients by category
  const nutrientsByCategory = {
    macro: NUTRIENT_METADATA.filter(n => n.category === 'macro'),
    mineral: NUTRIENT_METADATA.filter(n => n.category === 'mineral'),
    vitamin: NUTRIENT_METADATA.filter(n => n.category === 'vitamin'),
    fat: NUTRIENT_METADATA.filter(n => n.category === 'fat')
  };

  // Load settings when modal opens
  $: if (show) {
    loadSettings();
  }

  async function loadSettings() {
    isLoading = true;
    errorMessage = "";
    try {
      settings = await calciumService.getNutrientSettings();
    } catch (error) {
      console.error("Error loading nutrient settings:", error);
      errorMessage = "Failed to load settings";
    } finally {
      isLoading = false;
    }
  }

  function toggleNutrient(nutrientId: string) {
    const index = settings.displayedNutrients.indexOf(nutrientId);

    if (index > -1) {
      // Remove from displayed nutrients
      settings.displayedNutrients = settings.displayedNutrients.filter(id => id !== nutrientId);
    } else {
      // Add to displayed nutrients if under limit
      if (settings.displayedNutrients.length < MAX_DISPLAYED) {
        settings.displayedNutrients = [...settings.displayedNutrients, nutrientId];
      } else {
        errorMessage = `You can only display up to ${MAX_DISPLAYED} nutrients at once`;
        setTimeout(() => errorMessage = "", 3000);
      }
    }
  }

  function isDisplayed(nutrientId: string): boolean {
    return settings.displayedNutrients.includes(nutrientId);
  }

  function canSelectMore(): boolean {
    return settings.displayedNutrients.length < MAX_DISPLAYED;
  }

  function handleClose() {
    if (!isSubmitting) {
      show = false;
      dispatch("close");
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    // Validate at least one nutrient selected
    if (settings.displayedNutrients.length === 0) {
      errorMessage = "Please select at least one nutrient to display";
      return;
    }

    // Validate goals
    for (const [nutrientId, goal] of Object.entries(settings.nutrientGoals)) {
      if (typeof goal === 'number' && (goal < 0 || goal > 100000)) {
        errorMessage = `Invalid goal for ${nutrientId}. Must be between 0 and 100000`;
        return;
      }
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      await calciumService.updateNutrientSettings(settings);

      show = false;
      dispatch("updated", { settings });
      dispatch("close");

    } catch (error) {
      console.error("Error updating nutrient settings:", error);
      errorMessage = "Failed to update settings. Please try again.";
    } finally {
      isSubmitting = false;
    }
  }

  function resetToDefaults() {
    settings.nutrientGoals = { ...DEFAULT_NUTRIENT_GOALS };
  }
</script>

{#if show}
  <div class="modal-overlay" on:click={handleBackdropClick}>
    <div class="modal-content nutrient-settings-modal" on:click|stopPropagation>
      <div class="modal-header">
        <button
          class="back-btn"
          on:click={handleClose}
          disabled={isSubmitting}
        >
          <span class="material-icons">arrow_back</span>
        </button>
        <h2 class="modal-title">Manage Nutrients</h2>
      </div>

      <div class="modal-body">
        {#if isLoading}
          <div class="loading-state">
            <p>Loading settings...</p>
          </div>
        {:else}
          <form on:submit={handleSubmit}>
            <div class="section-header">
              <h3>Display Preferences</h3>
              <p class="hint">Select up to {MAX_DISPLAYED} nutrients to display in food cards</p>
              <p class="selected-count">
                Selected: {settings.displayedNutrients.length} / {MAX_DISPLAYED}
              </p>
            </div>

            {#each Object.entries(nutrientsByCategory) as [category, nutrients]}
              <div class="nutrient-category">
                <h4 class="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}s</h4>
                <div class="nutrient-list">
                  {#each nutrients as nutrient}
                    {@const displayed = isDisplayed(nutrient.id)}
                    {@const canSelect = canSelectMore() || displayed}
                    <div class="nutrient-item">
                      <label class="nutrient-checkbox">
                        <input
                          type="checkbox"
                          checked={displayed}
                          disabled={!canSelect && !displayed}
                          on:change={() => toggleNutrient(nutrient.id)}
                        />
                        <span class="nutrient-name">
                          {nutrient.label}
                          {#if displayed}
                            <span class="star">⭐</span>
                          {/if}
                        </span>
                      </label>

                      <div class="nutrient-goal">
                        <input
                          type="number"
                          bind:value={settings.nutrientGoals[nutrient.id]}
                          placeholder={nutrient.defaultGoal.toString()}
                          min="0"
                          step="0.1"
                          class="goal-input"
                        />
                        <span class="unit">{nutrient.unit}</span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}

            {#if errorMessage}
              <div class="error-message">{errorMessage}</div>
            {/if}

            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-secondary"
                on:click={resetToDefaults}
                disabled={isSubmitting}
              >
                Reset to Defaults
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background-color: var(--surface);
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .nutrient-settings-modal {
    max-width: 700px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border);
    gap: 0.5rem;
  }

  .back-btn {
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .back-btn:hover {
    background-color: var(--border);
  }

  .back-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .loading-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }

  .section-header {
    margin-bottom: 1.5rem;
  }

  .section-header h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .hint {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .selected-count {
    margin: 0.5rem 0 0 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--primary);
  }

  .nutrient-category {
    margin-bottom: 2rem;
  }

  .category-title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--border);
  }

  .nutrient-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .nutrient-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem;
    background-color: var(--background);
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .nutrient-checkbox {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    cursor: pointer;
  }

  .nutrient-checkbox input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .nutrient-checkbox input[type="checkbox"]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .nutrient-name {
    font-size: 1rem;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .star {
    font-size: 0.9rem;
  }

  .nutrient-goal {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .goal-input {
    width: 80px;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
    text-align: right;
    background-color: var(--surface);
    color: var(--text-primary);
  }

  .goal-input:focus {
    outline: none;
    border-color: var(--primary);
  }

  .unit {
    font-size: 0.9rem;
    color: var(--text-secondary);
    min-width: 40px;
  }

  .error-message {
    background-color: var(--error-bg);
    color: var(--error);
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    text-align: center;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-secondary {
    background-color: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--border);
  }

  .btn-primary {
    background-color: var(--primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }

    .nutrient-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .nutrient-goal {
      width: 100%;
      justify-content: space-between;
    }

    .goal-input {
      flex: 1;
    }

    .modal-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
