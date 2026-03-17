import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const BLANK = { key: '', name: '', description: '', image_url: '',
                reward_type: '', reward_value: '', reward_coins: 0, reward_item_id: '' }

const REWARD_TYPES = [
  { value: '',       label: 'No reward' },
  { value: 'theme',  label: 'Unlock theme' },
  { value: 'avatar', label: 'Unlock avatar' },
]

const THEME_OPTIONS = ['forest'] // add more unlockable themes here

async function uploadImage(file) {
  const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
  const { error } = await supabase.storage.from('achievements').upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from('achievements').getPublicUrl(path).data.publicUrl
}

export default function AdminAchievements() {
  const [achievements, setAchievements] = useState([])
  const [avatars, setAvatars]           = useState([])
  const [items, setItems]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [form, setForm]                 = useState(BLANK)
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)
  const fileRef                         = useRef()

  async function load() {
    const [{ data: ach }, { data: av }, { data: it }] = await Promise.all([
      supabase.from('achievements').select('*').order('key'),
      supabase.from('avatars').select('id, name'),
      supabase.from('items').select('id, name').order('name'),
    ])
    setAchievements(ach ?? [])
    setAvatars(av ?? [])
    setItems(it ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let image_url = form.image_url
      if (imageFile) image_url = await uploadImage(imageFile)

      const { error: err } = await supabase.from('achievements').insert({
        key:            form.key.trim().toLowerCase().replace(/\s+/g, '_'),
        name:           form.name.trim(),
        description:    form.description.trim(),
        image_url:      image_url || null,
        reward_type:    form.reward_type || null,
        reward_value:   form.reward_value || null,
        reward_coins:   Number(form.reward_coins) || 0,
        reward_item_id: form.reward_item_id || null,
      })
      if (err) throw err
      setForm(BLANK)
      setImageFile(null)
      setImagePreview(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(key) {
    if (!confirm(`Delete "${key}"? This removes it from all users.`)) return
    await supabase.from('achievements').delete().eq('key', key)
    await load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Achievements</h2>
        <p className="text-text-muted text-sm mt-1">Define achievements and their rewards.</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-primary">New Achievement</p>
        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Key (unique)</label>
            <input value={form.key} onChange={e => set('key', e.target.value)} required className="field text-sm" placeholder="first_hatch" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Display Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required className="field text-sm" placeholder="First Hatch" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} required className="field text-sm" placeholder="How to earn this achievement" />
        </div>

        {/* Image upload */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Badge Image</label>
          <div className="flex items-center gap-3">
            {imagePreview
              ? <img src={imagePreview} className="w-12 h-12 rounded object-cover border border-border" alt="preview" />
              : <div className="w-12 h-12 rounded border border-dashed border-border bg-card flex items-center justify-center"><Upload size={14} className="text-text-muted" /></div>
            }
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs text-accent-light hover:underline">
              {imagePreview ? 'Change image' : 'Upload image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>
        </div>

        {/* Rewards */}
        <div className="border-t border-border pt-3 flex flex-col gap-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Rewards (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Coins</label>
              <input type="number" min="0" value={form.reward_coins} onChange={e => set('reward_coins', e.target.value)} className="field text-sm" placeholder="0" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Item</label>
              <select value={form.reward_item_id} onChange={e => set('reward_item_id', e.target.value)} className="field text-sm">
                <option value="">None</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Unlock type</label>
              <select value={form.reward_type} onChange={e => { set('reward_type', e.target.value); set('reward_value', '') }} className="field text-sm">
                {REWARD_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {form.reward_type === 'theme' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-muted">Theme key</label>
                <select value={form.reward_value} onChange={e => set('reward_value', e.target.value)} className="field text-sm">
                  <option value="">Select theme</option>
                  {THEME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {form.reward_type === 'avatar' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-muted">Avatar</label>
                <select value={form.reward_value} onChange={e => set('reward_value', e.target.value)} className="field text-sm">
                  <option value="">Select avatar</option>
                  {avatars.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 self-start bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded transition-colors disabled:opacity-40">
          <Plus size={14} /> Add Achievement
        </button>
      </form>

      {/* List */}
      {loading ? <p className="text-text-muted text-sm">Loading…</p> : (
        <div className="flex flex-col gap-2">
          {achievements.map(a => (
            <div key={a.key} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
              {a.image_url
                ? <img src={a.image_url} className="w-9 h-9 rounded object-cover shrink-0" alt={a.name} />
                : <div className="w-9 h-9 rounded bg-card border border-border shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{a.name} <span className="text-text-muted font-normal text-xs">({a.key})</span></p>
                <p className="text-xs text-text-muted">{a.description}</p>
                {(a.reward_coins > 0 || a.reward_item_id || a.reward_type) && (
                  <p className="text-2xs text-accent-light mt-0.5">
                    Rewards: {[
                      a.reward_coins > 0 && `${a.reward_coins} coins`,
                      a.reward_item_id && 'item',
                      a.reward_type === 'theme'  && `theme: ${a.reward_value}`,
                      a.reward_type === 'avatar' && `avatar unlock`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <button onClick={() => handleDelete(a.key)} className="text-text-muted hover:text-danger transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {achievements.length === 0 && <p className="text-text-muted text-sm">No achievements yet</p>}
        </div>
      )}
    </div>
  )
}
