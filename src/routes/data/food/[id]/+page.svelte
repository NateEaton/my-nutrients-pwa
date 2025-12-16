<!-- src/routes/data/food/[id]/+page.svelte -->
<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getFoodById } from '$lib/data/foodDatabase';
  import { NUTRIENT_METADATA, getNutrientLabel, getNutrientUnit } from '$lib/config/nutrientDefaults';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { isOnline } from '$lib/stores/networkStatus';

  $: foodId = parseInt($page.params.id);

  let food = null;
  let sourceEntries = null;
  let loadingState = 'init'; // 'init', 'loading', 'loaded', 'error', 'offline'
  let activeTab = 'overview'; // 'overview' | 'sources'

  // Define groups for cleaner display in Overview
  const nutrientGroups = {
    'Macronutrients': ['protein', 'carbohydrates', 'fat', 'fiber', 'sugars'],
    'Minerals': ['calcium', 'iron', 'magnesium', 'potassium', 'zinc'],
    'Vitamins': ['vitaminD', 'vitaminB12', 'vitaminC', 'vitaminA', 'folate'],
    'Fats': ['saturatedFat', 'omega3', 'omega6']
  };

  onMount(async () => {
    // 1. Load Main Food (Instant / In-Memory)
    food = await getFoodById(foodId);

    // 2. Try to load provenance data immediately if online
    if (food) {
      loadSourceData();
    } else {
      loadingState = 'error';
    }
  });

  async function loadSourceData() {
    if (!$isOnline && !sourceEntries) {
      loadingState = 'offline';
      return;
    }

    loadingState = 'loading';
    try {
      // Calculate which chunk holds this food's data
      const chunkId = Math.abs(foodId % 20); // Matches CHUNK_COUNT in generator

      const res = await fetch(`${base}/data/provenance/provenance_${chunkId}.json`);
      
      if (res.ok) {
        const data = await res.json();
        sourceEntries = data[foodId];
        
        if (sourceEntries) {
          loadingState = 'loaded';
        } else {
          // Food ID not found in the chunk (might not have source data)
          loadingState = 'error';
        }
      } else {
        throw new Error('Provenance chunk not found');
      }
    } catch (e) {
      console.warn('Provenance load failed:', e);
      loadingState = $isOnline ? 'error' : 'offline';
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback if accessed directly
      goto(`${base}/data`);
    }
  }

  function formatValue(val) {
    return val ? parseFloat(val.toFixed(1)) : '0';
  }
</script>

<div class="detail-page">
  <header class="sticky-header">
    <button class="back-btn" on:click={goBack}>
      <span class="material-icons">arrow_back</span>
    </button>
    <div class="header-title">
      <h1>{food ? food.name : 'Loading...'}</h1>
    </div>
  </header>

  {#if food}
    <!-- TABS -->
    <div class="tabs">
      <button 
        class="tab-btn" 
        class:active={activeTab === 'overview'} 
        on:click={() => activeTab = 'overview'}
      >
        Overview
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'sources'} 
        on:click={() => activeTab = 'sources'}
      >
        Sources ({sourceEntries ? sourceEntries.length : '?'})
      </button>
    </div>

    <div class="content">
      
      <!-- TAB: OVERVIEW (Curated Data) -->
      {#if activeTab === 'overview'}
        <div class="info-card">
          <p class="helper-text">
            This is the curated data used by the app. It standardizes serving sizes and merges duplicate entries.
          </p>
          <div class="meta-row">
            <span class="label">Database ID:</span> <span class="value">{food.id}</span>
          </div>
        </div>

        {#each food.measures as measure}
          <div class="measure-card">
            <div class="measure-header">
              <span class="material-icons">restaurant</span>
              <h3>{measure.measure}</h3>
            </div>
            
            <div class="nutrient-grid">
              {#each Object.entries(nutrientGroups) as [groupName, ids]}
                <div class="nutrient-column">
                  <h4>{groupName}</h4>
                  {#each ids as id}
                    {@const meta = NUTRIENT_METADATA.find(n => n.id === id)}
                    {#if meta}
                      {@const val = measure.nutrients?.[id] || 0}
                      <div class="nutrient-row" class:zero={val === 0}>
                        <span class="label">{meta.label}</span>
                        <span class="value">{formatValue(val)}<small>{meta.unit}</small></span>
                      </div>
                    {/if}
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {/if}

      <!-- TAB: SOURCES (Raw USDA Data) -->
      {#if activeTab === 'sources'}
        {#if loadingState === 'loaded' && sourceEntries}
          <div class="info-card source-info">
            <p>
              The entry <strong>"{food.name}"</strong> aggregates data from the following 
              <strong>{sourceEntries.length}</strong> USDA items.
            </p>
          </div>

          {#each sourceEntries as source}
            <div class="source-card">
              <div class="source-header">
                <h4>{source.description}</h4>
                <a 
                  href="https://fdc.nal.usda.gov/fdc-app.html#/food-details/{source.fdcId}/nutrients" 
                  target="_blank"
                  class="fdc-link"
                >
                  FDC #{source.fdcId} <span class="material-icons">open_in_new</span>
                </a>
              </div>

              <div class="source-meta">
                <span class="badge">Original Measure: {source.measure}</span>
              </div>

              <!-- Comparison Table -->
              <table class="source-table">
                <thead>
                  <tr>
                    <th>Nutrient</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {#each Object.entries(source.nutrients) as [key, value]}
                    <tr>
                      <td class="cap">{key}</td>
                      <td>{value}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/each}

        {:else if loadingState === 'offline'}
          <div class="state-card offline">
            <span class="material-icons large">cloud_off</span>
            <h3>Offline</h3>
            <p>Source details are downloaded on demand.</p>
            <p>Please connect to the internet to view the original USDA records for this item.</p>
            <button class="retry-btn" on:click={loadSourceData}>Try Again</button>
          </div>

        {:else if loadingState === 'error'}
          <div class="state-card error">
            <span class="material-icons large">error_outline</span>
            <h3>Data Unavailable</h3>
            <p>Could not load source details for this item.</p>
            <button class="retry-btn" on:click={loadSourceData}>Retry</button>
          </div>

        {:else}
          <div class="state-card loading">
            <div class="spinner"></div>
            <p>Loading source history...</p>
          </div>
        {/if}
      {/if}
    </div>
  {:else if loadingState === 'error'}
    <div class="error-page">
      <h2>Food Not Found</h2>
      <button on:click={goBack}>Return to Database</button>
    </div>
  {/if}
</div>

<style>
  .detail-page {
    background-color: var(--background);
    min-height: 100vh;
    padding-bottom: 3rem;
  }

  /* HEADER */
  .sticky-header {
    background: var(--primary-color);
    color: white;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: var(--shadow);
  }

  .header-title h1 {
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.3;
    font-weight: 600;
  }

  .back-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    display: flex;
  }

  /* TABS */
  .tabs {
    display: flex;
    background: var(--surface);
    border-bottom: 1px solid var(--divider);
    position: sticky;
    top: 3.5rem; /* Height of header */
    z-index: 90;
  }

  .tab-btn {
    flex: 1;
    padding: 1rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
    background: var(--primary-alpha-5);
  }

  .content {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
  }

  /* CARDS */
  .info-card, .measure-card, .source-card, .state-card {
    background: var(--surface);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid var(--divider);
    box-shadow: var(--shadow);
  }

  .helper-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .meta-row {
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  .meta-row .label { font-weight: 600; }

  /* OVERVIEW GRID */
  .measure-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--divider);
  }

  .measure-header h3 { margin: 0; font-size: 1.1rem; }
  .measure-header .material-icons { color: var(--primary-color); }

  .nutrient-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
  }

  .nutrient-column h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid var(--divider);
    padding-bottom: 4px;
  }

  .nutrient-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 0.9rem;
    border-bottom: 1px solid #f5f5f5;
  }

  .nutrient-row.zero { color: var(--text-hint); }
  .nutrient-row .value { font-weight: 600; }
  .nutrient-row small { font-weight: 400; margin-left: 2px; color: var(--text-secondary); }

  /* SOURCE CARDS */
  .source-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .source-header h4 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.4;
    color: var(--text-primary);
  }

  .fdc-link {
    font-size: 0.75rem;
    color: var(--primary-color);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
    background: var(--primary-alpha-5);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .fdc-link .material-icons { font-size: 12px; }

  .source-meta { margin-bottom: 1rem; }
  .badge {
    background: #eee;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    color: #555;
    font-weight: 500;
  }

  .source-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .source-table th { text-align: left; color: var(--text-secondary); font-weight: 500; padding-bottom: 4px; }
  .source-table td { padding: 4px 0; border-top: 1px solid #eee; }
  .source-table .cap { text-transform: capitalize; }

  /* STATES */
  .state-card {
    text-align: center;
    padding: 3rem 1rem;
  }

  .state-card .large { font-size: 3rem; margin-bottom: 1rem; }
  .state-card.offline .large { color: var(--text-hint); }
  .state-card.error .large { color: var(--error-color); }
  
  .retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1.5rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .spinner {
    width: 40px; height: 40px;
    border: 3px solid #eee;
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    margin: 0 auto 1rem auto;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  /* Mobile Tweaks */
  @media (max-width: 480px) {
    .nutrient-grid { grid-template-columns: 1fr; gap: 1.5rem; }
  }
</style>