/**
 * sounds/index.js — P4 owns this.
 * Howler.js setup for all 5 sounds.
 * Gracefully no-ops if audio files aren't present yet.
 *
 * Sounds live in /public/sounds/*.mp3
 * useAgentSounds() — hook that fires agentPing each time an agent flips to 'done'
 */
import { useEffect, useRef } from 'react'
import { Howl } from 'howler'
import { useStore } from '../store'

const makeSound = (src, volume = 0.6) => {
  try {
    return new Howl({ src: [src], volume, preload: true })
  } catch (_) {
    return null
  }
}

// Lazy-init so missing files don't crash at import
let _scanStart   = null
let _agentPing   = null
let _dishAppear  = null
let _mustTry     = null
let _cardDismiss = null

const play = (getter, setter, path, vol = 0.5) => {
  try {
    if (!getter) setter(makeSound(path, vol))
    getter?.play()
  } catch (_) { /* audio file not present yet */ }
}

export const sounds = {
  scanStart:   () => { if (!_scanStart)   _scanStart   = makeSound('/sounds/scan_start.mp3',   0.7); _scanStart?.play()   },
  agentPing:   () => { if (!_agentPing)   _agentPing   = makeSound('/sounds/agent_ping.mp3',   0.5); _agentPing?.play()   },
  dishAppear:  () => { if (!_dishAppear)  _dishAppear  = makeSound('/sounds/dish_appear.mp3',  0.4); _dishAppear?.play()  },
  mustTry:     () => { if (!_mustTry)     _mustTry     = makeSound('/sounds/must_try.mp3',     0.6); _mustTry?.play()     },
  cardDismiss: () => { if (!_cardDismiss) _cardDismiss = makeSound('/sounds/card_dismiss.mp3', 0.4); _cardDismiss?.play() },
}

/**
 * useAgentSounds
 * Subscribe to agentStatus in shared Zustand store.
 * Fire agentPing each time an agent flips to 'done'.
 * Call once at the top of MenuScan or DishesResults.
 */
export function useAgentSounds() {
  const agentStatus = useStore((s) => s.agentStatus)
  const prevRef = useRef({})

  useEffect(() => {
    const prev = prevRef.current
    for (const [agent, status] of Object.entries(agentStatus)) {
      if (status === 'done' && prev[agent] !== 'done') {
        sounds.agentPing()
      }
    }
    prevRef.current = { ...agentStatus }
  }, [agentStatus])
}
