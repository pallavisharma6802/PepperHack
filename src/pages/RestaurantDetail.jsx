/**
 * RestaurantDetail - Hero image, ratings, Scan Menu / Browse Dishes tabs.
 * Person 3 owns this.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function RestaurantDetail({ restaurant, onScan, onBack }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('scan')
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [menuLoaded, setMenuLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  
  const { dishList, setDishList } = useStore()

  const photo = restaurant.photo_url || restaurant.photo

  // Auto-load menu when switching to Browse Dishes tab
  useEffect(() => {
    if (tab === 'browse' && !menuLoaded && !loadingMenu && dishList.length === 0) {
      loadMenu()
    }
  }, [tab, menuLoaded, loadingMenu])

  const loadMenu = async () => {
    setLoadingMenu(true)
    setLoadError(false)
    try {
      console.log('Loading menu for restaurant:', restaurant.id)
      
      // Set a timeout for menu scraping (45 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)
      
      const response = await fetch(`${API_BASE}/restaurants/${restaurant.id}/menu`, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Menu loaded:', data)
      
      if (data.dishes && data.dishes.length > 0) {
        setDishList(data.dishes)
        setMenuLoaded(true)
      } else {
        console.warn('No dishes in response')
        setLoadError(true)
      }
    } catch (error) {
      console.error('Failed to load menu:', error)
      setLoadError(true)
      setMenuLoaded(false)
    } finally {
      setLoadingMenu(false)
    }
  }

  const handleViewDishes = () => {
    navigate('/dishes')
  }

  return (
    <div className="w-full h-full bg-bg flex flex-col overflow-hidden">
      <div className="relative h-[220px] flex-shrink-0">
        <img
          src={photo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600'}
          alt={restaurant.name}
          onLoad={() => setHeroLoaded(true)}
          className="w-full h-full object-cover"
          style={{
            filter: heroLoaded ? 'brightness(0.55)' : 'brightness(0)',
            transition: 'filter 1s ease',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8,6,4,.3) 0%, rgba(8,6,4,0) 40%, rgba(8,6,4,1) 100%)',
          }}
        />
        <button
          onClick={onBack}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-bg/60 border border-dim text-cream text-lg cursor-pointer backdrop-blur flex items-center justify-center"
        >
          ‹
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="font-display font-bold text-4xl text-cream leading-tight mb-1">
            {restaurant.name}
          </h1>
          <div className="flex gap-3 items-center">
            <span className="text-amber text-sm font-bold">★ {restaurant.rating ?? '—'}</span>
            <span className="text-muted text-xs">{restaurant.price || '—'}</span>
            <span className="text-muted text-xs">{restaurant.cuisine || '—'}</span>
            <span
              className={`text-xs font-bold ${restaurant.open ? 'text-safe' : 'text-danger'}`}
            >
              {restaurant.open ? 'OPEN NOW' : 'CLOSED'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-0 py-3 px-5 border-b border-dim animate-fadeUp">
        {[
          ['📍', restaurant.address || 'Madison, WI'],
          ['💰', restaurant.price || (restaurant.price_level ? '$'.repeat(restaurant.price_level) : '—')],
          ['🍴', restaurant.cuisine || '—'],
        ].map(([ic, t]) => (
          <div key={ic} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-base">{ic}</span>
            <span className="text-[10px] text-muted font-ui text-center tracking-wide">{t}</span>
          </div>
        ))}
      </div>

      <div className="flex pt-3 px-5 border-b border-dim">
        {[
          ['scan', 'Scan Menu'],
          ['browse', 'Browse Dishes'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-sm font-semibold font-ui tracking-wider bg-transparent border-none cursor-pointer transition-all ${
              tab === id ? 'text-amber border-b-2 border-amber' : 'text-muted border-b-2 border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
        {tab === 'scan' ? (
          <>
            <div className="text-5xl animate-pulse">⌖</div>
            <div className="text-center">
              <p className="font-display font-semibold text-2xl text-cream mb-2">Scan the menu</p>
              <p className="text-sm text-muted leading-relaxed">
                Point your camera at any paper or digital menu.
                <br />
                4 AI agents will extract every dish in real time.
              </p>
            </div>
            <button
              onClick={onScan}
              className="bg-amber text-black border-none font-ui font-bold text-sm tracking-wider uppercase px-10 py-4 rounded-full cursor-pointer"
              style={{ animation: 'glow 2s ease-in-out infinite' }}
            >
              Open Camera
            </button>
          </>
        ) : (
          <>
            {loadingMenu ? (
              <>
                <p className="font-display text-lg text-cream text-center">
                  Loading menu from website...
                </p>
                <p className="text-xs text-muted text-center">
                  This may take 30-60 seconds
                </p>
              </>
            ) : loadError ? (
              <>
                <div className="text-5xl">⚠️</div>
                <p className="font-display font-semibold text-xl text-cream text-center">
                  Couldn't load menu
                </p>
                <p className="text-sm text-muted text-center mb-3">
                  Try scanning with your camera instead
                </p>
                <button
                  onClick={onScan}
                  className="bg-amber text-black border-none font-ui font-bold text-sm tracking-wider uppercase px-10 py-4 rounded-full cursor-pointer"
                >
                  Open Camera
                </button>
              </>
            ) : menuLoaded && dishList.length > 0 ? (
              <>
                <div className="text-5xl">🍽</div>
                <p className="font-display font-semibold text-xl text-cream text-center">
                  {dishList.length} dishes found
                </p>
                <button
                  onClick={handleViewDishes}
                  className="bg-amber text-black border-none font-ui font-bold text-sm tracking-wider uppercase px-10 py-4 rounded-full cursor-pointer"
                >
                  View All Dishes →
                </button>
              </>
            ) : (
              <>
                <div className="text-5xl">🍽</div>
                <p className="font-display font-semibold text-xl text-cream text-center">
                  Ready to browse menu
                </p>
                <button
                  onClick={loadMenu}
                  className="bg-amber text-black border-none font-ui font-bold text-sm tracking-wider uppercase px-10 py-4 rounded-full cursor-pointer"
                >
                  Load Menu
                </button>
                <button
                  onClick={onScan}
                  className="bg-surface text-cream border border-dim font-ui font-semibold text-sm px-7 py-3 rounded-full cursor-pointer"
                >
                  Open Camera →
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
