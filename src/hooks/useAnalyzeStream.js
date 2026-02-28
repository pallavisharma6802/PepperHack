/**
 * useAnalyzeStream - SSE hook for POST /analyze.
 * Connects to backend, parses SSE events, updates Zustand.
 * P3 owns this. P4's components read from store.
 */
import { useCallback } from 'react'
import { useStore } from '../store'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function useAnalyzeStream() {
  const { setAgentStatus, mergeAnalyzePayload, resetScan } = useStore()

  const startAnalyze = useCallback(
    async ({ restaurantId, imageBase64 = null, mock = false }) => {
      resetScan()

      const url = `${API_BASE.replace(/\/$/, '')}/analyze`
      const body = JSON.stringify({
        restaurant_id: restaurantId,
        image_base64: imageBase64,
        mock,
      })

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })

        if (!res.ok) throw new Error(`Analyze failed: ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const chunk of lines) {
            const dataMatch = chunk.match(/^data:\s*(.+)$/m)
            if (!dataMatch) continue

            try {
              const event = JSON.parse(dataMatch[1])
              const { agent, status, payload } = event

              setAgentStatus({ [agent]: status })
              if (payload?.dishes) {
                mergeAnalyzePayload(agent, payload)
              }
            } catch (_) {
              // Skip malformed SSE
            }
          }
        }
      } catch (err) {
        console.error('Analyze stream error:', err)
        setAgentStatus({
          scanner: 'error',
          photo: 'error',
          recommender: 'error',
          nutritionist: 'error',
        })
      }
    },
    [setAgentStatus, mergeAnalyzePayload, resetScan]
  )

  return { startAnalyze }
}
