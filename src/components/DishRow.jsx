/**
 * DishRow — single dish entry in the scrollable menu list.
 * P4 owns this.
 *
 * Shows: thumbnail · name · description · price · calorie pill · Must-Try badge.
 * Allergen-flagged dishes dim to 30% opacity.
 * Tapping opens DishCard via shared Zustand activeDishId.
 */
import { motion } from 'framer-motion'
import { useStore } from '../store'
import useAllergenStore from '../store/allergenStore'
import { sounds } from '../sounds'

export function DishRow({ dish }) {
  const setActiveDishId = useStore((s) => s.setActiveDishId)
  const isDishFlagged   = useAllergenStore((s) => s.isDishFlagged)

  const flagged = isDishFlagged(dish)
  const lowConf = dish.macros?.confidence === 'low'
  const cal     = dish.macros?.calories

  const handleTap = () => {
    sounds.dishAppear()
    if (dish.must_try) sounds.mustTry()
    setActiveDishId(dish.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: flagged ? 0.3 : 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleTap}
      className="flex items-center gap-3 py-3 border-b border-dim cursor-pointer active:bg-surface/60 rounded-lg px-1"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-surface">
        {dish.photo_url ? (
          <img
            src={dish.photo_url}
            alt={dish.name}
            className="w-full h-full object-cover dish-develop"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🍽</div>
        )}
        {dish.must_try && (
          <span className="absolute top-1 left-1 text-xs must-try-badge">🔥</span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-display font-semibold text-cream truncate text-[15px]">{dish.name}</p>
          {dish.must_try && (
            <span className="must-try-badge flex-shrink-0 text-[9px] font-bold font-ui tracking-widest uppercase text-amber bg-amber/10 px-1.5 py-0.5 rounded-full border border-amber/20">
              Must Try
            </span>
          )}
        </div>
        {dish.description && (
          <p className="text-[12px] text-muted font-ui truncate mt-0.5">{dish.description}</p>
        )}
        {flagged && (
          <p className="text-[10px] text-danger font-ui mt-0.5 flex items-center gap-1">
            <span>⚠</span> Contains allergen
          </p>
        )}
      </div>

      {/* Price + calorie pill */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {dish.price && (
          <span className="text-sm font-semibold font-ui text-cream">{dish.price}</span>
        )}
        {cal != null && (
          <span className="text-[10px] font-bold font-ui px-2 py-0.5 rounded-full bg-surface text-amber border border-dim">
            {lowConf ? `~${cal}` : cal} cal
          </span>
        )}
      </div>
    </motion.div>
  )
}
