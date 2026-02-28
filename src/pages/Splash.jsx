/**
 * Splash - Animated splash. Fork + plate SVG, letter-stagger title.
 * Person 3 owns this.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

function Scanline() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px)',
        animation: 'scanline 3s ease-in-out infinite',
      }}
    />
  )
}

export function Splash({ onDone }) {
  const [phase, setPhase] = useState(0)
  const title = 'MadisonBites'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 700)
    const t2 = setTimeout(() => setPhase(2), 1600)
    const t3 = setTimeout(() => setPhase(3), 2400)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [])

  return (
    <div className="relative w-full h-full bg-bg flex flex-col items-center justify-center overflow-hidden">
      <Scanline />
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245,166,35,.08) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
        }}
      />
      <motion.div
        className="text-7xl mb-8"
        initial={{ opacity: 0, y: -30, rotate: -15 }}
        animate={phase >= 0 ? { opacity: 1, y: 0, rotate: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        🍽
      </motion.div>
      <div className="flex gap-0.5 mb-4" style={{ perspective: 600 }}>
        {title.split('').map((ch, i) => (
          <motion.span
            key={i}
            className="font-display font-bold text-[42px] inline-block"
            style={{
              color: i < 7 ? 'var(--tw-color-amber)' : 'var(--tw-color-cream)',
            }}
            initial={{ opacity: 0, y: 32, rotateX: -40 }}
            animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : {}}
            transition={{
              duration: 0.5,
              delay: phase >= 1 ? i * 0.055 : 0,
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </motion.span>
        ))}
      </div>
      <motion.p
        className="font-ui text-[13px] text-muted tracking-[0.15em] uppercase mb-14"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        Every menu. Every dish. Madison's best.
      </motion.p>
      {phase >= 3 && (
        <motion.button
          onClick={onDone}
          className="bg-amber text-black border-none font-ui font-bold text-sm tracking-wider uppercase px-10 py-4 rounded-full cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ animation: 'glow 2s ease-in-out infinite' }}
        >
          Find a Restaurant
        </motion.button>
      )}
      <motion.div
        className="absolute bottom-6 left-0 right-0 flex justify-center gap-8"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 0.4 } : {}}
        transition={{ duration: 0.4 }}
      >
        {['CheeseHacks 2025', 'Madison, WI', 'Google ADK'].map((t) => (
          <span
            key={t}
            className="text-[10px] font-ui text-muted tracking-[0.12em] uppercase"
          >
            {t}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
