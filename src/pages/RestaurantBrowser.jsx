/**
 * RestaurantBrowser - Map + card grid + filters.
 * Person 3 owns this.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MapView } from '../components/MapView'
import { RestaurantCard } from '../components/RestaurantCard'
import { useStore } from '../store'
import { getRestaurants } from '../services/api'
import { MOCK_RESTAURANTS, normalizeRestaurant } from '../data/mockRestaurants'

// Dynamic filters from backend cuisines + common options
const BASE_FILTERS = ['All']

export function RestaurantBrowser({ onSelect }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [openOnly, setOpenOnly] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [locationName, setLocationName] = useState('Madison')
  const [searchQuery, setSearchQuery] = useState('')

  const { restaurants, setRestaurants, setRestaurantsLoading, setRestaurantsError, wishlist, history } = useStore()

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
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleSelect = (r) => {
    setSelectedId(r.id)
    onSelect(r)
  }

  const handleMapMove = (newRestaurants) => {
    // Merge new restaurants from map movement with existing ones
    const normalized = newRestaurants.map(normalizeRestaurant)
    const merged = [...restaurants]
    
    normalized.forEach((newR) => {
      if (!merged.find((r) => r.id === newR.id)) {
        merged.push(newR)
      }
    })
    
    setRestaurants(merged)
  }

  return (
    <div className="w-full h-full bg-bg flex flex-col overflow-hidden">
      <div className="pt-14 px-5 pb-4 animate-fadeUp">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] font-ui font-bold tracking-[0.22em] uppercase text-muted/60">{locationName}, WI</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/history')}
              className="relative w-8 h-8 rounded-full bg-surface border border-dim flex items-center justify-center"
            >
              <span className="text-base">🕐</span>
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-bg text-[9px] font-bold rounded-full flex items-center justify-center">
                  {history.length > 9 ? '9+' : history.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/wishlist')}
              className="relative w-8 h-8 rounded-full bg-surface border border-dim flex items-center justify-center"
            >
              <span className="text-base">❤️</span>
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-bg text-[9px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length > 9 ? '9+' : wishlist.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <h1 className="font-display font-bold text-[38px] text-cream leading-none mb-4">Restaurants</h1>
        {/* Search bar */}
        <div className="flex items-center gap-3 bg-surface rounded-3xl px-4 py-3" style={{ border: '1px solid #E4DFD6', boxShadow: '0 1px 10px rgba(0,0,0,0.05)' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ color: '#8A7E6E', flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-[13px] font-ui bg-transparent outline-none text-cream placeholder:text-muted/60"
          />
          <span className="text-[11px] font-ui text-muted/40">{filtered.length} nearby</span>
        </div>
      </div>

      <div className="mx-5 mb-4 rounded-3xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <MapView
          restaurants={filtered}
          selectedId={selectedId}
          onSelect={handleSelect}
          onMapMove={handleMapMove}
          className="h-[180px]"
        />
      </div>

      <div className="flex gap-2 px-5 py-3 overflow-x-auto">
        <button
          onClick={() => setOpenOnly(!openOnly)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-ui tracking-wider cursor-pointer transition-all border ${
            openOnly ? 'bg-cream text-surface border-cream' : 'bg-surface text-muted border-dim'
          }`}
        >
          Open Now
        </button>
        {cuisineFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-ui tracking-wider cursor-pointer transition-all border ${
              filter === f ? 'bg-cream text-surface border-cream' : 'bg-surface text-muted border-dim'
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
