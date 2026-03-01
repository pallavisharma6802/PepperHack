/**
 * AllergenFilter — slide-up panel for allergen preferences.
 * P4 owns this. Changes propagate instantly via allergenStore.
 *
 * Props: onClose — callback to close the panel
 *
 * Sections:
 *   1. Per-user preset pills (Gluten, Dairy, Nuts…)
 *   2. Free-text custom allergens
 *   3. Order for the Table — add party members with their own allergen sets
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAllergenStore, { ALLERGEN_OPTIONS } from '../store/allergenStore'

export function AllergenFilter({ onClose }) {
  const activeAllergens          = useAllergenStore((s) => s.activeAllergens)
  const customText               = useAllergenStore((s) => s.customText)
  const toggleAllergen           = useAllergenStore((s) => s.toggleAllergen)
  const setCustomText            = useAllergenStore((s) => s.setCustomText)
  const clearAll                 = useAllergenStore((s) => s.clearAll)
  const tableMode                = useAllergenStore((s) => s.tableMode)
  const setTableMode             = useAllergenStore((s) => s.setTableMode)
  const partyMembers             = useAllergenStore((s) => s.partyMembers)
  const addPartyMember           = useAllergenStore((s) => s.addPartyMember)
  const removePartyMember        = useAllergenStore((s) => s.removePartyMember)
  const togglePartyMemberAllergen = useAllergenStore((s) => s.togglePartyMemberAllergen)

  const [newName, setNewName] = useState('')

  const activeCount = activeAllergens.size + (customText.trim() ? 1 : 0)
  const totalPartyAllergens = partyMembers.reduce((n, m) => n + m.allergens.size, 0)

  const handleAddMember = () => {
    addPartyMember(newName)
    setNewName('')
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/70 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-surface px-5 pt-4 pb-10 overflow-y-auto"
        style={{ maxWidth: 390, margin: '0 auto', maxHeight: '88vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.10)' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-dim" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-xl text-cream">Allergen Filters</h3>
          {(activeCount > 0 || totalPartyAllergens > 0) && (
            <button
              onClick={clearAll}
              className="text-xs font-ui text-amber tracking-wider uppercase cursor-pointer bg-transparent border-none"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Preset pill toggles */}
        <div className="flex flex-wrap gap-2 mb-5">
          {ALLERGEN_OPTIONS.map((a) => {
            const active = activeAllergens.has(a)
            return (
              <button
                key={a}
                onClick={() => toggleAllergen(a)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold font-ui tracking-wider cursor-pointer border transition-colors ${
                  active
                    ? 'bg-danger/20 text-danger border-danger/40'
                    : 'bg-bg2 text-muted border-dim'
                }`}
              >
                {active && <span className="mr-1">⚠</span>}No {a}
              </button>
            )
          })}
        </div>

        {/* Custom text */}
        <div className="mb-5">
          <label className="block text-[11px] font-ui text-muted tracking-wider uppercase mb-2">
            Other allergens (comma-separated)
          </label>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="e.g. sesame, mustard, peanuts"
            className="w-full bg-bg2 text-cream text-sm font-ui rounded-2xl px-4 py-3 outline-none border border-dim focus:border-amber transition-colors placeholder:text-muted/40"
          />
        </div>

        {/* ── Order for the Table ── */}
        <div className="border-t border-dim pt-4 mb-5">
          <button
            onClick={() => setTableMode(!tableMode)}
            className="flex items-center justify-between w-full mb-3 bg-transparent border-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">👥</span>
              <span className="text-sm font-ui font-semibold text-cream">Order for the Table</span>
              {tableMode && totalPartyAllergens > 0 && (
                <span className="text-[10px] bg-amber/20 text-amber px-1.5 py-0.5 rounded-full font-ui">
                  {totalPartyAllergens} active
                </span>
              )}
            </div>
            <motion.span
              animate={{ rotate: tableMode ? 180 : 0 }}
              className="text-muted text-sm"
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {tableMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <p className="text-[11px] text-muted font-ui mb-3">
                  Add everyone at the table — dishes are dimmed if they contain anyone’s allergens.
                </p>

                {/* Party member list */}
                {partyMembers.map((member) => (
                  <div key={member.id} className="mb-4 p-3 bg-bg2 rounded-xl border border-dim">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-ui font-semibold text-cream">{member.name}</span>
                      <button
                        onClick={() => removePartyMember(member.id)}
                        className="text-muted text-xs bg-transparent border-none cursor-pointer hover:text-danger"
                      >
                        ✕ Remove
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALLERGEN_OPTIONS.map((a) => {
                        const active = member.allergens.has(a)
                        return (
                          <button
                            key={a}
                            onClick={() => togglePartyMemberAllergen(member.id, a)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-ui cursor-pointer border transition-colors ${
                              active
                                ? 'bg-danger/20 text-danger border-danger/40'
                                : 'bg-surface text-muted border-dim'
                            }`}
                          >
                            {a}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Add member row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                    placeholder="Name (e.g. Alex)"
                    className="flex-1 bg-bg2 text-cream text-sm font-ui rounded-xl px-3 py-2.5 outline-none border border-dim focus:border-amber transition-colors placeholder:text-muted/40"
                  />
                  <button
                    onClick={handleAddMember}
                    className="px-4 py-2.5 rounded-xl bg-amber text-black font-ui font-bold text-sm cursor-pointer border-none flex-shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Done */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-full bg-amber text-black font-ui font-bold text-sm tracking-wider uppercase cursor-pointer"
          style={{ animation: 'glow 2s ease-in-out infinite' }}
        >
          Done
        </button>
      </motion.div>
    </>
  )
}
