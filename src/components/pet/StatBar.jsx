import { Utensils, Smile, Sparkles, Zap } from 'lucide-react'
import { STAT_CRITICAL } from '../../lib/constants'

const STAT_META = {
  hunger:      { label: 'Hunger',      Icon: Utensils, color: 'bg-orange-400',  track: 'bg-orange-400/10' },
  happiness:   { label: 'Happiness',   Icon: Smile,    color: 'bg-yellow-400',  track: 'bg-yellow-400/10' },
  cleanliness: { label: 'Cleanliness', Icon: Sparkles, color: 'bg-sky-400',     track: 'bg-sky-400/10'    },
  energy:      { label: 'Energy',      Icon: Zap,      color: 'bg-green-400',   track: 'bg-green-400/10'  },
}

export default function StatBar({ stat, value }) {
  const meta = STAT_META[stat]
  if (!meta) return null
  const { label, Icon, color, track } = meta
  const pct = Math.max(0, Math.min(100, value))
  const isCritical = pct <= STAT_CRITICAL

  return (
    <div className="flex items-center gap-3">
      <Icon
        size={14}
        strokeWidth={2}
        className={isCritical ? 'text-danger shrink-0' : 'text-text-muted shrink-0'}
      />
      <div className="flex-1">
        <div className="flex justify-between text-2xs text-text-muted mb-1.5">
          <span>{label}</span>
          <span className={isCritical ? 'text-danger font-semibold' : ''}>{pct}</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${isCritical ? 'bg-danger/10' : track}`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ${isCritical ? 'bg-danger' : color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
