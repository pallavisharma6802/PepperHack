/**
 * App - Router setup. Person 3 owns this.
 */
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { Splash } from './pages/Splash'
import { RestaurantBrowser } from './pages/RestaurantBrowser'
import { RestaurantDetail } from './pages/RestaurantDetail'
import { MenuScan } from './pages/MenuScan'
import { DishesResults } from './pages/DishesResults'
import { History } from './pages/History'
import { Wishlist } from './pages/Wishlist'
import { useStore } from './store'

function AppContent() {
  const navigate = useNavigate()
  const setActiveRestaurant = useStore((s) => s.setActiveRestaurant)

  const handleSelectRestaurant = (r) => {
    setActiveRestaurant(r)
    navigate(`/restaurant/${r.id}`)
  }

  return (
    <Routes>
      <Route path="/" element={<Splash onDone={() => navigate('/browse')} />} />
      <Route
        path="/browse"
        element={<RestaurantBrowser onSelect={handleSelectRestaurant} />}
      />
      <Route
        path="/restaurant/:id"
        element={<RestaurantDetailWrapper onScan={handleScan} />}
      />
      <Route path="/scan/:id" element={<MenuScanWrapper onDone={handleDone} />} />
      <Route path="/dishes" element={<DishesResults />} />
      <Route path="/history" element={<History />} />
      <Route path="/wishlist" element={<Wishlist />} />
    </Routes>
  )

  function handleScan(restaurant) {
    setActiveRestaurant(restaurant)
    navigate(`/scan/${restaurant.id}`)
  }

  function handleDone() {
    navigate('/dishes')
  }
}

function RestaurantDetailWrapper({ onScan }) {
  const navigate = useNavigate()
  const activeRestaurant = useStore((s) => s.activeRestaurant)
  const restaurants = useStore((s) => s.restaurants)
  const { id } = useParams()

  const restaurant = activeRestaurant || restaurants.find((r) => String(r.id) === String(id))

  if (!restaurant) {
    navigate('/browse')
    return null
  }

  return (
    <RestaurantDetail
      restaurant={restaurant}
      onScan={() => onScan(restaurant)}
      onBack={() => navigate('/browse')}
    />
  )
}

function MenuScanWrapper({ onDone }) {
  const navigate = useNavigate()
  const activeRestaurant = useStore((s) => s.activeRestaurant)
  const restaurants = useStore((s) => s.restaurants)
  const { id } = useParams()

  const restaurant = activeRestaurant || restaurants.find((r) => String(r.id) === String(id)) || { id, name: 'Restaurant' }

  return (
    <MenuScan
      restaurant={restaurant}
      onDone={onDone}
      onBack={() => navigate(-1)}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="w-full min-h-screen bg-bg text-cream max-w-[390px] mx-auto relative overflow-hidden">
        <AppContent />
      </div>
    </BrowserRouter>
  )
}
