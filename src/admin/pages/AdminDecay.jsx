import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'

const STATS = ['hunger', 'happiness', 'cleanliness', 'energy']
const DEFAULTS = { hunger: 5, happiness: 3, cleanliness: 2, energy: 4 }

export default function AdminDecay() {
  const [rates, setRates] = useState({})
  const [recoveryWindow, setRecoveryWindow] = useState(48)
  const [releaseMinDays, setReleaseMinDays] = useState(5)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('decay_config').select('*').then(({ data }) => {
      const map = {}
      for (const row of (data ?? [])) {
        map[row.stat_name] = { id: row.id, value: row.points_per_hour }
        if (row.recovery_window_hours != null) setRecoveryWindow(row.recovery_window_hours)
        if (row.release_min_days != null) setReleaseMinDays(row.release_min_days)
      }
      setRates(map)
    })
  }, [])

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      for (const stat of STATS) {
        const value = Number(rates[stat]?.value ?? DEFAULTS[stat])
        const existing = rates[stat]
        if (existing?.id) {
          await supabase.from('decay_config').update({
            points_per_hour: value,
            recovery_window_hours: Number(recoveryWindow),
            release_min_days: Number(releaseMinDays),
            updated_at: new Date().toISOString()
          }).eq('id', existing.id)
        } else {
          await supabase.from('decay_config').insert({
            stat_name: stat,
            points_per_hour: value,
            recovery_window_hours: Number(recoveryWindow),
            release_min_days: Number(releaseMinDays),
          })
        }
      }
      setMsg('Saved!')
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <div>
        <h2 className="text-xl font-bold">Stat Decay & Recovery</h2>
        <p className="text-slate-400 text-sm mt-1">Controls how fast pets get sick and how long players have to save them.</p>
      </div>

      {msg && <div className="bg-slate-800 rounded-xl px-4 py-2 text-sm">{msg}</div>}

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Decay Rates</h3>
        <p className="text-slate-500 text-xs mb-2">How many stat points are lost per hour while the app is closed.</p>
        <div className="flex flex-col gap-4">
          {STATS.map(stat => (
            <div key={stat} className="flex flex-col gap-1">
              <label className="text-sm text-slate-300 capitalize">{stat} (pts/hr)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={rates[stat]?.value ?? DEFAULTS[stat]}
                onChange={e => setRates(r => ({ ...r, [stat]: { ...r[stat], value: e.target.value } }))}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:border-primary-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-5 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Sick Recovery Window</h3>
        <p className="text-slate-500 text-xs mb-2">How many hours a player has to use medicine before their pet is lost.</p>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Recovery window (hours)</label>
          <input
            type="number"
            min={1}
            step={1}
            value={recoveryWindow}
            onChange={e => setRecoveryWindow(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:border-primary-500"
          />
          <p className="text-slate-600 text-xs mt-1">
            Currently: {recoveryWindow} hours (~{Math.round(recoveryWindow / 24 * 10) / 10} days)
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-5 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Release Cooldown</h3>
        <p className="text-slate-500 text-xs mb-2">How many days a pet must be evolved before the Release button appears.</p>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-300">Minimum days evolved</label>
          <input
            type="number"
            min={0}
            step={1}
            value={releaseMinDays}
            onChange={e => setReleaseMinDays(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
    </div>
  )
}
