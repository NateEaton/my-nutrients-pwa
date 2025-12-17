# My Nutrients PWA - Documentation

Welcome to the My Nutrients PWA documentation wiki!

## About

My Nutrients is a Progressive Web App for tracking essential nutrients—protein, calcium, fiber, vitamins, minerals, and more. Built with SvelteKit and IndexedDB for offline-first functionality.

**Live App:** [ca-pwa.vercel.app](https://ca-pwa.vercel.app/)

## Core Features

### Tracking & Data Entry
- **Multi-Nutrient Tracking**: Track up to 4 nutrients simultaneously from 25+ available options including macronutrients, vitamins, minerals, and omega fatty acids.
- **Curated Food Database**: Log entries from a comprehensive database of thousands of USDA-sourced foods, intelligently curated for relevance and usability. The database can be extended through UPC scans of USDA and OpenFoodFacts databases and the ability to add custom foods.
- **Smart Scan**: Add foods quickly using your device's camera to scan UPC/EAN barcodes. Supports both USDA FoodData Central and OpenFoodFacts databases, with manual barcode entry option for quick lookup.
- **Custom Foods**: Add and manage your own food items with detailed nutrient information. Custom foods support the same features as database foods, including serving memory and favorites.
- **Multi-Measure Support**: Many foods offer multiple serving options (cups, ounces, pieces, etc.). The app remembers both your preferred serving size and measurement unit for each food.
- **Favorites & Serving Memory**: Mark foods as favorites for quick access. The app remembers your preferred serving sizes and measure selections, making repeat entries effortless.
- **Database Management**: Hide unwanted foods from search results, filter by nutrient ranges (preset or custom), and sort by name, nutrient content, or food type.

### Analysis & Reporting
- **Personalized Goals**: Set and adjust your personal daily nutrient intake targets for each tracked nutrient.
- **Data Visualization**: View your progress with interactive daily, weekly, monthly, and yearly charts on the Statistics page.
- **Printable Reports**: Generate comprehensive health reports to share with healthcare professionals.
- **CSV Export**: Export your complete journal history to CSV format for analysis in spreadsheet applications.

### Synchronization & Data Management
- **Cross-Device Sync** *(Optional)*: Keep your data synchronized across all your devices automatically and securely. Requires Cloudflare Worker deployment.
- **Backup & Restore**: Create complete backups of your data (journal entries, custom foods, settings, serving preferences) and restore from backup files.
- **Data Privacy**: Your data is stored locally on your device and is end-to-end encrypted during sync. No third-party tracking or analytics.

### Progressive Web App
- **Offline-First**: Fully functional without an internet connection (except for sync and Smart Scan features).
- **Installable**: Add to your device's home screen for a native app-like experience.
- **Responsive Design**: Optimized for mobile, tablet, and desktop devices with light and dark theme support.

## Documentation

### For Users

- **[[Future Enhancements]]** - Planned features and roadmap

### For Developers

- **[[Architecture]]** - System design, tech stack, and data flow
- **[[Technical Decisions]]** - Architectural decision records (ADRs)
- **[[Developer Guide]]** - Codebase structure and development patterns
- **[[UI Specification]]** - Component specs and user flows

### Data Pipeline

- **[[Data Pipeline]]** - Food database generation from USDA sources
- **[[Nutrient Reference]]** - Complete nutrient codes and mappings

### Advanced Topics

- **[[Future Features]]** - AI Vision OCR implementation plan

## Tech Stack

- **Frontend**: SvelteKit 2.x + Svelte 4.x
- **Storage**: IndexedDB (client-side)
- **Data Source**: USDA FoodData Central
- **Build**: Vite
- **Deployment**: Static site (Vercel)
- **Sync**: Cloudflare Workers (optional)

## Quick Links

- **[GitHub Repository](https://github.com/NateEaton/my-nutrients-pwa)**
- **[Live Demo](https://ca-pwa.vercel.app/)**
- **[Issues & Feedback](https://github.com/NateEaton/my-nutrients-pwa/issues)**

## Contributing

See the [[Developer Guide]] for information on:
- Setting up the development environment
- Codebase structure and patterns
- Data pipeline workflow
- Commit conventions

---

**Version**: 1.0.0 (December 2025)
**License**: GPL v3
