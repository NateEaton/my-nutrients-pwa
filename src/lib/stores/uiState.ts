/*
 * My Nutrients Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 */

import { writable } from 'svelte/store';

export interface DatabaseViewState {
  searchQuery: string;
  selectedFilter: string;
  sortBy: string;
  sortOrder: string;
  typeSortRotation: number;
  selectedNutrientForControls: string;
  nutrientFilter: {
    type: string;
    preset: string | null;
    min: number | null;
    max: number | null;
  };
}

export const defaultDatabaseState: DatabaseViewState = {
  searchQuery: "",
  selectedFilter: "available",
  sortBy: "calcium",
  sortOrder: "desc",
  typeSortRotation: 0,
  selectedNutrientForControls: "calcium",
  nutrientFilter: {
    type: "all",
    preset: null,
    min: null,
    max: null,
  }
};

// Create a writable store with defaults
export const databaseViewState = writable<DatabaseViewState>(defaultDatabaseState);

// Helper to reset if needed
export function resetDatabaseViewState() {
  databaseViewState.set(defaultDatabaseState);
}

// Add these exports to the existing file:

export interface StatsViewState {
  currentView: string;
  selectedNutrient: string | null;
}

export interface ReportViewState {
  selectedNutrient: string | null;
}

export const statsViewState = writable<StatsViewState>({
  currentView: 'weekly',
  selectedNutrient: null
});

export const reportViewState = writable<ReportViewState>({
  selectedNutrient: null
});