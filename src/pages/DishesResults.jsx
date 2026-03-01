/**
 * DishesResults - Dish cards after menu scan.
 * Now using Person 4's MenuDisplay component with full features:
 * - Category filtering (Must Try, Starters, Mains, Desserts, Drinks)
 * - Allergen filtering with party mode
 * - Interactive DishCard bottom sheet
 * - MacroRing nutrition visualization
 * - Agent streaming indicators
 */
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { MenuDisplay } from '../components/MenuDisplay'

export function DishesResults() {
  const navigate = useNavigate()
  const activeRestaurant = useStore((s) => s.activeRestaurant)

  return (
    <div className="relative flex flex-col w-full h-screen overflow-hidden bg-bg">
      {/* Header with back button */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-dim">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-transparent border-none text-cream cursor-pointer text-sm font-ui"
        >
          <span className="text-lg">←</span>
          Back
        </button>
        {activeRestaurant && (
          <h1 className="font-display text-lg text-cream truncate max-w-[60%]">
            {activeRestaurant.name}
          </h1>
        )}
      </div>

      {/* Person 4's MenuDisplay with all features */}
      <MenuDisplay />
    </div>
  )
}
