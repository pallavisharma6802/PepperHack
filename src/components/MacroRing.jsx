/**
 * MacroRing — animated SVG donut ring for a single macro.
 * P4 owns this.
 *
 * Props:
 *   label   — "Protein" | "Carbs" | "Fat"
 *   value   — number (grams)
 *   max     — 100% ceiling (60 for protein/fat, 120 for carbs)
 *   color   — stroke color (hex)
 *   lowConf — boolean → prefix with ~
 */
import { useEffect, useRef } from 'react'

const SIZE        = 64
const STROKE_W    = 6
const RADIUS      = (SIZE - STROKE_W) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function MacroRing({ label, value, max, color, lowConf = false }) {
  const circleRef = useRef(null)
  const ratio  = Math.min(Math.max((value ?? 0) / max, 0), 1)
  const offset = CIRCUMFERENCE * (1 - ratio)
  const display = lowConf ? `~${value ?? 0}` : `${value ?? 0}`

  useEffect(() => {
    if (!circleRef.current) return
    // Force reflow so CSS transition fires from 0 → filled
    circleRef.current.style.strokeDashoffset = `${CIRCUMFERENCE}`
    void circleRef.current.getBoundingClientRect()
    circleRef.current.style.strokeDashoffset = `${offset}`
  }, [value, offset])

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ overflow: 'visible' }}
      >
        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE_W}
        />
        {/* Value */}
        <circle
          ref={circleRef}
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          className="macro-stroke"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        {/* Centre value */}
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="middle"
          fontSize="13" fontWeight="700" fill="#f7efe0"
        >
          {display}
        </text>
      </svg>
      <span className="text-[10px] font-ui text-muted uppercase tracking-wider">{label}</span>
    </div>
  )
}
