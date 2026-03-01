/**
 * API service - Axios wrappers for all backend routes.
 * P1 provides: GET /restaurants, POST /analyze (SSE)
 */
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

/**
 * GET /restaurants - Madison restaurants from Places API
 * @returns {Promise<{restaurants: Array, total: number}>}
 */
export async function getRestaurants(params = {}) {
  const { data } = await api.get('/restaurants', { params })
  return data
}

/**
 * GET /restaurants/:place_id - Single restaurant detail (matches backend)
 */
export async function getRestaurant(placeId) {
  const { data } = await api.get(`/restaurants/${placeId}`)
  return data
}

/**
 * POST /analyze - Starts SSE stream. Use useAnalyzeStream hook instead for streaming.
 * Body: { restaurant_id, image_base64?, mock? }
 */
export function getAnalyzeStreamUrl() {
  return `${API_BASE.replace(/\/$/, '')}/analyze`
}
