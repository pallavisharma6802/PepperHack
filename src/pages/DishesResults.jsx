/**
 * DishesResults - Dish cards after menu scan.
 * Reads dishList + activeRestaurant + agentStatus from Zustand store.
 * P4 can replace with their MenuDisplay component if preferred.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store'

const ALLERGEN_ICONS = {
  Gluten: '🌾', Dairy: '🥛', Nuts: '🥜', Eggs: '🥚',
  Fish: '🐟', Shellfish: '🦐', Soy: '🫘', Sesame: '🌿',
}

function MacroBadge({ macros }) {
  if (!macros) return null
  const low = macros.confidence === 'low'
  const pfx = low ? '~' : ''
  const items = [
    macros.calories != null && `${pfx}${macros.calories} kcal`,
    macros.protein_g != null && `P ${pfx}${macros.protein_g}g`,
    macros.carbs_g  != null && `C ${pfx}${macros.carbs_g}g`,
    macros.fat_g    != null && `F ${pfx}${macros.fat_g}g`,
  ].filter(Boolean)
  return (
    <div className="flex gap-1.5 mt-1.5 flex-wrap">
      {items.map((label) => (
        <span key={label} className="text-[10px] font-ui text-muted bg-bg px-2 py-0.5 rounded-full border border-dim">
          {label}
        </span>
      ))}
    </div>
  )
}

function DishCard({ dish, index }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div
      className="bg-surface rounded-2xl overflow-hidden border border-dim cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.035, ease: [0.34, 1.56, 0.64, 1] }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex gap-3 p-3">
        <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 bg-bg border border-dim">
          {dish.photo_url
            ? <img src={dish.photo_url} alt={dish.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">🍽</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <span className="font-display font-semibold text-[17px] text-cream leading-snug">{dish.name}</span>
            {dish.must_try && (
              <span className="flex-shrink-0 text-[9px] font-ui font-bold text-black bg-amber px-2 py-0.5 rounded-full uppercase tracking-wider mt-0.5">
                Must Try
              </span>
            )}
          </div>
          {dish.price && (
            <span className="text-xs text-amber font-bold">{dish.price}</span>
          )}
          {dish.description && (
            <p className="text-[11px] text-muted mt-0.5 leading-relaxed line-clamp-2">{dish.description}</p>
          )}
          <MacroBadge macros={dish.macros} />
        </div>
      </div>

      {expanded && (
        <motion.div
          className="px-3 pb-3 pt-2 border-t border-dim"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
        >
          {dish.must_try_reason && (
            <p className="text-[11px] text-amber/80 italic mb-2 leading-relaxed">
              "{dish.must_try_reason}"
            </p>
          )}
          {dish.allergens?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dish.allergens.map((a) => (
                <span key={a} className="text-[10px] font-ui text-danger/80 bg-danger/10 px-2 py-0.5 rounded-full border border-danger/20">
                  {ALLERGEN_ICONS[a] || '⚠️'} {a}
                </span>
              ))}
            </div>
          )}
          {!dish.must_try_reason && !dish.allergens?.length && (
            <p className="text-[11px] text-muted">No extra info available.</p>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

export function DishesResults() {
  const navigate = useNavigate()
  const { dishList, activeRestaurant, agentStatus } = useStore()
  const [excludedAllergen, setExcludedAllergen] = useState(null)

  const allAllergens = [...new Set(dishList.flatMap((d) => d.allergens || []))]

  const filtered = excludedAllergen
    ? dishList.filter((d) => !(d.allergens || []).includes(excludedAllergen))
    : dishList

  const mustTry = filtered.filter((d) => d.must_try)
  const rest    = filtered.filter((d) => !d.must_try)

  const allDone = Object.values(agentStatus).every((s) => s === 'done' || s === 'pending')
  const anyRunning = Object.values(agentStatus).some((s) => s === 'running')

  return (
    <div className="w-full h-full bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 pt-12 px-5 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="bg-transparent border-none text-muted text-2xl cursor-pointer p-0"
        >
          ‹
        </button>
        <div className="flex-1">
          <p className="text-[11px] text-muted font-ui tracking-wider uppercase truncate">
            {activeRestaurant?.name || 'Menu'}
          </p>
          <h2 className="font-display font-bold text-2xl text-cream">
            {filtered.length > 0 ? `${filtered.length} Dishes` : 'Dishes'}
          </h2>
        </div>
        {anyRunning && (
          <span className="text-[10px] font-ui text-amber animate-pulse">Analyzing…</span>
        )}
        {!anyRunning && dishList.length > 0 && (
          <span className="text-[10px] font-ui text-safe bg-safe/10 px-3 py-1 rounded-full border border-safe/20">
            ✓ Done
          </span>
        )}
      </div>

      {/* Allergen exclude filters */}
      {allAllergens.length > 0 && (
        <div className="flex items-center gap-2 px-5 pb-3 overflow-x-auto">
          <span className="text-[10px] text-muted font-ui tracking-wider flex-shrink-0">Exclude:</span>
          {allAllergens.map((a) => (
            <button
              key={a}
              onClick={() => setExcludedAllergen(excludedAllergen === a ? null : a)}
              className={`flex-shrink-0 text-[10px] font-ui font-semibold px-3 py-1 rounded-full border-none cursor-pointer transition-all ${
                excludedAllergen === a ? 'bg-danger text-white' : 'bg-surface text-muted'
              }`}
            >
              {ALLERGEN_ICONS[a] || '⚠️'} {a}
            </button>
          ))}
        </div>
      )}

      {/* Dish list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-3">
        {dishList.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 mt-20">
            <div className="text-4xl animate-pulse">⌖</div>
            <p className="text-muted text-sm text-center">
              {anyRunning ? 'Agents are working…' : 'No dishes found. Try scanning a menu.'}
            </p>
          </div>
        )}

        {mustTry.length > 0 && (
          <>
            <p className="text-[10px] font-ui text-amber tracking-widest uppercase mt-1">⭐ Must Try</p>
            {mustTry.map((dish, i) => (
              <DishCard key={dish.id} dish={dish} index={i} />
            ))}
          </>
        )}

        {rest.length > 0 && (
          <>
            {mustTry.length > 0 && (
              <p className="text-[10px] font-ui text-muted tracking-widest uppercase mt-2">All Dishes</p>
            )}
            {rest.map((dish, i) => (
              <DishCard key={dish.id} dish={dish} index={mustTry.length + i} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

