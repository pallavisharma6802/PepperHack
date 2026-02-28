/**
 * Zustand store - Person 3 owns this.
 * Mirrors backend/schema.py shapes. P4 reads dishList + agentStatus.
 */
import { create } from 'zustand'

// Agent keys match schema: scanner | photo | recommender | nutritionist
const INITIAL_AGENT_STATUS = {
  scanner: 'pending',
  photo: 'pending',
  recommender: 'pending',
  nutritionist: 'pending',
}

export const useStore = create((set) => ({
  // Restaurants from GET /restaurants
  restaurants: [],
  restaurantsLoading: false,
  restaurantsError: null,

  // Active restaurant (selected for scan)
  activeRestaurant: null,

  // Dishes from /analyze SSE - P4 reads this for MenuDisplay
  dishList: [],
  activeDishes: [],

  // Agent status - P3 updates from SSE, P4 uses for sounds
  agentStatus: INITIAL_AGENT_STATUS,

  // Allergen filters - P4 owns the filter UI, but store is shared
  allergenFilters: [],

  // Actions
  setRestaurants: (restaurants) => set({ restaurants, restaurantsError: null }),
  setRestaurantsLoading: (loading) => set({ restaurantsLoading: loading }),
  setRestaurantsError: (error) => set({ restaurantsError: error }),

  setActiveRestaurant: (restaurant) => set({ activeRestaurant: restaurant }),

  setDishList: (dishes) => set({ dishList: dishes }),
  setActiveDishes: (dishes) => set({ activeDishes: dishes }),

  setAgentStatus: (status) => set((state) => ({
    agentStatus: { ...state.agentStatus, ...status },
  })),
  resetAgentStatus: () => set({ agentStatus: INITIAL_AGENT_STATUS }),

  setAllergenFilters: (filters) => set({ allergenFilters: filters }),

  // Merge SSE payload into dishList (P3's useAnalyzeStream does this)
  mergeAnalyzePayload: (agent, payload) => set((state) => {
    if (agent === 'scanner' && payload.dishes) {
      return { dishList: payload.dishes }
    }
    if (['photo', 'recommender', 'nutritionist'].includes(agent) && payload.dishes) {
      const updated = state.dishList.map((d) => {
        const update = payload.dishes.find((p) => p.id === d.id)
        return update ? { ...d, ...update } : d
      })
      return { dishList: updated }
    }
    return {}
  }),

  // Reset for new scan
  resetScan: () => set({
    dishList: [],
    activeDishes: [],
    agentStatus: INITIAL_AGENT_STATUS,
  }),
}))
