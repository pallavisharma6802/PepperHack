/**
 * RestaurantCard - Full-width image card.
 * Person 3 owns this.
 */
import { motion } from 'framer-motion'

export function RestaurantCard({ restaurant, onClick, animationDelay = 0 }) {
  const { name, cuisine, photo, rating, price, open } = restaurant

  return (
    <motion.div
      onClick={onClick}
      className="relative w-full h-[160px] rounded-3xl overflow-hidden cursor-pointer mb-4"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: animationDelay, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.975 }}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}
    >
      {/* Background image */}
      <img
        src={photo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600'}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: open ? 'brightness(0.80)' : 'grayscale(0.6) brightness(0.50)' }}
      />

      {/* Gradient overlay — left-heavy so text pops */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.72) 100%)' }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        {/* Top row */}
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-ui font-bold tracking-[0.14em] uppercase px-2.5 py-1 rounded-full ${
            open
              ? 'bg-safe/15 text-safe border border-safe/25'
              : 'bg-danger/15 text-danger border border-danger/25'
          }`}>
            {open ? 'Open Now' : 'Closed'}
          </span>
          {rating && (
            <span className="text-[10px] font-ui font-bold text-amber/90 bg-black/30 px-2 py-0.5 rounded-full">
              ★ {rating}
            </span>
          )}
        </div>

        {/* Bottom: name + meta */}
        <div>
          <h3 className="font-display font-bold text-[21px] leading-tight mb-0.5 truncate" style={{ color: '#FFFFFF' }}>{name}</h3>
          <div className="flex items-center gap-1.5 text-[11px] font-ui" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <span>{cuisine || 'Restaurant'}</span>
            {price && <><span>·</span><span>{price}</span></>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
