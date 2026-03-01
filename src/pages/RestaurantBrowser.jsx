/**
 * RestaurantBrowser - Map + card grid + filters.
 * Person 3 owns this.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapView } from '../components/MapView'
import { RestaurantCard } from '../components/RestaurantCard'
import { useStore } from '../store'
import { getRestaurants } from '../services/api'
import { MOCK_RESTAURANTS, normalizeRestaurant } from '../data/mockRestaurants'

// Dynamic filters from backend cuisines + common options
const BASE_FILTERS = ['All']

export function RestaurantBrowser({ onSelect }) {
  const [filter, setFilter] = useState('All')
  const [openOnly, setOpenOnly] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const { restaurants, setRestaurants, setRestaurantsLoading, setRestaurantsError } = useStore()

  useEffect(() => {
    setRestaurantsLoading(true)
    getRestaurants()
      .then((res) => {
        const list = (res.restaurants || []).map(normalizeRestaurant)
        setRestaurants(list.length ? list : MOCK_RESTAURANTS.map(normalizeRestaurant))
      })
      .catch(() => {
        setRestaurantsError('Could not load restaurants')
        setRestaurants(MOCK_RESTAURANTS.map(normalizeRestaurant))
      })
      .finally(() => setRestaurantsLoading(false))
  }, [setRestaurants, setRestaurantsLoading, setRestaurantsError])

  const cuisineFilters = [...BASE_FILTERS, ...new Set(restaurants.map((r) => r.cuisine).filter(Boolean))]
  const filtered = restaurants.filter((r) => {
    if (openOnly && !r.open) return false
    if (filter !== 'All' && r.cuisine !== filter) return false
    return true
  })

  const handleSelect = (r) => {
    setSelectedId(r.id)
    onSelect(r)
  }

  return (
    <div className="w-full h-full bg-bg flex flex-col overflow-hidden">
      <div className="pt-12 px-5 pb-4 animate-fadeUp">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-display font-bold text-3xl text-amber">Madison</span>
          <span className="font-display font-normal text-2xl text-cream italic">Restaurants</span>
        </div>
        <p className="text-xs text-muted font-ui tracking-wider">{filtered.length} spots near you</p>
      </div>

      <div className="mx-5 mb-4">
        <MapView
          restaurants={filtered}
          selectedId={selectedId}
          onSelect={handleSelect}
          className="h-[180px]"
        />
      </div>

      <div className="flex gap-2 px-5 py-3 overflow-x-auto">
        <button
          onClick={() => setOpenOnly(!openOnly)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-ui tracking-wider cursor-pointer border-none transition-all ${
            openOnly ? 'bg-safe text-black' : 'bg-surface text-muted'
          }`}
        >
          Open Now
        </button>
        {cuisineFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-ui tracking-wider cursor-pointer border-none transition-all ${
              filter === f ? 'bg-amber text-black' : 'bg-surface text-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        {filtered.map((r, i) => (
          <RestaurantCard
            key={r.id}
            restaurant={r}
            onClick={() => handleSelect(r)}
            animationDelay={i * 0.06}
          />
        ))}
      </div>
    </div>
  )
}
