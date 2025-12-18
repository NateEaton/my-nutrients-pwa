# My Nutrients PWA

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-orange.svg)](https://kit.svelte.dev/)
[![Node.js: >=18.0.0](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A Progressive Web App (PWA) for tracking essential nutrients—protein, calcium, fiber, vitamins, minerals, and more. Search a comprehensive food database, add custom foods, and monitor your progress toward nutritional goals. All data is stored locally on your device with optional secure cross-device synchronization.

[**Live Demo**](https://my-nutrients-pwa.pages.dev/)

## App Screenshots

*(Note: Screenshots to be added)*

## Core Features

### Tracking & Data Entry
-   **Multi-Nutrient Tracking**: Track up to 4 nutrients simultaneously from 25+ available options including macronutrients, vitamins, minerals, and omega fatty acids.
-   **Curated Food Database**: Log entries from a comprehensive database of thousands of USDA-sourced foods, intelligently curated for relevance and usability. The database can be extended through UPC scans of USDA and OpenFoodFacts databases and the ability to add custom foods.
-   **Smart Scan**: Add foods quickly using your device's camera to scan UPC/EAN barcodes. Supports both USDA FoodData Central and OpenFoodFacts databases, with manual barcode entry option for quick lookup.
-   **Custom Foods**: Add and manage your own food items with detailed nutrient information. Custom foods support the same features as database foods, including serving memory and favorites.
-   **Multi-Measure Support**: Many foods offer multiple serving options (cups, ounces, pieces, etc.). The app remembers both your preferred serving size and measurement unit for each food.
-   **Favorites & Serving Memory**: Mark foods as favorites for quick access. The app remembers your preferred serving sizes and measure selections, making repeat entries effortless.
-   **Database Management**: Hide unwanted foods from search results, filter by nutrient ranges (preset or custom), and sort by name, nutrient content, or food type.

### Analysis & Reporting
-   **Personalized Goals**: Set and adjust your personal daily nutrient intake targets for each tracked nutrient.
-   **Data Visualization**: View your progress with interactive daily, weekly, monthly, and yearly charts on the Statistics page.
-   **Printable Reports**: Generate comprehensive health reports to share with healthcare professionals.
-   **CSV Export**: Export your complete journal history to CSV format for analysis in spreadsheet applications.

### Synchronization & Data Management
-   **Cross-Device Sync** *(Optional)*: Keep your data synchronized across all your devices automatically and securely. Requires Cloudflare Worker deployment.
-   **Backup & Restore**: Create complete backups of your data (journal entries, custom foods, settings, serving preferences) and restore from backup files.
-   **Data Privacy**: Your data is stored locally on your device and is end-to-end encrypted during sync. No third-party tracking or analytics.

### Progressive Web App
-   **Offline-First**: Fully functional without an internet connection (except for sync and Smart Scan features).
-   **Installable**: Add to your device's home screen for a native app-like experience.
-   **Responsive Design**: Optimized for mobile, tablet, and desktop devices with light and dark theme support.

## Quick Start

1.  **Open the app** in any modern web browser or install it to your home screen.
2.  **Select nutrients** in Settings to choose which nutrients you want to track (up to 4).
3.  **Add food entries** using the "+" button on the main Tracking screen.
4.  **Navigate dates** using the date navigator or swipe on the summary card to view and log entries for different days.
5.  **View your progress** on the Statistics page with interactive charts.

## Architecture Overview

My Nutrients is a modern, local-first Progressive Web App with an optional serverless backend for synchronization.

-   **Frontend (PWA)**: A SvelteKit application that handles all UI and stores data locally in the browser's IndexedDB. This allows the app to be fully functional offline.
-   **Backend (Sync Service)**: A lightweight Cloudflare Worker that stores encrypted data blobs in Cloudflare's KV store. The worker acts as a simple relay, ensuring that the service itself cannot access user data.
-   **Synchronization**: When a user makes a change, the app encrypts the entire dataset and sends it to the worker. Other paired devices periodically check with the worker for new versions, download the encrypted data, and decrypt it locally.

## Technology Stack

### Client Application (PWA)
-   **Framework**: SvelteKit 2.37.0
-   **Language**: TypeScript with JSDoc type checking
-   **Build System**: Vite 5.x
-   **Data Storage**: IndexedDB for all user data (journal entries, custom foods, settings, serving preferences)
-   **PWA Features**: `vite-plugin-pwa` for Service Workers, caching strategies, and manifest generation
-   **Cryptography**: Web Crypto API for end-to-end encryption (AES-GCM)
-   **UI Components**: Custom Svelte components with Material Icons

### Server Component (Sync)
-   **Runtime**: Cloudflare Workers (serverless edge computing)
-   **Data Storage**: Cloudflare KV (key-value store)
-   **Language**: TypeScript

### Architecture Pattern
-   **Local-First Design**: All data stored locally with optional cloud sync
-   **Modular Design**: Clear separation between UI components, services, and data layer
-   **State Management**: Svelte stores for reactive state with IndexedDB persistence
-   **Security**: End-to-end encryption for sync, Web Crypto API implementation

### External API Integrations

#### Smart Scan - UPC Barcode Lookup
-   **USDA FoodData Central API**: Primary source for barcode lookups, providing detailed nutritional information from the USDA database
    -   Requires: `VITE_FDC_API_KEY` environment variable
    -   Free API key available at [FoodData Central](https://fdc.nal.usda.gov/api-guide.html)
    -   Falls back to rate-limited DEMO_KEY if not configured
-   **OpenFoodFacts API**: Community-driven food database providing international product coverage
    -   Requires: No API key needed (public API)
    -   Fallback option when USDA data is unavailable

## Food Database Curation

The food database is a core feature containing **thousands of curated foods** from **USDA FoodData Central**, processed through a custom data pipeline located in the `source_data/` directory. This pipeline transforms raw USDA data into a user-friendly database optimized for practical nutrient tracking.

### Curation Pipeline

The data processing pipeline implements several intelligent transformations:

1. **Intelligent Serving Selection**: A context-aware algorithm analyzes food descriptions to select the most realistic and user-friendly default serving size (e.g., "1 cup" for milk, "1 slice" for bread) instead of the standard "100g".

2. **Multi-Measure Support**: Foods are enriched with multiple serving options when available. For example, cheese might offer "1 cup shredded," "1 oz," and "1 slice" alternatives, giving users flexibility in how they track their intake.

3. **Duplicate Consolidation**: Multiple USDA entries for the same food are intelligently collapsed into a single, representative entry to reduce clutter and confusion.

4. **Data Abridgement**: The dataset is filtered to improve relevance by:
   - Removing branded products that may become outdated
   - Simplifying meat cuts to common preparations
   - Collapsing different cooking methods (raw, boiled, fried, baked) into representative entries
   - Focusing on foods with significant nutrient content

5. **Multi-Nutrient Extraction**: The pipeline extracts 25+ nutrients from USDA data, including macronutrients, vitamins, minerals, and omega fatty acids, providing comprehensive nutritional profiles for each food.

This comprehensive curation process ensures the in-app database is both extensive and practical for everyday nutrient tracking. Browse available foods using the in-app Database page, which provides detailed nutrient information, serving sizes, and source attribution for each food entry.

## Installation & Deployment

### Which Deployment Should I Choose?

**Choose Standalone Mode if:**
- You don't need cross-device synchronization
- You prefer simpler deployment without backend configuration
- You want to avoid Cloudflare Worker setup

**Choose Sync Mode if:**
- You want to access your data across multiple devices
- You're comfortable with Cloudflare Worker deployment
- You need automatic data synchronization

**API Key Configuration:**
- Smart Scan works with free DEMO_KEY but has rate limits
- Get a free USDA FoodData Central API key for better performance

### Build Modes & Feature Flags

The application supports flexible deployment with optional features controlled by environment variables:

**Build Modes:**
- **Standalone Mode** (default): Local-only operation, no sync functionality, smaller bundle size
- **Sync Mode**: Full cross-device synchronization with Cloudflare Worker backend

**Optional Features:**
- **Smart Scan UPC Lookup**: Enabled by default with DEMO_KEY, enhanced with `VITE_FDC_API_KEY`

### Environment Variables

Create a `.env` file in the project root (see `.env.example` for template):

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_WORKER_URL` | No | Cloudflare Worker URL for sync. Omit for standalone mode. |
| `VITE_FDC_API_KEY` | No | USDA FoodData Central API key. Falls back to rate-limited DEMO_KEY. |

**Getting API Keys:**
- **USDA FoodData Central**: Free key at [fdc.nal.usda.gov/api-guide.html](https://fdc.nal.usda.gov/api-guide.html)

### Deployment Steps

Deploying involves two main steps: setting up the sync worker (optional) and deploying the SvelteKit frontend.

#### 1. Deploy the Cloudflare Worker (Optional - for sync functionality)

1.  Navigate to the `worker/` directory: `cd worker`
2.  Authenticate with Cloudflare: `npx wrangler login`
3.  Create a KV namespace: `npx wrangler kv:namespace create "SYNC_KV"`
4.  Copy `wrangler.toml.example` to `wrangler.toml` and add your KV namespace ID.
5.  Deploy the worker: `npx wrangler deploy`
6.  After deployment, note the URL of your worker.

#### 2. Deploy the SvelteKit PWA

1.  **Configure Environment Variables**: Create a `.env` file in the project root:
    ```bash
    # Copy template and edit
    cp .env.example .env
    ```
    Configure the variables based on your deployment needs:
    - `VITE_WORKER_URL`: Your Cloudflare Worker URL (if using sync)
    - `VITE_FDC_API_KEY`: Your USDA FoodData Central API key (optional)

2.  **Build the Application**: Use the included `deploy.sh` script or build manually:
    ```bash
    # Using deploy.sh (recommended)
    ./deploy.sh prod          # Production build
    ./deploy.sh dev           # Development build

    # Manual build
    npm run build             # Creates static site in build/ directory
    ```

    The build process:
    - Compiles SvelteKit application to static HTML/CSS/JS
    - Generates PWA service worker and manifest
    - Bundles and optimizes all assets
    - Feature flags determine which functionality is included

3.  **Deploy to Hosting**: Deploy the `build/` directory to any static hosting provider:
    - **Vercel/Netlify**: Connect your repository for automatic deployments
    - **Static Web Server**: Copy `build/` contents to your web root
    - **CDN**: Upload to S3, Cloudflare Pages, or similar

    The built application is a fully static site requiring no server-side processing.

## Data Privacy & Security

-   **Local-First**: Your data lives on your device. The app is fully functional without an internet connection (except for sync and Smart Scan features).
-   **End-to-End Encryption**: Before data is sent for synchronization, it is encrypted on your device using a key that only you have. The server stores an unreadable encrypted blob.
-   **No Third-Party Tracking**: The application does not include any analytics, ads, or third-party tracking services.
-   **Secure API Usage**: External API keys are stored in environment variables and never exposed to end users.
-   **Open Source**: Complete source code is available for review under GPL v3.
-   **Full Data Control**: You can export a complete backup of your data at any time from the Settings menu.

## Development

This project follows modern web development practices with a focus on maintainability and user privacy:

- **Component-Based Architecture**: Reusable Svelte components with clear separation of concerns
- **TypeScript Integration**: Type-safe development with checkJs configuration
- **Local-First Design**: IndexedDB for persistence, optional cloud synchronization
- **Progressive Enhancement**: Core functionality works offline with optional network features
- **Comprehensive Data Pipeline**: Custom USDA database curation with intelligent serving selection

### Getting Started

```bash
# Clone the repository
git clone https://github.com/NateEaton/my-nutrients-pwa.git
cd my-nutrients-pwa

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Contributing

This project is open source and welcomes contributions. Development setup instructions and coding guidelines can be found in the repository's documentation.

## Acknowledgments

**My Nutrients** was built by comprehensively refactoring the [My Calcium tracker](https://github.com/NateEaton/Ca-pwa), expanding it from single-nutrient tracking to a full multi-nutrient system supporting 24+ essential nutrients. The core architecture, PWA infrastructure, and user interface patterns were adapted from the original My Calcium application.

This project was developed with assistance from AI tools following best practices in modern web development. The underlying concept, architecture decisions, implementation, and testing were performed by the developer.

## License

This project is licensed under the GNU General Public License v3.0 - ensuring the software remains free and open for all users.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
