import { STAT_CRITICAL } from '../../lib/constants'

const STAT_META = {
  hunger:      { label: 'Hunger',      emoji: '🍖', color: 'bg-orange-400' },
  happiness:   { label: 'Happiness',   emoji: '⭐', color: 'bg-yellow-400' },
  cleanliness: { label: 'Cleanliness', emoji: '🫧', color: 'bg-sky-400' },
  energy:      { label: 'Energy',      emoji: '⚡', color: 'bg-green-400' },
}

export default function StatBar({ stat, value }) {
  const meta = STAT_META[stat] ?? { label: stat, emoji: '•', color: 'bg-slate-400' }
  const pct = Math.max(0, Math.min(100, value))
  const isCritical = pct <= STAT_CRITICAL

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg w-6 text-center">{meta.emoji}</span>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{meta.label}</span>
          <span className={isCritical ? 'text-red-400 font-bold' : ''}>{pct}</span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-red-400' : meta.color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
