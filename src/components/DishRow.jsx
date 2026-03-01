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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: flagged ? 0.25 : 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={handleTap}
      className="flex items-center gap-3.5 py-3.5 cursor-pointer active:opacity-70 transition-opacity"
      style={{ touchAction: 'manipulation', borderBottom: '1px solid #E4DFD6' }}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-[68px] h-[68px] rounded-3xl overflow-hidden bg-bg2" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {dish.photo_url ? (
          <img
            src={dish.photo_url}
            alt={dish.name}
            className="w-full h-full object-cover dish-develop"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl opacity-20">🍽</div>
        )}
        {dish.must_try && (
          <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: 'inset 0 0 0 1.5px rgba(245,166,35,0.5)' }} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-display font-semibold text-cream truncate text-[16px] leading-tight">{dish.name}</p>
          {dish.must_try && (
            <span className="flex-shrink-0 text-[8px] font-bold font-ui tracking-[0.14em] uppercase text-amber/80 bg-amber/8 px-1.5 py-0.5 rounded-full border border-amber/15">
              🔥 Must Try
            </span>
          )}
        </div>
        {dish.description && (
          <p className="text-[11px] text-muted/70 font-ui truncate leading-snug">{dish.description}</p>
        )}
        {flagged && (
          <p className="text-[10px] text-danger/80 font-ui mt-0.5">⚠ allergen</p>
        )}
      </div>

      {/* Calorie pill */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {dish.price && (
          <span className="text-[12px] font-semibold font-ui text-cream/70">{dish.price}</span>
        )}
        {cal != null && (
          <span className="text-[10px] font-bold font-ui px-2.5 py-1 rounded-full text-amber/90" style={{ background: 'rgba(207,128,8,0.08)', border: '1px solid rgba(207,128,8,0.20)' }}>
            {lowConf ? `~${cal}` : cal} cal
          </span>
        )}
      </div>
    </motion.div>
  )
}
