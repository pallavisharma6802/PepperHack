/**
 * Splash - Minimal home screen. TripGlide-inspired.
 * Person 3 owns this.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export function Splash({ onDone }) {
  const [ready, setReady] = useState(false)
  const [showCTA, setShowCTA] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setReady(true), 300)
    const t2 = setTimeout(() => setShowCTA(true), 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const ease = [0.22, 1, 0.36, 1]

  return (
    <div className="relative w-full h-full bg-bg flex flex-col overflow-hidden">

      {/* Top label — pinned with generous safe-area padding */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease }}
        className="px-6 pt-16 pb-0"
      >
        <span
          className="text-[11px] font-ui font-semibold tracking-[0.22em] uppercase"
          style={{ color: '#CF8008' }}
        >
          Madison, WI
        </span>
      </motion.div>

      {/* Hero headline — centered in remaining top half */}
      <div className="flex-1 flex flex-col justify-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.08, ease }}
          className="font-display font-bold text-cream leading-none mb-5"
          style={{ fontSize: 56, letterSpacing: '-0.01em' }}
        >
          Madison
          <br />
          <span style={{ color: '#CF8008' }}>Bites.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.18, ease }}
          className="font-ui text-muted text-[16px] leading-relaxed"
          style={{ fontWeight: 400, maxWidth: 240 }}
        >
          Every menu. Every dish.
          <br />AI-powered for Madison.
        </motion.p>
      </div>

      {/* Bottom section — search + tags + CTA */}
      <div className="px-6 pb-10">

        {/* Search bar mock */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.26, ease }}
          onClick={onDone}
          className="flex items-center gap-3 bg-surface rounded-3xl px-4 py-3.5 mb-5 cursor-pointer"
          style={{ border: '1px solid #E4DFD6', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="#8A7E6E">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="font-ui text-[14px]" style={{ color: '#B0A898' }}>Find a restaurant or dish…</span>
        </motion.div>

        {/* Pill tags */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.34, ease }}
          className="flex gap-2 mb-8"
        >
          {['Italian', 'Sushi', 'Burgers', 'Vegan'].map((tag, i) => (
            <span
              key={tag}
              onClick={onDone}
              className="font-ui text-[12px] font-medium px-3 py-1.5 rounded-full cursor-pointer transition-colors"
              style={{
                background: i === 0 ? '#1A1714' : '#FFFFFF',
                color: i === 0 ? '#FFFFFF' : '#1A1714',
                border: '1px solid #E4DFD6',
              }}
            >
              {tag}
            </span>
          ))}
        </motion.div>

        {/* CTA */}
        {showCTA && (
          <motion.button
            onClick={onDone}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="w-full font-ui font-semibold text-[15px] py-4 rounded-3xl cursor-pointer border-none mb-6"
            style={{ background: '#1A1714', color: '#FFFFFF', letterSpacing: '-0.01em' }}
          >
            Browse Restaurants
          </motion.button>
        )}

        {/* Bottom micro-label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={showCTA ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center gap-6"
        >
          {['AI-powered', 'Madison, WI', 'CheeseHacks'].map((t) => (
            <span key={t} className="text-[10px] font-ui text-muted/50 tracking-wide">{t}</span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
