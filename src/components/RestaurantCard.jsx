/**
 * RestaurantCard - Card with parallax tilt on touch.
 * Person 3 owns this.
 */
import { motion } from 'framer-motion'

export function RestaurantCard({ restaurant, onClick, animationDelay = 0 }) {
  const { name, cuisine, photo, rating, price, open, distance, desc } = restaurant

  return (
    <motion.div
      onClick={onClick}
      className="flex gap-3 py-3 border-b border-dim cursor-pointer"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: animationDelay, ease: [0.34, 1.56, 0.64, 1] }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-dim">
        <img
          src={photo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'}
          alt={name}
          className="w-full h-full object-cover"
          style={{ filter: open ? 'none' : 'grayscale(0.6) brightness(0.7)' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-semibold text-xl text-cream">{name}</span>
          {!open && (
            <span className="text-[10px] text-danger font-ui font-semibold">CLOSED</span>
          )}
        </div>
        <p className="text-xs text-muted mb-1 truncate">{desc || cuisine}</p>
        <div className="flex gap-3 items-center">
          <span className="text-xs text-amber font-bold">★ {rating ?? '—'}</span>
          <span className="text-[11px] text-muted">{price || '—'}</span>
          <span className="text-[11px] text-muted">{distance || '—'}</span>
          <span className="text-[11px] text-muted bg-surface px-2 py-0.5 rounded-full">
            {cuisine || '—'}
          </span>
        </div>
      </div>
      <div className="text-dim text-xl self-center">›</div>
    </motion.div>
  )
}
