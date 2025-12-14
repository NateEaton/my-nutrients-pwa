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
  import { onMount, onDestroy } from "svelte";
  import { nutrientState, showToast, nutrientService } from "$lib/stores/nutrients";
  import { DEFAULT_FOOD_DATABASE, getPrimaryMeasure, getAllMeasures, hasMultipleMeasures, formatCalcium } from "$lib/data/foodDatabase";
  import { NUTRIENT_METADATA } from "$lib/config/nutrientDefaults";
  import { SearchService } from "$lib/services/SearchService";
  import { goto } from "$app/navigation";
  import SourceIndicator from "$lib/components/SourceIndicator.svelte";
  import MetadataPopup from "$lib/components/MetadataPopup.svelte";

  // --- State Variables ---
  let searchQuery = "";
  let selectedFilter = "available"; // 'available', 'database', 'user'
  let sortBy = "calcium";
  let sortOrder = "desc";
  let filteredFoods = [];
  let isBulkOperationInProgress = false;
  let typeSortRotation = 0; // 0, 1, 2 for three-way type rotation
  const foodDatabase = DEFAULT_FOOD_DATABASE;
  let isDatabaseLoading = false;

  // Multi-nutrient support
  let nutrientSettings = null;
  let displayedNutrients = ['protein', 'calcium', 'fiber', 'vitaminD'];
  let windowWidth = 1024;
  let selectedNutrientForControls = 'calcium'; // Which nutrient to use for sort/filter

  // Nutrient filter state (Generic)
  let nutrientFilter = {
    type: "all", // 'all', 'preset', 'custom'
    preset: null, // 'zero'
    min: null,
    max: null,
  };
  let showFilterDropdown = false;

  // Modal states
  let showDeleteModal = false;
  let foodToDelete = null;
  let showMetadataPopup = false;
  let selectedFoodForMetadata = null;

  // --- Helpers ---

  function getNutrientMetadata(nutrientId) {
    return NUTRIENT_METADATA.find(n => n.id === nutrientId);
  }

  // Reactive helper for current nutrient metadata
  $: currentNutrientMeta = getNutrientMetadata(selectedNutrientForControls) || { label: 'Nutrient', unit: '' };

  function getNutrientValue(food, nutrientId) {
    let measureObj;
    if (food.measures && Array.isArray(food.measures) && food.measures.length > 0) {
      measureObj = food.measures[0];
    } else {
      measureObj = food;
    }
    const value = measureObj.nutrients?.[nutrientId] ?? measureObj[nutrientId] ?? 0;
    return value;
  }

  function formatNutrientValue(value, nutrientId) {
    const metadata = getNutrientMetadata(nutrientId);
    if (!metadata) return `${value.toFixed(1)}`;
    
    if (metadata.unit === 'mcg' || value < 1) {
      return value.toFixed(1);
    } else if (value < 10) {
      return value.toFixed(1);
    } else {
      return Math.round(value).toString();
    }
  }

  function getFoodTypeForSort(food) {
    if (selectedFilter === "available") {
      if (food.isCustom) return "Custom";
      if ($nutrientState.favorites.has(food.id)) return "Favorite";
      return "Database";
    } else if (selectedFilter === "database") {
      if ($nutrientState.favorites.has(food.id)) return "Favorite";
      if ($nutrientState.hiddenFoods.has(food.id)) return "Hidden";
      return "Database";
    } else if (selectedFilter === "user") {
      return "Custom";
    }
    return "Unknown";
  }

  function getTypeSortPriority(food) {
    const type = getFoodTypeForSort(food);

    if (selectedFilter === "available") {
      const priorities = [
        { Custom: 0, Favorite: 1, Database: 2 },
        { Favorite: 0, Database: 1, Custom: 2 },
        { Database: 0, Custom: 1, Favorite: 2 },
      ];
      return priorities[typeSortRotation][type] || 999;
    } else if (selectedFilter === "database") {
      const priorities = [
        { Favorite: 0, Hidden: 1, Database: 2 },
        { Hidden: 0, Database: 1, Favorite: 2 },
        { Database: 0, Favorite: 1, Hidden: 2 },
      ];
      return priorities[typeSortRotation][type] || 999;
    }
    return 0;
  }

  // --- Event Handlers ---

  function handleResize() {
    windowWidth = window.innerWidth;
  }

  // Sync sort when nutrient selector changes
  function handleNutrientChange(event) {
    const newNutrient = event.target.value;
    
    // If we are currently sorting by the nutrient that was just selected,
    // update the sort to track the NEW nutrient.
    if (sortBy === selectedNutrientForControls) {
      sortBy = newNutrient;
    }
    
    selectedNutrientForControls = newNutrient;
  }

  function handleFilterClick(filter) {
    selectedFilter = filter;
    if (filter === "user" && sortBy === "type") {
      // User view only has one type, so switch to nutrient sort
      sortBy = selectedNutrientForControls; 
      sortOrder = "desc";
    }
  }

  function handleSortClick(sort) {
    if (sortBy === sort) {
      if (sort === "type") {
        typeSortRotation = (typeSortRotation + 1) % 3;
      } else {
        sortOrder = sortOrder === "asc" ? "desc" : "asc";
      }
    } else {
      sortBy = sort;
      if (sort === "type") typeSortRotation = 0;
      sortOrder = sort === "name" ? "asc" : "desc";
    }
  }

  function getSortIcon(sort) {
    if (sortBy !== sort) return "unfold_more";
    return sortOrder === "desc" ? "expand_more" : "expand_less";
  }

  function selectNutrientFilter(type, preset = null, min = null, max = null) {
    nutrientFilter = { type, preset, min, max };
    if (type !== "custom") {
      showFilterDropdown = false;
    }
  }

  function getFilterButtonText() {
    if (nutrientFilter.type === "all") return "Filter";
    if (nutrientFilter.type === "preset" && nutrientFilter.preset === "zero") return `No ${currentNutrientMeta.label}`;
    if (nutrientFilter.type === "custom")
      return `${nutrientFilter.min || 0}-${nutrientFilter.max || "∞"}${currentNutrientMeta.unit}`;
    return "Filter";
  }

  function passesNutrientFilter(food) {
    if (nutrientFilter.type === "all") return true;

    const val = getNutrientValue(food, selectedNutrientForControls);

    if (nutrientFilter.type === "preset") {
      if (nutrientFilter.preset === "zero") {
        return val === 0;
      }
    }

    if (nutrientFilter.type === "custom") {
      const min = nutrientFilter.min || 0;
      const max = nutrientFilter.max || Infinity;
      return val >= min && val <= max;
    }

    return true;
  }

  // --- Lifecycle ---

  onMount(async () => {
    try {
      nutrientSettings = await nutrientService.getNutrientSettings();
      displayedNutrients = nutrientSettings.displayedNutrients || ['protein', 'calcium', 'fiber', 'vitaminD'];
      selectedNutrientForControls = displayedNutrients[0] || 'calcium';
      
      // Sync initial sort
      if (sortBy === 'calcium' && selectedNutrientForControls !== 'calcium') {
        sortBy = selectedNutrientForControls;
      }
    } catch (error) {
      console.error('Error loading nutrient settings:', error);
    }
    windowWidth = window.innerWidth;
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    window.removeEventListener('resize', handleResize);
  });

  // --- Reactivity ---

  // Main list filtering and sorting
  $: {
    typeSortRotation;
    nutrientFilter; // Reactive to filter changes
    selectedNutrientForControls; // Reactive to selector changes
    let foods = [];

    // 1. Initial selection based on view mode
    if (selectedFilter === "available") {
      foods = [...foodDatabase, ...$nutrientState.customFoods];
    } else if (selectedFilter === "database") {
      foods = [...foodDatabase];
    } else if (selectedFilter === "user") {
      foods = [...$nutrientState.customFoods];
    }

    // 2. Apply Search (SearchService handles hidden logic based on mode)
    if (searchQuery.trim()) {
      const hiddenFoodsForSearch = selectedFilter === "database" ? new Set() : $nutrientState.hiddenFoods;
      const results = SearchService.searchFoods(searchQuery, foods, {
        mode: "database",
        favorites: $nutrientState.favorites,
        hiddenFoods: hiddenFoodsForSearch,
        maxResults: 1000,
      });
      foods = results.map((result) => result.food);
    } else {
      // If not searching, filter available view manually
      if (selectedFilter === "available") {
        foods = foods.filter((food) => food.isCustom || !$nutrientState.hiddenFoods.has(food.id));
      }
    }

    // 3. Apply Nutrient Filter
    if (nutrientFilter.type !== "all") {
      foods = foods.filter((food) => passesNutrientFilter(food));
    }

    // 4. Apply Sort
    foods.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "type":
          const aPriority = getTypeSortPriority(a);
          const bPriority = getTypeSortPriority(b);
          comparison = aPriority - bPriority;
          if (comparison === 0) comparison = a.name.localeCompare(b.name);
          return comparison;
        default:
          // Sort by nutrient value (supports any nutrient ID)
          const aValue = getNutrientValue(a, sortBy);
          const bValue = getNutrientValue(b, sortBy);
          comparison = aValue - bValue;
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    filteredFoods = foods;
  }

  // Helper variables for UI state
  $: eligibleFoodsForBulk = filteredFoods.filter(
    (food) => !food.isCustom && !$nutrientState.favorites.has(food.id)
  );

  $: hiddenEligibleFoods = eligibleFoodsForBulk.filter((food) =>
    $nutrientState.hiddenFoods.has(food.id)
  );

  $: allNonFavoritesHidden =
    eligibleFoodsForBulk.length > 0 &&
    hiddenEligibleFoods.length === eligibleFoodsForBulk.length;

  $: someNonFavoritesHidden = hiddenEligibleFoods.length > 0;

  $: favoriteCount = filteredFoods.filter(
    (food) => !food.isCustom && $nutrientState.favorites.has(food.id)
  ).length;

  $: bulkActionText = allNonFavoritesHidden
    ? `Unhide all ${eligibleFoodsForBulk.length} foods`
    : `Hide all ${eligibleFoodsForBulk.length} foods`;

  $: showBulkActions =
    selectedFilter === "database" &&
    (searchQuery.trim() || nutrientFilter.type !== "all") &&
    filteredFoods.length > 0 &&
    eligibleFoodsForBulk.length > 0;

  $: itemCountText = (() => {
    let totalCount = 0;
    if (selectedFilter === "available") {
      const visibleDatabaseFoods = foodDatabase.filter(
        (food) => !$nutrientState.hiddenFoods.has(food.id)
      );
      totalCount = visibleDatabaseFoods.length + $nutrientState.customFoods.length;
    } else if (selectedFilter === "database") {
      totalCount = foodDatabase.length;
    } else if (selectedFilter === "user") {
      totalCount = $nutrientState.customFoods.length;
    }

    if (searchQuery.trim() || nutrientFilter.type !== "all") {
      return `${filteredFoods.length} of ${totalCount}`;
    } else {
      return `${totalCount} items`;
    }
  })();

  // --- Interaction Handlers ---

  let docsWindowRef = null;

  function openFoodDocs(food) {
    const docsUrl = `/database-docs.html#food-${food.id}`;
    if (docsWindowRef && !docsWindowRef.closed) {
      docsWindowRef.location.href = docsUrl;
      docsWindowRef.focus();
    } else {
      docsWindowRef = window.open(docsUrl, "calcium_database_docs");
    }
  }

  async function toggleFoodHidden(food) {
    if (food.isCustom || !food.id) return;
    if (nutrientService) {
      if ($nutrientState.favorites.has(food.id) && !$nutrientState.hiddenFoods.has(food.id)) {
        await nutrientService.toggleFavorite(food.id);
      }
      await nutrientService.toggleHiddenFood(food.id);
    }
  }

  async function toggleFavorite(food) {
    if (food.isCustom) return;
    if (nutrientService) {
      if ($nutrientState.hiddenFoods.has(food.id) && !$nutrientState.favorites.has(food.id)) {
        await nutrientService.toggleHiddenFood(food.id);
      }
      await nutrientService.toggleFavorite(food.id);
    }
  }

  function confirmDeleteFood(food) {
    foodToDelete = food;
    showDeleteModal = true;
  }

  function cancelDelete() {
    showDeleteModal = false;
    foodToDelete = null;
  }

  function handleInfoClick(food) {
    selectedFoodForMetadata = food;
    showMetadataPopup = true;
  }

  async function handleDeleteFood() {
    if (!foodToDelete || !foodToDelete.id) return;
    const foodName = foodToDelete.name;
    const foodId = foodToDelete.id;
    if (nutrientService) {
      try {
        await nutrientService.deleteCustomFood(foodId);
        showToast(`Deleted ${foodName}`, "success");
      } catch (error) {
        console.error("Error deleting custom food:", error);
        showToast("Failed to delete food", "error");
      }
    }
    showDeleteModal = false;
    foodToDelete = null;
  }

  function clearSearch() {
    searchQuery = "";
  }

  function toggleFilterDropdown() {
    showFilterDropdown = !showFilterDropdown;
  }

  function handleClickOutside(event) {
    if (showFilterDropdown && !event.target.closest(".filter-control-container")) {
      showFilterDropdown = false;
    }
  }

  async function handleBulkToggle() {
    if (isBulkOperationInProgress || !nutrientService) return;
    isBulkOperationInProgress = true;
    try {
      const currentEligibleFoods = [...eligibleFoodsForBulk];
      const currentHiddenState = new Set($nutrientState.hiddenFoods);
      const targetHidden = !allNonFavoritesHidden;
      const batchSize = 10;
      for (let i = 0; i < currentEligibleFoods.length; i += batchSize) {
        const batch = currentEligibleFoods.slice(i, i + batchSize);
        for (const food of batch) {
          const isCurrentlyHidden = currentHiddenState.has(food.id);
          if (isCurrentlyHidden !== targetHidden) {
            await nutrientService.toggleHiddenFood(food.id);
          }
        }
        if (i + batchSize < currentEligibleFoods.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } catch (error) {
      console.error("Error during bulk operation:", error);
    } finally {
      isBulkOperationInProgress = false;
    }
  }

  // Keyboard accessibility
  function handleFilterKeydown(event, filter) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleFilterClick(filter);
    }
  }

  function handleBackdropKeydown(event) {
    if (event.key === "Escape") {
      showDeleteModal = false;
      foodToDelete = null;
    }
  }

  function handleSortKeydown(event, sortType) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSortClick(sortType);
    }
  }
</script>

<svelte:head>
  <title>Database - My Nutrients</title>
</svelte:head>

<div class="data-page">
  <div class="content">
    {#if isDatabaseLoading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading food database...</p>
      </div>
    {:else}
      <!-- 1. Search and Count Row -->
      <div class="search-and-count-row">
        <div class="search-container">
          <input
            type="text"
            class="data-search"
            placeholder="Search foods..."
            bind:value={searchQuery}
          />
          <span class="material-icons search-icon">search</span>
          {#if searchQuery}
            <button class="clear-search-btn" on:click={clearSearch}>
              <span class="material-icons">close</span>
            </button>
          {/if}
        </div>
        <div class="count-display">
          <span class="count-text">{itemCountText}</span>
        </div>
      </div>

      <!-- 2. Nutrient Controls Row: Label, Selector, Filter -->
      <div class="nutrient-controls-row">
        <label for="nutrient-selector" class="nutrient-label">Sort & Filter by:</label>
        
        <div class="nutrient-selector-wrapper">
          <select
            id="nutrient-selector"
            class="nutrient-selector"
            value={selectedNutrientForControls}
            on:change={handleNutrientChange}
            title="Select nutrient for sorting and filtering"
          >
            {#each displayedNutrients as nutrientId}
              {@const nutrient = getNutrientMetadata(nutrientId)}
              {#if nutrient}
                <option value={nutrientId}>{nutrient.label}</option>
              {/if}
            {/each}
          </select>
        </div>

        <div class="filter-control-container">
          <button
            class="filter-btn"
            class:active={nutrientFilter.type !== "all"}
            on:click={toggleFilterDropdown}
            title="Filter by {currentNutrientMeta.label} content"
          >
            <span class="filter-text">{getFilterButtonText()}</span>
            <span class="material-icons">expand_more</span>
          </button>

          {#if showFilterDropdown}
            <div class="filter-dropdown">
              <div class="filter-dropdown-content">
                <div class="filter-section">
                  <h4>Filter: {currentNutrientMeta.label}</h4>

                  <label class="filter-option">
                    <input
                      type="radio"
                      name="nutrient-filter"
                      checked={nutrientFilter.type === "all"}
                      on:change={() => selectNutrientFilter("all")}
                    />
                    All amounts
                  </label>

                  <label class="filter-option">
                    <input
                      type="radio"
                      name="nutrient-filter"
                      checked={nutrientFilter.preset === "zero"}
                      on:change={() => selectNutrientFilter("preset", "zero")}
                    />
                    0{currentNutrientMeta.unit} (None)
                  </label>

                  <div class="custom-range">
                    <label class="filter-option">
                      <input
                        type="radio"
                        name="nutrient-filter"
                        checked={nutrientFilter.type === "custom"}
                        on:change={() => {
                          nutrientFilter = {
                            type: "custom",
                            preset: null,
                            min: nutrientFilter.min || 0,
                            max: nutrientFilter.max || 1000,
                          };
                        }}
                      />
                      Custom Range:
                    </label>
                    <div class="range-inputs">
                      <input
                        type="number"
                        placeholder="Min"
                        bind:value={nutrientFilter.min}
                        on:input={() => {
                          nutrientFilter = {
                            type: "custom",
                            preset: null,
                            min: nutrientFilter.min,
                            max: nutrientFilter.max,
                          };
                        }}
                        min="0"
                      />
                      <span>to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        bind:value={nutrientFilter.max}
                        on:input={() => {
                          nutrientFilter = {
                            type: "custom",
                            preset: null,
                            min: nutrientFilter.min,
                            max: nutrientFilter.max,
                          };
                        }}
                        min="0"
                      />
                      <span>{currentNutrientMeta.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Bulk Actions -->
      {#if showBulkActions}
        <div class="bulk-actions">
          <div class="bulk-select-container">
            <input
              type="checkbox"
              id="bulk-select"
              class="bulk-checkbox"
              checked={allNonFavoritesHidden}
              indeterminate={someNonFavoritesHidden && !allNonFavoritesHidden}
              on:change={handleBulkToggle}
              disabled={isBulkOperationInProgress}
              aria-describedby="bulk-description"
            />
            <label for="bulk-select" class="bulk-label">
              {isBulkOperationInProgress ? "Processing..." : bulkActionText}
            </label>
            {#if favoriteCount > 0}
              <span class="bulk-skip-note" id="bulk-description">
                (skipping {favoriteCount} favorite{favoriteCount === 1 ? "" : "s"})
              </span>
            {/if}
          </div>
        </div>
      {/if}

      <!-- 3. View Mode Controls -->
      <div class="data-filter-controls">
        <span class="material-icons filter-section-icon">filter_list</span>
        <div class="sort-options">
          <div
            class="sort-option"
            class:active={selectedFilter === "available"}
            on:click={() => handleFilterClick("available")}
            on:keydown={(e) => handleFilterKeydown(e, "available")}
            role="button"
            tabindex="0"
          >
            <span class="material-icons">visibility</span>
            <span>Available</span>
          </div>
          <div
            class="sort-option"
            class:active={selectedFilter === "database"}
            on:click={() => handleFilterClick("database")}
            on:keydown={(e) => handleFilterKeydown(e, "database")}
            role="button"
            tabindex="0"
          >
            <span class="material-icons">shield</span>
            <span>Database</span>
          </div>
          <div
            class="sort-option"
            class:active={selectedFilter === "user"}
            on:click={() => handleFilterClick("user")}
            on:keydown={(e) => handleFilterKeydown(e, "user")}
            role="button"
            tabindex="0"
          >
            <span class="material-icons">person</span>
            <span>User</span>
          </div>
        </div>
      </div>

      <!-- 4. Sort Controls -->
      <div class="data-sort-controls">
        <span class="material-icons sort-section-icon">sort</span>
        <div class="sort-options">
          <div
            class="sort-option"
            class:active={sortBy === "name"}
            on:click={() => handleSortClick("name")}
            on:keydown={(e) => handleSortKeydown(e, "name")}
            role="button"
            tabindex="0"
          >
            <span class="material-icons">sort_by_alpha</span>
            <span>Name</span>
            <span class="material-icons sort-icon">{getSortIcon("name")}</span>
          </div>
          
          <div
            class="sort-option"
            class:active={sortBy === selectedNutrientForControls}
            on:click={() => handleSortClick(selectedNutrientForControls)}
            on:keydown={(e) => handleSortKeydown(e, selectedNutrientForControls)}
            role="button"
            tabindex="0"
            title="Sort by {currentNutrientMeta.label}"
          >
            <span class="material-icons">science</span>
            <span>{currentNutrientMeta.label}</span>
            <span class="material-icons sort-icon">{getSortIcon(selectedNutrientForControls)}</span>
          </div>
          
          <div
            class="sort-option"
            class:active={sortBy === "type"}
            class:disabled={selectedFilter === "user"}
            on:click={() => selectedFilter !== "user" && handleSortClick("type")}
            on:keydown={(e) => selectedFilter !== "user" && handleSortKeydown(e, "type")}
            role="button"
            tabindex={selectedFilter === "user" ? "-1" : "0"}
          >
            <span class="material-icons">category</span>
            <span>Type</span>
            <span class="material-icons sort-icon">{selectedFilter === "user" ? "" : getSortIcon("type")}</span>
          </div>
        </div>
      </div>

      <!-- Results Table/Cards -->
      <div class="results-container">
        {#if windowWidth >= 768}
          <!-- Desktop: Table View -->
          <div class="food-table-container">
            <table class="food-table">
              <thead>
                <tr>
                  {#if selectedFilter === "database"}
                    <th class="checkbox-col">Show</th>
                  {/if}
                  <th class="name-col">Food Name</th>
                  {#each displayedNutrients as nutrientId}
                    {@const nutrient = getNutrientMetadata(nutrientId)}
                    {#if nutrient}
                      <th class="nutrient-col">{nutrient.label} ({nutrient.unit})</th>
                    {/if}
                  {/each}
                  <th class="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredFoods as food}
                  <tr class:custom={food.isCustom}>
                    {#if selectedFilter === "database"}
                      <td class="checkbox-col">
                        {#if !food.isCustom}
                          <input
                            type="checkbox"
                            class="hide-checkbox"
                            checked={$nutrientState.hiddenFoods.has(food.id)}
                            on:change={() => toggleFoodHidden(food)}
                            title={$nutrientState.hiddenFoods.has(food.id) ? "Unhide food" : "Hide food"}
                          />
                        {/if}
                      </td>
                    {/if}
                    <td class="name-col">
                      <div class="food-name-cell">
                        <div class="food-name">{food.name}</div>
                        <div class="food-measure">{getPrimaryMeasure(food).measure}</div>
                      </div>
                    </td>
                    {#each displayedNutrients as nutrientId}
                      {@const value = getNutrientValue(food, nutrientId)}
                      {@const nutrient = getNutrientMetadata(nutrientId)}
                      <td class="nutrient-col">
                        {formatNutrientValue(value, nutrientId)}{nutrient?.unit || ''}
                      </td>
                    {/each}
                    <td class="actions-col">
                      {#if !food.isCustom}
                        <button
                          class="favorite-btn-table"
                          class:favorite={$nutrientState.favorites.has(food.id)}
                          on:click={() => toggleFavorite(food)}
                          title={$nutrientState.favorites.has(food.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <span class="material-icons">
                            {$nutrientState.favorites.has(food.id) ? "star" : "star_border"}
                          </span>
                        </button>
                      {:else if selectedFilter !== "database"}
                        <button
                          class="delete-btn-table"
                          on:click={() => confirmDeleteFood(food)}
                          title="Delete custom food"
                        >
                          <span class="material-icons">delete</span>
                        </button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <!-- Mobile: Card View -->
          {#each filteredFoods as food}
            <div class="food-card" class:custom={food.isCustom}>
              {#if selectedFilter === "database" && !food.isCustom}
                <div class="hide-checkbox-container">
                  <input
                    type="checkbox"
                    class="hide-checkbox"
                    checked={$nutrientState.hiddenFoods.has(food.id)}
                    on:change={() => toggleFoodHidden(food)}
                    title={$nutrientState.hiddenFoods.has(food.id) ? "Unhide food" : "Hide food"}
                  />
                </div>
              {:else if selectedFilter === "available" && !food.isCustom}
                <div class="docs-link-container">
                  <button
                    class="docs-link-btn"
                    on:click={() => openFoodDocs(food)}
                    title="View in database documentation"
                  >
                    <span class="material-icons">open_in_new</span>
                  </button>
                </div>
              {/if}
              <div class="food-info">
                <div class="food-name">
                  {food.name}
                  {#if food.isCustom && food.sourceMetadata}
                    <SourceIndicator {food} size="small" clickable={true} on:click={() => handleInfoClick(food)} />
                  {/if}
                </div>
                <div class="food-measure">
                  {getPrimaryMeasure(food).measure}
                  {#if hasMultipleMeasures(food)}
                    <span class="measure-count">({getAllMeasures(food).length} servings)</span>
                  {/if}
                </div>
                <div class="food-nutrients">
                  {#each displayedNutrients as nutrientId, idx}
                    {@const value = getNutrientValue(food, nutrientId)}
                    {@const nutrient = getNutrientMetadata(nutrientId)}
                    {#if nutrient}
                      <span class="nutrient-value">
                        {formatNutrientValue(value, nutrientId)}{nutrient.unit} {nutrient.label}
                      </span>
                      {#if idx < displayedNutrients.length - 1}
                        <span class="nutrient-separator"> | </span>
                      {/if}
                    {/if}
                  {/each}
                </div>
              </div>
              {#if !food.isCustom}
                <button
                  class="favorite-btn"
                  class:favorite={$nutrientState.favorites.has(food.id)}
                  on:click={() => toggleFavorite(food)}
                  title={$nutrientState.favorites.has(food.id) ? "Remove from favorites" : "Add to favorites"}
                >
                  <span class="material-icons">
                    {$nutrientState.favorites.has(food.id) ? "star" : "star_border"}
                  </span>
                </button>
              {:else if selectedFilter !== "database"}
                <button
                  class="delete-btn"
                  on:click={() => confirmDeleteFood(food)}
                  title="Delete custom food"
                >
                  <span class="material-icons">delete</span>
                </button>
              {/if}
            </div>
          {/each}
        {/if}
        {#if filteredFoods.length === 0}
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">
              <h3>No foods found</h3>
              <p>Try adjusting your search or filter</p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && foodToDelete}
  <div class="modal-backdrop" on:click={cancelDelete} on:keydown={handleBackdropKeydown} role="button" tabindex="0">
    <div class="delete-modal" role="dialog" aria-labelledby="delete-title" aria-modal="true">
      <div class="modal-header">
        <h3 id="delete-title">Delete Custom Food</h3>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete <strong>{foodToDelete?.name || "this food"}</strong>?</p>
        <p class="warning-text">This action cannot be undone. Past journal entries will keep this food's data.</p>
      </div>
      <div class="modal-actions">
        <button class="cancel-btn" on:click={cancelDelete}>Cancel</button>
        <button class="delete-btn-modal" on:click={handleDeleteFood}>Delete</button>
      </div>
    </div>
  </div>
{/if}

{#if showMetadataPopup && selectedFoodForMetadata && selectedFoodForMetadata.sourceMetadata}
  <MetadataPopup
    show={showMetadataPopup}
    food={selectedFoodForMetadata}
    on:close={() => {
      showMetadataPopup = false;
      selectedFoodForMetadata = null;
    }}
  />
{/if}

<svelte:window on:click={handleClickOutside} />

<style>
  .data-page {
    background-color: var(--background);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
    padding-bottom: var(--spacing-lg);
    min-height: 0;
  }

  /* Search and Count Row */
  .search-and-count-row {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
    margin-bottom: var(--spacing-sm);
    flex-wrap: wrap; /* Allow wrapping on very small screens */
  }

  .search-container {
    position: relative;
    flex: 1; /* Take remaining space */
    min-width: 200px; /* Don't squash too small */
  }

  .data-search {
    width: 100%;
    padding: var(--spacing-md) 2.5rem var(--spacing-md) 3rem;
    border: 1px solid var(--divider);
    border-radius: var(--spacing-sm);
    font-size: var(--input-font-min);
    background-color: var(--surface);
    color: var(--text-primary);
  }

  .data-search:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-alpha-10);
  }

  .search-icon {
    position: absolute;
    left: var(--spacing-lg);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    font-size: var(--icon-size-lg);
  }

  .clear-search-btn {
    position: absolute;
    right: var(--spacing-sm);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .count-display {
    white-space: nowrap;
    padding: 0 var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: 500;
  }

  /* Nutrient Controls Row */
  .nutrient-controls-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
  }

  .nutrient-label {
    white-space: nowrap;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-right: 4px;
  }

  .nutrient-selector-wrapper {
    flex: 1;
    min-width: 0; /* Allow shrinking */
  }

  .nutrient-selector {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--divider);
    border-radius: 6px;
    background-color: var(--surface);
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    min-height: var(--touch-target-min);
  }

  .filter-control-container {
    position: relative;
    flex-shrink: 0;
  }

  .filter-btn {
    background: none;
    border: 1px solid var(--divider);
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--font-size-sm);
    transition: all 0.2s ease;
    background-color: var(--surface);
    min-height: var(--touch-target-min);
    white-space: nowrap;
  }

  .filter-btn:hover {
    background-color: var(--surface-variant);
    border-color: var(--primary-color);
    color: var(--text-primary);
  }

  .filter-btn.active {
    background-color: var(--primary-alpha-10);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  /* Filter Dropdown */
  .filter-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 1000;
    margin-top: 4px;
  }

  .filter-dropdown-content {
    background: var(--surface);
    border: 1px solid var(--divider);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    min-width: 260px;
  }

  .filter-section {
    padding: var(--spacing-lg);
  }

  .filter-section h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-weight: 600;
  }

  .filter-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    cursor: pointer;
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .filter-option input[type="radio"] {
    margin: 0;
    accent-color: var(--primary-color);
  }

  .custom-range {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--divider);
  }

  .range-inputs {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
    margin-left: 1.5rem;
  }

  .range-inputs input {
    width: 60px;
    padding: 0.25rem;
    border: 1px solid var(--divider);
    border-radius: 4px;
    font-size: var(--font-size-sm);
    background: var(--background);
    color: var(--text-primary);
  }

  .range-inputs span {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  /* View Controls */
  .data-filter-controls,
  .data-sort-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0;
    background-color: transparent;
    border: none;
    box-shadow: none;
    margin-bottom: 8px;
  }

  .filter-section-icon,
  .sort-section-icon {
    font-size: 18px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .sort-options {
    display: flex;
    justify-content: space-between;
    flex: 1;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .sort-options::-webkit-scrollbar {
    display: none;
  }

  .sort-option {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    border: 1px solid transparent;
    flex: 1;
    justify-content: center;
    text-align: center;
    min-width: 0;
  }

  .sort-option:hover {
    background-color: var(--divider);
  }

  .sort-option.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .sort-option.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sort-icon {
    font-size: 16px;
  }

  /* Food Item Styles */
  .results-container {
    margin-top: 16px;
  }

  .food-card {
    background-color: var(--surface);
    border: 1px solid var(--divider);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
  }

  .food-card.custom {
    border-left: 3px solid var(--secondary-color);
    background-color: var(--custom-food-bg);
  }

  .food-info {
    flex: 1;
    margin-right: 16px;
  }

  .food-name {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .food-measure {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .measure-count {
    color: var(--text-tertiary);
    font-size: var(--font-size-xs);
    font-style: italic;
    margin-left: var(--spacing-xs);
  }

  .food-nutrients {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 6px;
    line-height: 1.5;
  }

  .nutrient-value {
    white-space: nowrap;
  }

  .nutrient-separator {
    color: var(--divider);
    margin: 0 4px;
  }

  /* Action Buttons */
  .favorite-btn, .delete-btn, .docs-link-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .favorite-btn:hover { background-color: var(--divider); color: var(--primary-color); }
  .favorite-btn.favorite { color: var(--primary-color); }
  .delete-btn:hover { background-color: var(--divider); color: var(--error-color); }
  .docs-link-btn:hover { background: var(--primary-alpha-10); color: var(--primary-color); }

  /* Table Styles */
  .food-table-container {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--divider);
    background-color: var(--surface);
  }

  .food-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .food-table th {
    background-color: var(--surface-variant);
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    border-bottom: 2px solid var(--divider);
  }

  .food-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--divider);
    color: var(--text-secondary);
  }

  .food-table tr:hover { background-color: var(--hover-overlay); }
  .food-table tr.custom { background-color: var(--custom-food-bg); border-left: 3px solid var(--secondary-color); }

  .hide-checkbox-container {
    margin-right: var(--spacing-md);
    display: flex;
    align-items: center;
  }

  .hide-checkbox {
    width: 18px;
    height: 18px;
    margin: 0;
    cursor: pointer;
    border: 2px solid var(--divider);
    border-radius: 3px;
    appearance: none;
    background-color: var(--surface);
    position: relative;
  }

  .hide-checkbox:checked {
    background-color: var(--error-color);
    border-color: var(--error-color);
  }

  .hide-checkbox:checked::after {
    content: '✕';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
  }

  /* Bulk Actions */
  .bulk-actions {
    background-color: var(--surface-variant);
    border: 1px solid var(--divider);
    border-radius: 8px;
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .bulk-select-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .bulk-checkbox {
    margin: 0;
    accent-color: var(--primary-color);
  }

  .bulk-label {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
  }

  .bulk-skip-note {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-style: italic;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
  }

  .empty-icon { font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.7; }
  .empty-text h3 { margin: 0 0 0.75rem 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary); }

  /* Mobile Responsive */
  @media (max-width: 30rem) {
    .content {
      padding: var(--spacing-md);
      padding-bottom: 5rem;
    }

    .data-search {
      padding-right: 2.5rem;
    }

    /* Keep Search and Count on same row, but wrap if needed */
    .search-and-count-row {
      flex-wrap: nowrap; 
    }

    /* Stack filter row controls tighter on mobile */
    .nutrient-controls-row {
      gap: var(--spacing-xs);
    }

    .nutrient-label {
      font-size: 0.75rem; /* Smaller label text */
    }

    .filter-btn {
      padding: var(--spacing-sm);
    }

    .filter-text {
      display: none; /* Hide filter text on very small screens, keep icon */
    }

    .filter-dropdown-content {
      width: 100%;
      min-width: unset;
      right: 0;
    }

    .data-filter-controls .sort-option span:not(.material-icons),
    .data-sort-controls .sort-option span:not(.material-icons) {
      display: none;
    }

    .data-filter-controls .sort-option .material-icons,
    .data-sort-controls .sort-option .material-icons {
      margin: 0;
    }
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: var(--modal-backdrop);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .delete-modal {
    background-color: var(--surface);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    width: 90%;
    max-width: 400px;
    overflow: hidden;
  }

  .delete-modal .modal-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--divider);
  }

  .delete-modal .modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .delete-modal .modal-body {
    padding: 1.5rem;
  }

  .warning-text {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-top: 1rem;
  }

  .modal-actions {
    padding: 1rem 1.5rem;
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    background-color: var(--surface-variant);
  }

  .cancel-btn {
    background: var(--surface);
    border: 1px solid var(--divider);
    color: var(--text-primary);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .delete-btn-modal {
    background: var(--error-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    min-height: 200px;
    color: var(--text-secondary);
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--divider);
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-md);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>