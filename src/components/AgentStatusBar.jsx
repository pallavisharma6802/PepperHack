/**
 * AgentStatusBar - 4 agent indicators, amber dot → green checkmark.
 * Person 3 owns this. Reads agentStatus from Zustand.
 */
import { motion } from 'framer-motion'
import { useStore } from '../store'

const AGENTS = [
  { id: 'scanner', label: 'Reading menu', icon: '⌖' },
  { id: 'photo', label: 'Finding photos', icon: '◈' },
  { id: 'recommender', label: 'Mining reviews', icon: '◉' },
  { id: 'nutritionist', label: 'Estimating macros', icon: '◎' },
]

export function AgentStatusBar() {
  const agentStatus = useStore((s) => s.agentStatus)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-muted font-ui tracking-widest uppercase mb-1">
        AI Agents
      </p>
      {AGENTS.map((agent) => {
        const state = agentStatus[agent.id] || 'pending'
        const isDone = state === 'done'
        const isRunning = state === 'running'
        const isError = state === 'error'

        return (
          <motion.div
            key={agent.id}
            className="flex items-center gap-3 px-3 py-2 rounded-2xl border transition-all duration-300"
            style={{
              background: isDone
                ? 'rgba(207,128,8,0.06)'
                : isRunning
                  ? 'rgba(207,128,8,0.04)'
                  : 'rgba(0,0,0,0.02)',
              borderColor: isDone
                ? 'rgba(207,128,8,0.25)'
                : isRunning
                  ? 'rgba(207,128,8,0.15)'
                  : '#E4DFD6',
            }}
          >
            <div className="relative w-2.5 h-2.5 flex-shrink-0">
              <motion.div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: isError
                    ? '#DC2626'
                    : isDone
                      ? '#16A34A'
                      : isRunning
                        ? '#CF8008'
                        : '#D4CFC8',
                }}
                animate={isRunning ? { scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] } : {}}
                transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
              />
              {isRunning && (
                <motion.div
                  className="absolute -inset-1 rounded-full border border-amber opacity-50"
                  animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </div>
            <span
              className="text-sm font-mono"
              style={{
                color: isDone || isRunning ? '#CF8008' : '#C4BEB6',
              }}
            >
              {agent.icon}
            </span>
            <span
              className="flex-1 text-sm font-ui"
              style={{
                color: isDone || isRunning ? '#1A1714' : '#8A7E6E',
              }}
            >
              {agent.label}
            </span>
            {isDone && (
              <motion.span
                className="text-safe text-sm font-bold"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              >
                ✓
              </motion.span>
            )}
            {isRunning && (
              <span className="text-amber text-[10px] font-ui tracking-wider animate-pulse">
                working
              </span>
            )}
            {isError && (
              <span className="text-danger text-xs font-ui">error</span>
            )}
            {state === 'pending' && (
              <span className="text-dim text-xs">—</span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
