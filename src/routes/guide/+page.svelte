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
  import { FEATURES } from "$lib/utils/featureFlags";
</script>

<svelte:head>
  <title>User Guide - My Nutrients</title>
</svelte:head>

<div class="guide-container">
  <details class="guide-section" open>
    <summary>
      <span class="material-icons">rocket_launch</span>
      Getting Started
    </summary>
    <div class="section-content">
      <h4>Welcome to My Nutrients!</h4>
      <p>
        My Nutrients helps you track essential nutrients (protein, calcium, fiber, vitamins, and more)
        to support your health and meet nutritional goals. Your data is stored locally on your device
        for offline access, or encrypted on the server when using cross-device sync.
      </p>

      <h4>First Steps</h4>
      <ol class="steps-list">
        <li>
          <strong>Find Your Foods:</strong> Search the database, scan barcodes, or add custom
          foods with detailed nutrient information
        </li>
        <li>
          <strong>Log Your Intake:</strong> Add foods throughout the day with automatic serving
          size memory and favorites
        </li>
        <li>
          <strong>Track Progress:</strong> View daily totals, weekly trends, and long-term
          statistics to meet your goals
        </li>
      </ol>
    </div>
  </details>

  <details class="guide-section">
    <summary>
      <span class="material-icons">track_changes</span>
      Tracking Your Daily Nutrients
    </summary>
    <div class="section-content">
      <h4>Date Navigation & Goal</h4>
      <p>
        Use the <span class="material-icons inline-icon">chevron_left</span> and
        <span class="material-icons inline-icon">chevron_right</span>
        arrows on the summary card to move between days. You can also
        <strong>swipe left or right</strong> on the summary card to quickly change
        the date. The card displays your daily total and progress toward your daily goal.
      </p>

      <h4>Adding & Editing Foods</h4>
      <p>
        Tap the large <strong>+</strong> button on the main screen to open the "Add
        Entry" dialog. From there, you can:
      </p>
      <ul>
        <li>
          <strong>Search the Database:</strong> Start typing a food name. Custom
          foods and favorites that match your search will appear at the top of the
          results.
        </li>
        <li>
          <strong>Add a Custom Food:</strong> Tap the
          <span class="material-icons inline-icon">add_circle</span> icon at the
          top to switch to custom food mode, where you can enter your own food name
          and nutrient values.
        </li>
        <li>
          <strong>Smart Scan:</strong> Tap the
           <span class="material-icons inline-icon">photo_camera</span> icon to scan
           a product's UPC/EAN barcode using your device's camera. Choose between USDA or
           OpenFoodFacts databases for lookup. Use the flashlight icon to enable your
           camera flash in low light, or tap the keyboard icon to manually enter a barcode number.
        </li>
        <li>
          <strong>Edit or Delete:</strong> To change an entry, simply tap it on the
          main screen to open the edit dialog. You can update its details or tap
          the <span class="material-icons inline-icon">delete</span> trash icon to delete it.
        </li>
      </ul>

      <h4>Sorting Entries</h4>
      <p>
        On the main tracking screen, use the <span class="material-icons inline-icon">sort</span> sort buttons
        to organize your daily entries by time added, food name, or nutrient content.
      </p>

      <h4>Food Source Icons</h4>
      <p>
        Each entry displays a small icon indicating its source: a pencil
        <span class="material-icons inline-icon">edit</span> for manually added foods
        or a barcode scanner <span class="material-icons inline-icon">qr_code_scanner</span>
        for UPC-scanned items.
      </p>

      <h4>Serving Sizes & Favorites</h4>
      <ul>
        <li>
          <strong>Adjust Servings:</strong> After selecting a food from the search
          results, you can change the serving quantity and unit. The app provides
          "Quick conversions" for common units.
        </li>
        <li>
          <strong>Multiple Serving Options:</strong> Many USDA foods offer multiple 
          serving options (cups, ounces, pieces, etc.). When available, a dropdown 
          appears letting you choose your preferred unit. 
        </li>
        <li>
          <strong>Serving Memory:</strong> The app remembers both your preferred serving 
          size and serving option for each database food, making future entries faster 
          and more consistent.
          When adding a food with a remembered serving size/selection, if you want to clear
          what was saved click the <span class="material-icons inline-icon">refresh</span> 
          refresh icon to the right of Serving Size.
        </li>
        <li>
          <strong>Favorites:</strong> Tap the
          <span class="material-icons inline-icon">star_border</span> icon in the
          "Add Entry" dialog to mark a database food as a favorite. This helps it
          appear higher in search results.
        </li>
      </ul>
    </div>
  </details>

  <details class="guide-section">
    <summary>
      <span class="material-icons">science</span>
      Managing Nutrients
    </summary>
    <div class="section-content">
      <h4>Choosing Which Nutrients to Track</h4>
      <p>
        My Nutrients supports tracking 24+ essential nutrients. You can customize which nutrients
        appear throughout the app:
      </p>
      <ul>
        <li>
          <strong>Nutrient Picks:</strong> In <strong>Settings > Nutrients</strong>, select up to
          4 nutrients to display on your summary card, food entries, and throughout the app. The app
          comes with sensible defaults (Protein, Calcium, Fiber, Vitamin D), but you can customize
          based on your dietary needs.
        </li>
        <li>
          <strong>Daily Goals:</strong> Also in <strong>Settings > Nutrients</strong>, set your
          target intake for each nutrient. These goals appear as progress bars on the summary card
          and determine when you've met your daily targets.
        </li>
      </ul>

      <h4>Viewing Different Nutrients</h4>
      <p>Beyond your selected nutrient picks, you can view any tracked nutrient:</p>
      <ul>
        <li>
          <strong>Summary Card:</strong> The summary card displays your chosen nutrients with
          progress bars. Swipe left/right or use arrow buttons to change dates.
        </li>
        <li>
          <strong>Sort by Nutrient:</strong> On the main tracking page, <strong>long press</strong>
          the nutrient sort button to choose a different nutrient for sorting your entries.
        </li>
        <li>
          <strong>Statistics Page:</strong> Use the nutrient selector dropdown to view charts and
          trends for any tracked nutrient across different time periods.
        </li>
        <li>
          <strong>Report Page:</strong> Use the nutrient selector to choose which nutrient to include
          in your printable report.
        </li>
        <li>
          <strong>Database Page:</strong> Use the nutrient selector to sort and filter foods by any
          nutrient. This helps you find foods high in specific nutrients you're targeting.
        </li>
      </ul>
    </div>
  </details>

  <details class="guide-section">
    <summary>
      <span class="material-icons">apps</span>
      Other App Features
    </summary>
    <div class="section-content">
      <p>
        <strong>Statistics Page:</strong> Visualize your intake. Switch between
        <span class="material-icons inline-icon">date_range</span> daily,
        weekly, monthly, and yearly views. Tap a <span class="material-icons inline-icon">bar_chart</span> bar
        in the chart to see the specific total for that period. In weekly and monthly views,
        you can also <strong>tap on a date label</strong> (shown in your theme's accent color with
        an underline) to jump directly to that date on the tracking page to review what you ate.
      </p>
      <p>
        <strong>Database Page:</strong> Browse all foods in the database and your custom foods.
      </p>
      <ul>
        <li>
          <strong>Search:</strong> Use the <span class="material-icons inline-icon">search</span>
          search box to find specific foods by name.
        </li>
        <li>
          <strong>Filter Foods:</strong> Use the <span class="material-icons inline-icon">filter_list</span>
          filter buttons to show foods available in Add Food dialog, all database foods, or your
          custom (user-entered) foods.
        </li>
        <li>
          <strong>Sort Results:</strong> Use the <span class="material-icons inline-icon">sort</span>
          sort buttons to organize by food name, nutrient content, or food type.
        </li>
        <li>
          <strong>Nutrient Filter:</strong> Use the
          nutrient dropdown to show only foods within specific nutrient ranges.
        </li>
        <li>
          <strong>Toggle Visibility:</strong> Click the <span class="material-icons inline-icon">check_box_outline_blank</span>
          checkbox on any food item to control whether it appears in search results. Foods with a red X will 
          are not available when adding a food item.
        </li>
        <li>
          <strong>View Details:</strong> Tap the <span class="material-icons inline-icon">info</span>
          icon on database foods to view detailed information in the food database documentation page.
        </li>
        <li>
          <strong>Database Info:</strong> The header's <span class="material-icons inline-icon">info</span>
          icon provides details about the database source and curation process.
        </li>
      </ul>
      <p>
        <strong>Report Page:</strong> Generate a printable summary of your history
        to share with a healthcare provider.
      </p>
      <p>
        <strong>Settings Page:</strong> Adjust your <span class="material-icons inline-icon">flag</span> daily goal,
        change the <span class="material-icons inline-icon">brightness_6</span> app theme and
        <span class="material-icons inline-icon">palette</span> color,
        and manage data {#if FEATURES.SYNC_ENABLED}sync, {/if}exports, and backups.
      </p>
    </div>
  </details>

  {#if FEATURES.SYNC_ENABLED}
    <details class="guide-section">
      <summary>
        <span class="material-icons">sync</span>
        Syncing Across Devices
      </summary>
      <div class="section-content">
        <h4>What It Is</h4>
        <p>
          Sync keeps your data automatically updated across multiple devices
          (e.g., your phone and a tablet). It requires an internet connection to
          work.
        </p>

        <h4>Sync Status</h4>
        <p>
          The <span class="material-icons">cloud</span> cloud icon in the header shows your 
          current sync status: a cross through it when sync not enabled, checked when synced, 
          animated when syncing, or red if there's an error. Tap the icon to manually trigger 
          a sync.
        </p>

        <h4>How to Set Up</h4>
        <ol class="steps-list">
          <li>
            On your first device, go to <strong>Settings > Data > Sync</strong> and
            tap "Create New Sync".
          </li>
          <li>A QR code and sharing URL will be displayed on the screen.</li>
          <li>
            On your second device, go to <strong>Settings > Data > Sync</strong>,
            tap "Join Existing Sync", and either scan the QR code or paste the sharing 
            URL from your first device.
          </li>
        </ol>
        <p>Your devices are now connected and will sync automatically.</p>
      </div>
    </details>
  {/if}

  <details class="guide-section">
    <summary>
      <span class="material-icons">backup</span>
      Backing Up & Restoring
    </summary>
    <div class="section-content">
      <h4>What It Is</h4>
      <p>
        This feature lets you save a single file of all your data to your device
        for safekeeping. This is different from sync, which is automatic and
        continuous.
      </p>

      <h4>How to Use</h4>
      <p>In <strong>Settings > Data</strong>, you will find two options:</p>
      <ul>
        <li>
          <strong>Create Backup:</strong> Downloads a JSON file of your entire app
          data.
        </li>
        <li>
          <strong>Restore Data:</strong> Lets you select a backup file to
          import.
          <br />
          <strong class="warning-text">Warning:</strong> Restoring from a backup
          will overwrite all current data in the app.
        </li>
      </ul>
    </div>
  </details>

  <details class="guide-section">
    <summary>
      <span class="material-icons">file_download</span>
      Exporting Data
    </summary>
    <div class="section-content">
      <h4>What It Is</h4>
      <p>
        Export creates a CSV (comma-separated values) file of all your journal entries,
        which you can open in spreadsheet applications like Excel or Google Sheets for
        analysis or record-keeping.
      </p>

      <h4>How to Use</h4>
      <p>
        In <strong>Settings > Data</strong>, tap <strong>Export to CSV</strong>.
        The app will generate a file containing your complete journal history with
        dates, food names, nutrient amounts, and serving details. Unlike backups,
        exports are designed for data analysis and cannot be used to restore your data.
      </p>
    </div>
  </details>

  <details class="guide-section">
    <summary>
      <span class="material-icons">system_update</span>
      App Updates
    </summary>
    <div class="section-content">
      <h4>How Updates Work</h4>
      <p>
        The app updates safely without interrupting your food tracking. When a new
        version is available, you'll see a notification letting you know. Updates are
        under your control - they won't install while you're adding food entries or
        making changes to your data.
      </p>

      <h4>Checking for Updates</h4>
      <p>
        Go to <strong>Settings > App > Check for Updates</strong> to manually check
        for new versions. If an update is available, the button will change to
        "Update App" and be highlighted.
      </p>

      <h4>Installing Updates</h4>
      <p>
        When you're ready to update, tap <strong>Update App</strong>. The app
        will reload with the new version. All your journal entries, custom foods,
        favorites, and settings are safely preserved during the update process.
      </p>
    </div>
  </details>
</div>

<style>
  .guide-container {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .guide-section {
    background-color: var(--surface);
    border: 1px solid var(--divider);
    border-radius: var(--spacing-sm);
    transition: all 0.2s ease-in-out;
  }

  .guide-section[open] {
    border-color: var(--primary-color);
  }

  .guide-section summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    cursor: pointer;
    font-size: var(--font-size-lg);
    font-weight: 500;
    color: var(--text-primary);
    list-style: none; /* Remove default marker */
  }

  .guide-section summary::-webkit-details-marker {
    display: none; /* Hide for Safari */
  }

  .guide-section summary::after {
    content: "expand_more";
    font-family: "Material Icons";
    margin-left: auto;
    transition: transform 0.2s ease;
  }

  .guide-section[open] summary::after {
    transform: rotate(180deg);
  }

  .guide-section summary .material-icons {
    color: var(--primary-color);
  }

  .section-content {
    padding: 0 var(--spacing-lg) var(--spacing-lg) var(--spacing-lg);
    color: var(--text-secondary);
    line-height: 1.6;
    border-top: 1px solid var(--divider);
  }

  .section-content h4 {
    margin-top: var(--spacing-lg);
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }

  .section-content p,
  .section-content ul,
  .section-content ol {
    margin-bottom: var(--spacing-md);
  }

  .section-content ul,
  .section-content ol {
    padding-left: var(--spacing-xl);
  }

  .section-content li {
    margin-bottom: var(--spacing-sm);
  }

  .inline-icon {
    font-size: 1em; /* Match surrounding text size */
    vertical-align: -0.125em; /* Adjust vertical alignment */
  }

  .steps-list {
    list-style-type: decimal;
  }

  .warning-text {
    color: var(--error-color);
    font-weight: 500;
  }
</style>