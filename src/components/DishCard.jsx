/**
 * DishCard — 70vh spring bottom sheet opened when a dish row is tapped.
 * P4 owns this.
 *
 * Features:
 *  • Spring-physics entrance / exit (Framer Motion)
 *  • Drag-down-to-dismiss (>80px offset or velocity >400px/s)
 *  • Hero photo with blur-to-sharp "dish-develop" animation
 *  • Must-Try quote card
 *  • MacroRing SVG trio + big calorie number
 *  • Allergen pill row (green = safe, red+⚠ = active filter hit)
 */
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store'
import useAllergenStore from '../store/allergenStore'
import { MacroRing } from './MacroRing'
import { sounds } from '../sounds'

export function DishCard({ dish }) {
  const closeDish       = useStore((s) => s.closeDish)
  const activeAllergens = useAllergenStore((s) => s.activeAllergens)

  const handleDismiss = () => {
    sounds.cardDismiss()
    closeDish()
  }

  const handleDragEnd = (_, info) => {
    if (info.offset.y > 80 || info.velocity.y > 400) handleDismiss()
  }

  const { macros, allergens = [], ingredients = [] } = dish
  const lowConf = macros?.confidence === 'low'
  const fmt = (v) => (lowConf ? `~${v ?? 0}` : `${v ?? 0}`)

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/70 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-surface border-t border-dim overflow-hidden"
        style={{ height: '70vh', maxWidth: 390, margin: '0 auto', touchAction: 'none' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-dim" />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ overscrollBehavior: 'contain' }}>

          {/* Hero photo */}
          {dish.photo_url && (
            <div className="w-full h-48 rounded-2xl overflow-hidden mb-4 bg-bg2">
              <img
                src={dish.photo_url}
                alt={dish.name}
                className="w-full h-full object-cover dish-develop"
              />
            </div>
          )}

          {/* Name + price */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h2 className="font-display font-bold text-2xl text-cream leading-tight">{dish.name}</h2>
            {dish.price && (
              <span className="font-ui font-bold text-lg text-amber flex-shrink-0">{dish.price}</span>
            )}
          </div>

          {/* Category */}
          {dish.category && (
            <span className="block text-[10px] font-ui text-muted tracking-widest uppercase mb-2">
              {dish.category}
            </span>
          )}

          {/* Description */}
          {dish.description && (
            <p className="text-sm font-ui text-muted leading-relaxed mb-4">{dish.description}</p>
          )}

          {/* Must-Try quote */}
          {dish.must_try && dish.must_try_reason && (
            <div className="flex gap-3 p-3 rounded-xl bg-amber/8 border border-amber/20 mb-4">
              <span className="text-lg leading-none flex-shrink-0">🔥</span>
              <div>
                <p className="text-[11px] font-ui font-bold text-amber tracking-wider uppercase mb-1">Why locals love it</p>
                <p className="text-xs font-ui text-muted italic">"{dish.must_try_reason}"</p>
              </div>
            </div>
          )}

          {/* ── Macros ── */}
          {macros && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-ui font-semibold text-cream tracking-wider uppercase">Nutrition</h3>
                {lowConf && (
                  <span className="text-[10px] font-ui text-muted italic">~ estimated</span>
                )}
              </div>

              <div className="flex items-center justify-around">
                {/* Big calorie */}
                <div className="flex flex-col items-center">
                  <span className="font-display font-bold text-4xl text-cream">
                    {fmt(macros.calories)}
                  </span>
                  <span className="text-[10px] font-ui text-muted uppercase tracking-wider">cal</span>
                </div>

                <MacroRing label="Protein" value={macros.protein_g}  max={60}  color="#f5a623" lowConf={lowConf} />
                <MacroRing label="Carbs"   value={macros.carbs_g}    max={120} color="#60a5fa" lowConf={lowConf} />
                <MacroRing label="Fat"     value={macros.fat_g}       max={60}  color="#f87171" lowConf={lowConf} />
              </div>
            </div>
          )}

          {/* ── Allergen pills ── */}
          {allergens.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-ui font-semibold text-cream tracking-wider uppercase mb-2">Allergens</h3>
              <div className="flex flex-wrap gap-2">
                {allergens.map((a) => {
                  const hit = activeAllergens.has(a)
                  return (
                    <span
                      key={a}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-ui border ${
                        hit
                          ? 'bg-danger/15 text-danger border-danger/30'
                          : 'bg-safe/10 text-safe border-safe/20'
                      }`}
                    >
                      {hit && <span>⚠</span>}
                      {a}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Ingredients ── */}
          {ingredients.length > 0 && (
            <div>
              <h3 className="text-sm font-ui font-semibold text-cream tracking-wider uppercase mb-2">Ingredients</h3>
              <div className="flex flex-wrap gap-1.5">
                {ingredients.map((ing) => (
                  <span
                    key={ing}
                    className="px-2.5 py-1 rounded-full text-xs font-ui text-muted bg-surface border border-dim"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
