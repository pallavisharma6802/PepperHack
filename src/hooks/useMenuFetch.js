/**
 * useMenuFetch — P4 owned.
 * Pre-fetches a restaurant's menu from GET /restaurants/{id}/menu.
 * Used in DishesResults when dishList is empty (user arrived without scanning).
 * Populates the shared dishList in Zustand so MenuDisplay renders immediately.
 */
import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { api } from '../services/api'

export function useMenuFetch(restaurantId) {
  const dishList = useStore((s) => s.dishList)
  const agentStatus = useStore((s) => s.agentStatus)
  const setDishList = useStore((s) => s.setDishList)
  const setAgentStatus = useStore((s) => s.setAgentStatus)
  const fetchedRef = useRef(false)

  useEffect(() => {
    // Only fetch if: there are no dishes yet, all agents are still pending,
    // and we haven't already fired a fetch this mount.
    const allPending = Object.values(agentStatus).every((s) => s === 'pending')
    if (!restaurantId || !allPending || dishList.length > 0 || fetchedRef.current) return

    fetchedRef.current = true

    const doFetch = async () => {
      try {
        setAgentStatus({ scanner: 'running' })
        const data = await api.get(`/restaurants/${restaurantId}/menu`)
        const dishes = data?.data?.dishes ?? []

        if (dishes.length > 0) {
          setDishList(dishes)
          // Mark all agents done so MenuDisplay exits skeleton mode
          setAgentStatus({
            scanner: 'done',
            photo: 'done',
            recommender: 'done',
            nutritionist: 'done',
          })
        } else {
          // No menu data — mark scanner done so UI shows empty state not skeletons
          setAgentStatus({ scanner: 'done' })
        }
      } catch (err) {
        console.warn('[useMenuFetch] pre-fetch failed:', err)
        setAgentStatus({ scanner: 'error' })
      }
    }

    doFetch()
  }, [restaurantId]) // eslint-disable-line react-hooks/exhaustive-deps
}
