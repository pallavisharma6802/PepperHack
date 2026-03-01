/**
 * MenuDisplay — P4's hero component. Plugs into DishesResults.
 *
 * Layout:
 *   ┌──────────────────────────┐
 *   │ Header + category tabs   │  sticky
 *   │ Scrollable dish list     │  flex-1
 *   └──────────────────────────┘
 * DishCard springs up as an overlay (70vh) when a row is tapped.
 * AllergenFilter slides up from the bottom when the filter button is tapped.
 */
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import { DishRow } from './DishRow'
import { DishCard } from './DishCard'
import { LoadingSkeleton } from './LoadingSkeleton'
import { AllergenFilter } from './AllergenFilter'
import useAllergenStore from '../store/allergenStore'
import { useAgentSounds } from '../sounds'

const CATEGORIES = ['All', 'Must Try', 'Starters', 'Mains', 'Desserts', 'Drinks']

export function MenuDisplay() {
  const dishList     = useStore((s) => s.dishList)
  const agentStatus  = useStore((s) => s.agentStatus)
  const activeDishId = useStore((s) => s.activeDishId)

  const [activeCategory, setActiveCategory] = useState('All')
  const [filterOpen, setFilterOpen]         = useState(false)

  // Register agent ping sounds
  useAgentSounds()

  const pendingAgents = Object.values(agentStatus).filter(
    (s) => s === 'pending' || s === 'running'
  ).length
  const isStreaming = pendingAgents > 0 && dishList.length >= 0

  // Category filter — memoised, never re-runs on every render
  const filteredDishes = useMemo(() => {
    if (activeCategory === 'All')       return dishList
    if (activeCategory === 'Must Try')  return dishList.filter((d) => d.must_try)
    return dishList.filter((d) => d.category === activeCategory)
  }, [dishList, activeCategory])

  const activeDish = dishList.find((d) => d.id === activeDishId) ?? null

  const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden">

      {/* ── Sticky header ── */}
      <div className="flex-shrink-0 px-5 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-semibold text-lg text-cream">
            {dishList.length > 0 ? `${dishList.length} dishes` : 'Menu'}
          </p>
          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-dim text-xs font-ui text-muted cursor-pointer"
          >
            ⚗ Allergens
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold font-ui tracking-wider cursor-pointer border-none transition-all ${
                activeCategory === cat
                  ? 'bg-amber text-black'
                  : 'bg-surface text-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dish list ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">

        {/* Skeletons while first agent hasn't returned any dishes yet */}
        {isStreaming && dishList.length === 0 ? (
          <LoadingSkeleton count={5} />
        ) : filteredDishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
            <span className="text-4xl">🍽</span>
            <p className="text-sm font-ui">No dishes in this category</p>
          </div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {filteredDishes.map((dish) => (
                <DishRow key={dish.id} dish={dish} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Streaming indicator once some dishes already show */}
        {isStreaming && dishList.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <span className="text-amber text-xs animate-pulse">●</span>
            <span className="text-[11px] font-ui text-muted tracking-wider">
              {pendingAgents} agent{pendingAgents > 1 ? 's' : ''} still working…
            </span>
          </div>
        )}
      </div>

      {/* ── DishCard overlay ── */}
      <AnimatePresence>
        {activeDish && <DishCard dish={activeDish} />}
      </AnimatePresence>

      {/* ── AllergenFilter panel ── */}
      <AnimatePresence>
        {filterOpen && <AllergenFilter onClose={() => setFilterOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
