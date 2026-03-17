import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getAchievementIcon } from '../../lib/achievements'

const BLANK = { key: '', name: '', description: '', icon: 'Trophy' }
const ICON_OPTIONS = ['Trophy', 'Egg', 'Sparkles', 'Utensils', 'Gamepad2', 'Moon', 'Heart', 'Package', 'ShoppingBag']

export default function AdminAchievements() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data } = await supabase.from('achievements').select('*').order('key')
    setAchievements(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('achievements').insert({
      key: form.key.trim().toLowerCase().replace(/\s+/g, '_'),
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(BLANK)
    await load()
    setSaving(false)
  }

  async function handleDelete(key) {
    if (!confirm(`Delete achievement "${key}"? This also removes it from all users.`)) return
    await supabase.from('achievements').delete().eq('key', key)
    await load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Achievements</h2>
        <p className="text-text-muted text-sm mt-1">Define achievements players can earn.</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-primary">New Achievement</p>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Key (unique, no spaces)</label>
            <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} required className="field text-sm" placeholder="e.g. first_hatch" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Display Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="field text-sm" placeholder="e.g. First Hatch" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className="field text-sm" placeholder="Short description of how to earn it" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Icon</label>
          <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="field text-sm">
            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} className="flex items-center gap-2 self-start bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded transition-colors disabled:opacity-40">
          <Plus size={14} /> Add Achievement
        </button>
      </form>

      {/* List */}
      {loading ? (
        <p className="text-text-muted text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {achievements.map(a => {
            const Icon = getAchievementIcon(a.icon)
            return (
              <div key={a.key} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                <Icon size={16} className="text-accent-light shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{a.name} <span className="text-text-muted font-normal text-xs">({a.key})</span></p>
                  <p className="text-xs text-text-muted">{a.description}</p>
                </div>
                <button onClick={() => handleDelete(a.key)} className="text-text-muted hover:text-danger transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
          {achievements.length === 0 && <p className="text-text-muted text-sm">No achievements yet</p>}
        </div>
      )}
    </div>
  )
}
