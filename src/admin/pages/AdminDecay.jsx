import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'

const STATS = ['hunger', 'happiness', 'cleanliness', 'energy']
const DEFAULTS = { hunger: 5, happiness: 3, cleanliness: 2, energy: 4 }

export default function AdminDecay() {
  const [rates, setRates] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('decay_config').select('*').then(({ data }) => {
      const map = {}
      for (const row of (data ?? [])) {
        map[row.stat_name] = { id: row.id, value: row.points_per_hour }
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
          await supabase.from('decay_config').update({ points_per_hour: value, updated_at: new Date().toISOString() }).eq('id', existing.id)
        } else {
          await supabase.from('decay_config').insert({ stat_name: stat, points_per_hour: value })
        }
      }
      setMsg('Decay rates saved!')
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-sm">
      <div>
        <h2 className="text-xl font-bold">Stat Decay Rates</h2>
        <p className="text-slate-400 text-sm mt-1">How many points each stat loses per hour while the app is closed.</p>
      </div>

      {msg && <div className="bg-slate-800 rounded-xl px-4 py-2 text-sm">{msg}</div>}

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

      <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Rates'}</Button>
    </div>
  )
}
