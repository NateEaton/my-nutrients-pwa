# My Nutrients PWA - Documentation

Welcome to the My Nutrients PWA documentation wiki!

## About

My Nutrients is a Progressive Web App for tracking essential nutrients—protein, calcium, fiber, vitamins, minerals, and more. Built with SvelteKit and IndexedDB for offline-first functionality.

**Live App:** [ca-pwa.vercel.app](https://ca-pwa.vercel.app/)

## Key Features

- **Multi-Nutrient Tracking**: Track up to 4 nutrients simultaneously from 25+ options
- **Curated Food Database**: 3,500+ USDA-sourced foods with comprehensive nutrient data
- **Smart Scan**: Add foods via barcode scanning (USDA + OpenFoodFacts)
- **Offline-First**: Fully functional without internet (IndexedDB storage)
- **Cross-Device Sync**: Optional encrypted synchronization
- **Data Ownership**: Complete backup/restore and CSV export

## Documentation

### For Users

- **[Feature Overview](https://github.com/NateEaton/my-nutrients-pwa#readme)** - Main README with feature list
- **Future Enhancements** - Planned features and roadmap

### For Developers

- **[[Architecture]]** - System design, tech stack, and data flow
- **[[Technical Decisions]]** - Architectural decision records (ADRs)
- **[[Developer Guide]]** - Codebase structure and development patterns
- **[[UI Specification]]** - Component specs and user flows

### Data Pipeline

- **[[Data Pipeline]]** - Food database generation from USDA sources
- **[[Nutrient Reference]]** - Complete nutrient codes and mappings

### Advanced Topics

- **[[Migration Guide]]** - Data migration strategies
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
