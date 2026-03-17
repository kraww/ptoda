import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'

const FIELD_DEFS = {
  'meter-stopper': [
    { key: 'speed',      label: 'Speed',         type: 'number', step: '0.1', hint: 'Needle speed (1 = slow, 3 = fast)' },
    { key: 'zone_width', label: 'Zone Width',     type: 'number', step: '0.01', hint: 'Green zone size 0–1 (e.g. 0.18 = 18%)' },
    { key: 'coins_min',  label: 'Min Coins',      type: 'number', hint: 'Coins for worst score' },
    { key: 'coins_max',  label: 'Max Coins',      type: 'number', hint: 'Coins for perfect score' },
  ],
  'simon': [
    { key: 'initial_speed',   label: 'Initial Flash (ms)', type: 'number', hint: 'Flash duration in ms for round 1' },
    { key: 'speed_decrease',  label: 'Speed Increase',     type: 'number', hint: 'ms reduced per round' },
    { key: 'coins_per_round', label: 'Coins per Round',    type: 'number' },
    { key: 'max_coins',       label: 'Max Coins',          type: 'number' },
  ],
  'lucky-roll': [
    { key: 'win_chance', label: 'Win Chance', type: 'number', step: '0.01', hint: '0.0 – 1.0 (e.g. 0.45 = 45%)' },
    { key: 'coins_win',  label: 'Coins (win)', type: 'number' },
  ],
}

export default function AdminGames() {
  const [games, setGames] = useState([])
  const [editing, setEditing] = useState(null) // game key being edited
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    supabase.from('games').select('*').order('key').then(({ data }) => setGames(data ?? []))
  }, [])

  function openEdit(game) {
    setEditing(game.key)
    setForm({
      name: game.name,
      description: game.description ?? '',
      is_active: game.is_active,
      daily_submission_limit: game.daily_submission_limit,
      ...game.config,
    })
    setSaved(null)
  }

  async function save() {
    setSaving(true)
    const game = games.find(g => g.key === editing)
    const fields = FIELD_DEFS[editing] ?? []
    const config = {}
    fields.forEach(f => {
      config[f.key] = f.type === 'number' ? Number(form[f.key]) : form[f.key]
    })
    await supabase.from('games').update({
      name: form.name,
      description: form.description,
      is_active: form.is_active,
      daily_submission_limit: Number(form.daily_submission_limit),
      config,
    }).eq('id', game.id)
    const { data } = await supabase.from('games').select('*').order('key')
    setGames(data ?? [])
    setSaved(editing)
    setSaving(false)
  }

  async function toggleActive(game) {
    await supabase.from('games').update({ is_active: !game.is_active }).eq('id', game.id)
    setGames(gs => gs.map(g => g.id === game.id ? { ...g, is_active: !g.is_active } : g))
  }

  const fields = FIELD_DEFS[editing] ?? []

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-text-primary">Games</h2>

      {/* Game list */}
      <div className="flex flex-col gap-3">
        {games.map(game => (
          <div key={game.key} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-text-primary">{game.name}</p>
                <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${game.is_active ? 'bg-success/15 text-success' : 'bg-card text-text-muted'}`}>
                  {game.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{game.description}</p>
              <p className="text-2xs text-text-muted mt-1">Limit: {game.daily_submission_limit}/day</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => toggleActive(game)}>
                {game.is_active ? 'Disable' : 'Enable'}
              </Button>
              <Button size="sm" onClick={() => openEdit(game)}>Edit</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Edit — {games.find(g => g.key === editing)?.name}</h3>
            {saved === editing && <span className="text-xs text-success">Saved</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-text-muted mb-1 block">Name</label>
              <input className="field" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-text-muted mb-1 block">Description</label>
              <input className="field" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Daily Submission Limit</label>
              <input className="field" type="number" value={form.daily_submission_limit ?? 3} onChange={e => setForm(f => ({ ...f, daily_submission_limit: e.target.value }))} />
            </div>
          </div>

          <div>
            <p className="section-label mb-3">Game Config</p>
            <div className="grid grid-cols-2 gap-3">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="text-xs text-text-muted mb-1 block">
                    {field.label}
                    {field.hint && <span className="ml-1 text-text-muted opacity-60">({field.hint})</span>}
                  </label>
                  <input
                    className="field"
                    type={field.type}
                    step={field.step}
                    value={form[field.key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
