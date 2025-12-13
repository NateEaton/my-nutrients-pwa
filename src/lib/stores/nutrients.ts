/*
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
 */

/**
 * @fileoverview Main application state management using Svelte stores.
 * Provides reactive stores for calcium tracking data, settings, and UI state.
 */

import { writable, derived, get } from 'svelte/store';
import type { CalciumSettings } from '$lib/types/calcium';
import type { FoodEntry, CustomFood, UserServingPreference } from '$lib/types/nutrients';
import { NutrientService } from '$lib/services/NutrientService';

// CalciumState interface (kept here for backward compatibility)
interface CalciumState {
  currentDate: string;
  foods: FoodEntry[];
  customFoods: CustomFood[];
  favorites: Set<number>;
  hiddenFoods: Set<number>;
  servingPreferences: Map<number, UserServingPreference>;
  settings: CalciumSettings;
  isLoading: boolean;
}

// Toast store for notifications
export const toastStore = writable<{ message: string; type: 'info' | 'success' | 'error' | 'warning' }>({
  message: '',
  type: 'info'
});

// Helper function to show toast
export function showToast(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  toastStore.set({ message, type });
}

// Get today's date string (fixed for timezone)
function getTodayString(): string {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().split('T')[0];
}

// Main application state
export const nutrientState = writable<CalciumState>({
  currentDate: getTodayString(),
  foods: [], // This array will be sorted in-place by NutrientService
  customFoods: [],
  favorites: new Set<number>(),
  hiddenFoods: new Set<number>(),
  servingPreferences: new Map<number, UserServingPreference>(),
  settings: {
    dailyGoal: 1000,
    sortBy: 'time',
    sortOrder: 'desc',
    theme: 'auto'
  },
  isLoading: true
});

// Derived stores for computed values
export const dailyTotal = derived(
  nutrientState,
  ($state) => $state.foods.reduce((sum, food) => sum + food.calcium, 0)
);

export const goalProgress = derived(
  [dailyTotal, nutrientState],
  ([$total, $state]) => Math.min(Math.round(($total / $state.settings.dailyGoal) * 100), 100)
);

// REMOVED: sortedFoods derived store - foods array is now sorted in-place
// The foods array in nutrientState is maintained in sorted order by NutrientService

// Shared NutrientService instance 
export const nutrientService = new NutrientService();

// Current daily goal (derived for easy access)
export const dailyGoal = derived(
  nutrientState,
  ($state) => $state.settings.dailyGoal
);

// Helper stores for UI state
export const isToday = derived(
  nutrientState,
  ($state) => $state.currentDate === getTodayString()
);

// Access to the main foods array (which is kept sorted)
export const foods = derived(
  nutrientState,
  ($state) => $state.foods
);

// Current sort settings for UI display
export const sortSettings = derived(
  nutrientState,
  ($state) => ({
    sortBy: $state.settings.sortBy,
    sortOrder: $state.settings.sortOrder
  })
);