/**
 * Wishlist - Shows saved/favorited restaurants
 */
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { RestaurantCard } from '../components/RestaurantCard'

export function Wishlist() {
  const navigate = useNavigate()
  const { wishlist, clearWishlist } = useStore()

  const handleSelect = (restaurant) => {
    navigate(`/restaurant/${restaurant.id}`)
  }

  return (
    <div className="w-full h-full bg-bg flex flex-col overflow-hidden">
      <div className="pt-14 px-5 pb-4 animate-fadeUp">
        <h1 className="font-display font-bold text-[38px] text-cream leading-none mb-2">Wishlist</h1>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-ui text-muted/60">{wishlist.length} saved</p>
          {wishlist.length > 0 && (
            <button
              onClick={clearWishlist}
              className="text-[11px] font-ui text-danger/80 hover:text-danger"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {wishlist.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="#8A7E6E" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <p className="text-muted/60 text-sm font-ui">No saved restaurants</p>
            <p className="text-muted/40 text-xs font-ui mt-1">
              Tap the heart icon on any restaurant to save it here
            </p>
            <button
              onClick={() => navigate('/browse')}
              className="mt-6 px-6 py-2 bg-accent text-bg font-ui text-sm rounded-full"
            >
              Browse Restaurants
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pb-20">
          <div className="grid grid-cols-2 gap-3">
            {wishlist.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => handleSelect(restaurant)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate('/browse')}
        className="absolute top-12 left-4 w-10 h-10 rounded-full bg-surface border border-dim text-cream text-lg cursor-pointer flex items-center justify-center"
      >
        ‹
      </button>
    </div>
  )
}
