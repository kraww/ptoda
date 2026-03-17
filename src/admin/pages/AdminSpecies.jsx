import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'

const EMPTY = { name: '', description: '', egg_sprite: '', base_sprite: '', evolution_sprites: {}, is_available: true }

export default function AdminSpecies() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(null) // null = closed, {} = new, {id,...} = editing
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function load() {
    const { data } = await supabase.from('species').select('*').order('name')
    setList(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        egg_sprite: form.egg_sprite || null,
        base_sprite: form.base_sprite || null,
        evolution_sprites: form.evolution_sprites || {},
        is_available: form.is_available,
      }
      if (form.id) {
        await supabase.from('species').update(payload).eq('id', form.id)
      } else {
        await supabase.from('species').insert(payload)
      }
      setMsg('Saved!')
      setForm(null)
      await load()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(sp) {
    await supabase.from('species').update({ is_available: !sp.is_available }).eq('id', sp.id)
    await load()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Species</h2>
        <Button onClick={() => setForm({ ...EMPTY })}>+ New Species</Button>
      </div>

      {msg && <div className="bg-slate-800 rounded-xl px-4 py-2 text-sm">{msg}</div>}

      <div className="flex flex-col gap-3">
        {list.map(sp => (
          <div key={sp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{sp.name}</div>
              <div className="text-slate-400 text-sm line-clamp-1">{sp.description}</div>
              <div className={`text-xs mt-1 ${sp.is_available ? 'text-green-400' : 'text-slate-600'}`}>
                {sp.is_available ? 'Available' : 'Hidden'}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="secondary" onClick={() => setForm({ ...sp })}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => toggle(sp)}>
                {sp.is_available ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-slate-500 text-sm">No species yet. Add one!</p>}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{form.id ? 'Edit' : 'New'} Species</h3>
              <button onClick={() => setForm(null)} className="text-slate-400 text-2xl">&times;</button>
            </div>

            {[
              { field: 'name',        label: 'Name',           placeholder: 'e.g. Sproutling' },
              { field: 'description', label: 'Description',    placeholder: 'Short flavor text' },
              { field: 'egg_sprite',  label: 'Egg image URL',  placeholder: 'https://…' },
              { field: 'base_sprite', label: 'Baby image URL', placeholder: 'https://…' },
            ].map(({ field, label, placeholder }) => (
              <div key={field} className="flex flex-col gap-1">
                <label className="text-sm text-slate-400">{label}</label>
                <input
                  value={form[field] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">Evolution sprite URLs (JSON)</label>
              <textarea
                rows={3}
                value={JSON.stringify(form.evolution_sprites ?? {})}
                onChange={e => { try { setForm(f => ({ ...f, evolution_sprites: JSON.parse(e.target.value) })) } catch (_) {} }}
                placeholder={'{"gourmet":"https://…","wildling":"https://…"}'}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary-500"
              />
              <p className="text-xs text-slate-500">Keys: gourmet, wildling, pristine, dreamer</p>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
              Available for adoption
            </label>

            <div className="flex gap-3 pt-2">
              <Button onClick={save} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
