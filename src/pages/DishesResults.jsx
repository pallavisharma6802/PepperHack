/**
 * DishesResults - Placeholder page after scan.
 * Person 3 owns the route. P4's MenuDisplay component plugs in here.
 * dishList + activeRestaurant are in the store for P4 to consume.
 */
import { useNavigate } from 'react-router-dom'

export function DishesResults() {
  const navigate = useNavigate()

  return (
    <div className="w-full h-full bg-bg flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 pt-12 px-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-transparent border-none text-muted text-2xl cursor-pointer p-0"
        >
          ‹
        </button>
        <div>
          <p className="text-[11px] text-muted font-ui tracking-wider uppercase">Menu</p>
          <h2 className="font-display font-bold text-2xl text-cream">Dishes</h2>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5">
        <p className="text-muted text-sm text-center">
          P4's MenuDisplay integrates here. Read dishList from store.
        </p>
      </div>
    </div>
  )
}
