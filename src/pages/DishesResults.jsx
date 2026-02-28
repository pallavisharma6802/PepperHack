/**
 * DishesResults - Placeholder page after scan.
 * Person 3 owns the route. P4's MenuDisplay component plugs in here.
 */
import { useStore } from '../store'
import { useNavigate } from 'react-router-dom'

export function DishesResults() {
  const navigate = useNavigate()
  const dishList = useStore((s) => s.dishList)
  const activeRestaurant = useStore((s) => s.activeRestaurant)

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
          <h2 className="font-display font-bold text-2xl text-cream">
            {activeRestaurant?.name || 'Dishes'}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {/* P4's MenuDisplay component goes here */}
        {dishList.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted font-ui mb-4">
              P4's MenuDisplay integrates here. {dishList.length} dishes loaded.
            </p>
            {dishList.map((d) => (
              <div
                key={d.id}
                className="flex gap-3 py-3 border-b border-dim"
              >
                {d.photo_url && (
                  <img
                    src={d.photo_url}
                    alt={d.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-display font-semibold text-cream">{d.name}</p>
                  <p className="text-xs text-muted">{d.category} · {d.price}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No dishes yet. Run a scan first.</p>
        )}
      </div>
    </div>
  )
}
