import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Upload, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'

async function uploadImage(file) {
  const ext = file.name.split('.').pop()
  const path = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('assets').upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from('assets').getPublicUrl(path).data.publicUrl
}

export default function AdminAvatars() {
  const [avatars, setAvatars]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [name, setName]               = useState('')
  const [isDefault, setIsDefault]     = useState(true)
  const [imageFile, setImageFile]     = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const fileRef                       = useRef()

  async function load() {
    const { data } = await supabase.from('avatars').select('*').order('created_at')
    setAvatars(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!imageFile) { setError('Please upload an image'); return }
    setSaving(true)
    setError(null)
    try {
      const image_url = await uploadImage(imageFile)
      const { error: err } = await supabase.from('avatars').insert({
        name: name.trim(),
        image_url,
        is_default: isDefault,
      })
      if (err) throw err
      setName('')
      setIsDefault(true)
      setImageFile(null)
      setImagePreview(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this avatar? Users who have it selected will revert to initials.')) return
    await supabase.from('avatars').delete().eq('id', id)
    await load()
  }

  async function toggleDefault(av) {
    await supabase.from('avatars').update({ is_default: !av.is_default }).eq('id', av.id)
    await load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Avatars</h2>
        <p className="text-text-muted text-sm mt-1">
          Default avatars are available to all users. Non-default ones are unlocked via achievements.
        </p>
      </div>

      {/* Upload form */}
      <form onSubmit={handleAdd} className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-primary">Upload Avatar</p>
        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex items-center gap-4">
          {imagePreview
            ? <img src={imagePreview} className="w-16 h-16 rounded-full object-cover border border-border" alt="preview" />
            : <div className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-card flex items-center justify-center"><Upload size={18} className="text-text-muted" /></div>
          }
          <button type="button" onClick={() => fileRef.current?.click()}
            className="text-xs text-accent-light hover:underline">
            {imagePreview ? 'Change image' : 'Choose image'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="field text-sm" placeholder="e.g. Classic Blue" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
            className="w-4 h-4 accent-purple-500" />
          <span className="text-sm text-text-secondary">Default (available to all users)</span>
        </label>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 self-start bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded transition-colors disabled:opacity-40">
          <Plus size={14} /> Add Avatar
        </button>
      </form>

      {/* Avatar grid */}
      {loading ? <p className="text-text-muted text-sm">Loading…</p> : (
        <div className="grid grid-cols-3 gap-3">
          {avatars.map(av => (
            <div key={av.id} className="bg-surface border border-border rounded-lg p-3 flex flex-col items-center gap-2">
              <img src={av.image_url} alt={av.name} className="w-16 h-16 rounded-full object-cover border border-border" />
              <p className="text-xs font-medium text-text-primary text-center">{av.name}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleDefault(av)} title={av.is_default ? 'Default (click to make unlockable)' : 'Unlockable (click to make default)'}
                  className={`transition-colors ${av.is_default ? 'text-warn' : 'text-text-muted hover:text-warn'}`}>
                  <Star size={13} fill={av.is_default ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => handleDelete(av.id)} className="text-text-muted hover:text-danger transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {avatars.length === 0 && <p className="text-text-muted text-sm col-span-3">No avatars uploaded yet</p>}
        </div>
      )}
    </div>
  )
}
