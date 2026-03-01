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

// Load history and wishlist from localStorage
const loadHistory = () => {
  try {
    const saved = localStorage.getItem('pepperhack_history')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

const loadWishlist = () => {
  try {
    const saved = localStorage.getItem('pepperhack_wishlist')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
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

  // Active dish for DishCard overlay - P4 needs this
  activeDishId: null,

  // Agent status - P3 updates from SSE, P4 uses for sounds
  agentStatus: INITIAL_AGENT_STATUS,

  // Allergen filters - P4 owns the filter UI, but store is shared
  allergenFilters: [],

  // History - visited restaurants with timestamp
  history: loadHistory(),

  // Wishlist - saved restaurants
  wishlist: loadWishlist(),

  // Actions
  setRestaurants: (restaurants) => set({ restaurants, restaurantsError: null }),
  setRestaurantsLoading: (loading) => set({ restaurantsLoading: loading }),
  setRestaurantsError: (error) => set({ restaurantsError: error }),

  setActiveRestaurant: (restaurant) => set({ activeRestaurant: restaurant }),

  setDishList: (dishes) => set({ dishList: dishes }),
  setActiveDishes: (dishes) => set({ activeDishes: dishes }),

  // P4 DishCard methods
  setActiveDishId: (dishId) => set({ activeDishId: dishId }),
  openDish: (dishId) => set({ activeDishId: dishId }),
  closeDish: () => set({ activeDishId: null }),

  setAgentStatus: (status) => set((state) => ({
    agentStatus: { ...state.agentStatus, ...status },
  })),
  resetAgentStatus: () => set({ agentStatus: INITIAL_AGENT_STATUS }),

  setAllergenFilters: (filters) => set({ allergenFilters: filters }),

  // History actions
  addToHistory: (restaurant) => set((state) => {
    const newHistory = [
      { ...restaurant, visitedAt: new Date().toISOString() },
      ...state.history.filter((r) => r.id !== restaurant.id),
    ].slice(0, 50) // Keep last 50 visits
    localStorage.setItem('pepperhack_history', JSON.stringify(newHistory))
    return { history: newHistory }
  }),

  clearHistory: () => {
    localStorage.removeItem('pepperhack_history')
    set({ history: [] })
  },

  // Wishlist actions
  addToWishlist: (restaurant) => set((state) => {
    if (state.wishlist.find((r) => r.id === restaurant.id)) return {}
    const newWishlist = [
      { ...restaurant, addedAt: new Date().toISOString() },
      ...state.wishlist,
    ]
    localStorage.setItem('pepperhack_wishlist', JSON.stringify(newWishlist))
    return { wishlist: newWishlist }
  }),

  removeFromWishlist: (restaurantId) => set((state) => {
    const newWishlist = state.wishlist.filter((r) => r.id !== restaurantId)
    localStorage.setItem('pepperhack_wishlist', JSON.stringify(newWishlist))
    return { wishlist: newWishlist }
  }),

  toggleWishlist: (restaurant) => set((state) => {
    const exists = state.wishlist.find((r) => r.id === restaurant.id)
    if (exists) {
      const newWishlist = state.wishlist.filter((r) => r.id !== restaurant.id)
      localStorage.setItem('pepperhack_wishlist', JSON.stringify(newWishlist))
      return { wishlist: newWishlist }
    } else {
      const newWishlist = [
        { ...restaurant, addedAt: new Date().toISOString() },
        ...state.wishlist,
      ]
      localStorage.setItem('pepperhack_wishlist', JSON.stringify(newWishlist))
      return { wishlist: newWishlist }
    }
  }),

  clearWishlist: () => {
    localStorage.removeItem('pepperhack_wishlist')
    set({ wishlist: [] })
  },

  // Merge SSE payload into dishList (P3's useAnalyzeStream does this)
  mergeAnalyzePayload: (agent, payload) => set((state) => {
    if (!payload?.dishes) return {}
    if (agent === 'scanner' || agent === 'complete') {
      return { dishList: payload.dishes }
    }
    if (['photo', 'recommender', 'nutritionist'].includes(agent)) {
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
    activeDishId: null,
    agentStatus: INITIAL_AGENT_STATUS,
  }),
}))
