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
      <span class="material-icons">bar_chart</span>
      Statistics Page
    </summary>
    <div class="section-content">
      <h4>Viewing Your Progress</h4>
      <p>
        The Statistics page helps you visualize your nutrient intake over time with interactive
        charts and date navigation.
      </p>

      <h4>Chart Views</h4>
      <p>
        Switch between different time periods using the view buttons:
      </p>
      <ul>
        <li>
          <strong>Daily:</strong> <span class="material-icons inline-icon">today</span> View hourly
          breakdown of when you logged foods throughout the day
        </li>
        <li>
          <strong>Weekly:</strong> <span class="material-icons inline-icon">view_week</span> See
          your daily totals for the current week (Sunday-Saturday)
        </li>
        <li>
          <strong>Monthly:</strong> <span class="material-icons inline-icon">calendar_month</span>
          Review daily totals for the entire month
        </li>
        <li>
          <strong>Yearly:</strong> <span class="material-icons inline-icon">date_range</span> Track
          monthly averages throughout the year
        </li>
      </ul>

      <h4>Interacting with Charts</h4>
      <ul>
        <li>
          <strong>Bar Details:</strong> Tap any <span class="material-icons inline-icon">bar_chart</span>
          bar in the chart to see the specific total for that period
        </li>
        <li>
          <strong>Date Navigation:</strong> In weekly and monthly views, <strong>tap on a date label</strong>
          (shown in your theme's accent color with an underline) to jump directly to that date on the
          tracking page to review what you ate
        </li>
        <li>
          <strong>Navigate Periods:</strong> Use the <span class="material-icons inline-icon">chevron_left</span>
          and <span class="material-icons inline-icon">chevron_right</span> arrows to move between
          weeks, months, or years
        </li>
      </ul>

      <h4>Nutrient Selection</h4>
      <p>
        Use the nutrient dropdown selector to view statistics for any of the 24+ tracked nutrients.
        Your daily goal is shown as a reference line on the chart to help you see when you're
        meeting your targets.
      </p>
    </div>
  </details>

  <details class="guide-section">
    <summary>
      <span class="material-icons">restaurant</span>
      Database Page
    </summary>
    <div class="section-content">
      <h4>Browse All Foods</h4>
      <p>
        The Database page lets you explore all foods in the USDA database and your custom foods.
        Use the powerful search, filter, and sort tools to find exactly what you're looking for.
      </p>

      <h4>Search & Filter</h4>
      <ul>
        <li>
          <strong>Search:</strong> Use the <span class="material-icons inline-icon">search</span>
          search box to find specific foods by name
        </li>
        <li>
          <strong>Filter by Source:</strong> Use the <span class="material-icons inline-icon">filter_list</span>
          filter buttons to show:
          <ul>
            <li><strong>Available</strong> - Foods visible in Add Food dialog</li>
            <li><strong>Database</strong> - All USDA database foods</li>
            <li><strong>User</strong> - Your custom (user-entered) foods</li>
          </ul>
        </li>
        <li>
          <strong>Filter by Journal History:</strong> Check the "Show only foods I've journaled"
          checkbox to display only foods you've previously logged. This is helpful when you want
          to review or re-add foods from your history.
        </li>
        <li>
          <strong>Nutrient Filter:</strong> Use the nutrient dropdown to show only foods within
          specific nutrient ranges (e.g., high protein, good source of calcium)
        </li>
      </ul>

      <h4>Sort Results</h4>
      <p>
        Use the <span class="material-icons inline-icon">sort</span> sort buttons to organize by:
      </p>
      <ul>
        <li><strong>Name</strong> - Alphabetical order</li>
        <li><strong>Nutrient</strong> - Highest to lowest nutrient content</li>
        <li><strong>Type</strong> - Group by food category (Favorites, Custom, Database)</li>
        <li>
          <strong>Frequency</strong> - Most to least frequently logged (only visible when
          "Show only foods I've journaled" is checked)
        </li>
      </ul>

      <h4>Food Actions</h4>
      <ul>
        <li>
          <strong>Toggle Visibility:</strong> Click the <span class="material-icons inline-icon">check_box_outline_blank</span>
          checkbox on any database food to control whether it appears in Add Food search results.
          Foods with a red X are hidden and won't appear when adding foods.
        </li>
        <li>
          <strong>View Details:</strong> Tap the <span class="material-icons inline-icon">info</span>
          info icon on database foods to view complete nutrient information, serving options, and
          source data provenance
        </li>
        <li>
          <strong>View Journal History:</strong> When "Show only foods I've journaled" is checked,
          tap the <span class="material-icons inline-icon">history</span> history icon to see all
          dates when you've logged that food. In the history modal, you can tap any date to jump
          directly to that day's tracker.
        </li>
        <li>
          <strong>Edit/Delete Custom Foods:</strong> For your custom foods, use the
          <span class="material-icons inline-icon">edit</span> edit or
          <span class="material-icons inline-icon">delete</span> delete icons to manage them
        </li>
      </ul>

      <h4>Database Info</h4>
      <p>
        The header's <span class="material-icons inline-icon">info</span> icon provides details
        about the USDA database source, curation process, and data provenance.
      </p>
    </div>
  </details>

  <details class="guide-section">
    <summary>
      <span class="material-icons">description</span>
      Report Page
    </summary>
    <div class="section-content">
      <h4>Generate Printable Reports</h4>
      <p>
        The Report page creates a professional summary of your nutrient tracking history that
        you can print or share with healthcare providers.
      </p>

      <h4>How to Use</h4>
      <ul>
        <li>
          <strong>Select Nutrient:</strong> Use the nutrient dropdown to choose which nutrient
          to include in the report
        </li>
        <li>
          <strong>View Report:</strong> The report automatically generates with your complete
          tracking history
        </li>
        <li>
          <strong>Print or Save:</strong> Use your browser's print function to save as PDF or
          print directly
        </li>
      </ul>

      <h4>What's Included</h4>
      <p>
        Reports automatically include multiple time periods for comprehensive analysis:
      </p>
      <ul>
        <li><strong>All-Time Summary:</strong> Total days tracked, daily average, and goal achievement percentage across your entire history</li>
        <li><strong>Past 12 Months:</strong> Monthly average chart showing trends over the past year</li>
        <li><strong>Past 30 Days:</strong> Daily totals chart for recent activity</li>
        <li><strong>Past 7 Days:</strong> Detailed daily breakdown with goal achievement indicators</li>
      </ul>
      <p>
        All data is formatted for easy sharing with doctors, dietitians, or for your personal records.
      </p>
    </div>
  </details>

  <details class="guide-section">
    <summary>
      <span class="material-icons">settings</span>
      Settings Page
    </summary>
    <div class="section-content">
      <h4>Customize Your Experience</h4>
      <p>
        The Settings page lets you personalize the app, manage your data, and configure
        nutrient tracking preferences.
      </p>

      <h4>Nutrients</h4>
      <ul>
        <li>
          <strong>Select Nutrients to Display:</strong> Choose up to 4 nutrients to show on
          your summary card and throughout the app (default: Protein, Calcium, Fiber, Vitamin D)
        </li>
        <li>
          <strong>Set Daily Goals:</strong> Customize your target intake for each nutrient
          based on your dietary needs and health goals
        </li>
      </ul>

      <h4>Appearance</h4>
      <ul>
        <li>
          <strong>Theme:</strong> <span class="material-icons inline-icon">brightness_6</span>
          Choose between Light, Dark, or Auto (follows system preference)
        </li>
        <li>
          <strong>Color Scheme:</strong> <span class="material-icons inline-icon">palette</span>
          Select your preferred accent color (Blue, Purple, Green, Orange, Red, Teal)
        </li>
      </ul>

      <h4>Data Management</h4>

      {#if FEATURES.SYNC_ENABLED}
        <h5>Syncing Across Devices</h5>
        <p>
          <span class="material-icons inline-icon">sync</span> Keep your data automatically
          updated across multiple devices (e.g., phone and tablet). Requires an internet connection.
        </p>
        <ul>
          <li>
            <strong>Sync Status:</strong> The <span class="material-icons inline-icon">cloud</span>
            cloud icon in the header shows your sync status. Tap it to manually trigger a sync.
          </li>
          <li>
            <strong>Set Up Sync:</strong>
            <ol class="steps-list">
              <li>On your first device, go to Settings > Data > Sync and tap "Create New Sync"</li>
              <li>A QR code and sharing URL will be displayed</li>
              <li>On your second device, go to Settings > Data > Sync, tap "Join Existing Sync",
                  and scan the QR code or paste the URL</li>
            </ol>
          </li>
        </ul>
      {/if}

      <h5>Backup & Restore</h5>
      <p>
        <span class="material-icons inline-icon">backup</span> Save a complete copy of your
        data to your device for safekeeping. Different from sync - this is a manual, one-time
        save.
      </p>
      <ul>
        <li>
          <strong>Create Backup:</strong> Downloads a JSON file containing all your app data
        </li>
        <li>
          <strong>Restore Data:</strong> Import a previously saved backup file
          <br />
          <strong class="warning-text">Warning:</strong> Restoring will overwrite all current
          data in the app
        </li>
      </ul>

      <h5>Export Data</h5>
      <p>
        <span class="material-icons inline-icon">file_download</span> Export your journal
        entries to a CSV file for analysis in spreadsheet applications like Excel or Google Sheets.
      </p>
      <ul>
        <li>
          <strong>Export to CSV:</strong> Creates a file with your complete journal history
          including dates, foods, nutrients, and serving details
        </li>
        <li>
          Unlike backups, exports are designed for data analysis and cannot be used to restore
          your data
        </li>
      </ul>

      <h4>App Updates</h4>
      <p>
        <span class="material-icons inline-icon">system_update</span> The app updates safely
        without interrupting your tracking. Updates won't install while you're adding entries
        or making changes.
      </p>
      <ul>
        <li>
          <strong>Check for Updates:</strong> Tap "Check for Updates" to see if a new version
          is available
        </li>
        <li>
          <strong>Install Updates:</strong> When ready, tap "Update App" to reload with the
          new version. All your data is safely preserved during updates.
        </li>
      </ul>
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

  .section-content h5 {
    margin-top: var(--spacing-lg);
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: 600;
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
