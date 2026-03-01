/**
 * allergenStore.js — P4 owned.
 * Tracks which allergens the user wants to AVOID.
 * Separate from the shared useStore so P4 can iterate freely.
 *
 * ── Per-user ──────────────────────────────────────────────────
 * activeAllergens: Set<string>      — preset toggles
 * customText:      string           — free-text comma-separated extras
 *
 * ── Table mode ("Order for the Table") ───────────────────────
 * tableMode:    boolean             — enable party-member allergen merging
 * partyMembers: Array<{id, name, allergens: Set<string>}>
 *
 * isDishFlagged(dish) — dims dish if any allergen in the union set matches
 */
import { create } from 'zustand'

export const ALLERGEN_OPTIONS = ['Gluten', 'Dairy', 'Nuts', 'Eggs', 'Shellfish', 'Soy']

const useAllergenStore = create((set, get) => ({
  // ── Per-user ────────────────────────────────────────────────────────────────
  activeAllergens: new Set(),
  customText: '',

  toggleAllergen: (allergen) =>
    set((state) => {
      const next = new Set(state.activeAllergens)
      if (next.has(allergen)) next.delete(allergen)
      else next.add(allergen)
      return { activeAllergens: next }
    }),

  setCustomText: (text) => set({ customText: text }),

  // ── Table mode ──────────────────────────────────────────────────────────────
  tableMode: false,
  partyMembers: [],

  setTableMode: (on) => set({ tableMode: on }),

  addPartyMember: (name = '') =>
    set((state) => ({
      partyMembers: [
        ...state.partyMembers,
        {
          id: Date.now(),
          name: name.trim() || `Person ${state.partyMembers.length + 2}`,
          allergens: new Set(),
        },
      ],
    })),

  removePartyMember: (id) =>
    set((state) => ({ partyMembers: state.partyMembers.filter((m) => m.id !== id) })),

  togglePartyMemberAllergen: (memberId, allergen) =>
    set((state) => ({
      partyMembers: state.partyMembers.map((m) => {
        if (m.id !== memberId) return m
        const next = new Set(m.allergens)
        if (next.has(allergen)) next.delete(allergen)
        else next.add(allergen)
        return { ...m, allergens: next }
      }),
    })),

  clearAll: () =>
    set({ activeAllergens: new Set(), customText: '', partyMembers: [], tableMode: false }),

  // ── isDishFlagged ───────────────────────────────────────────────────────────
  // Builds a union (self + all party members when tableMode is on),
  // normalised to lowercase for case-insensitive matching.
  isDishFlagged: (dish) => {
    const { activeAllergens, customText, tableMode, partyMembers } = get()
    if (!dish?.allergens?.length) return false

    const union = new Set()
    activeAllergens.forEach((a) => union.add(a.toLowerCase()))
    customText
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .forEach((a) => union.add(a))

    if (tableMode) {
      partyMembers.forEach((m) =>
        m.allergens.forEach((a) => union.add(a.toLowerCase()))
      )
    }

    if (union.size === 0) return false
    return dish.allergens.some((a) => union.has(a.toLowerCase()))
  },
}))

export default useAllergenStore
