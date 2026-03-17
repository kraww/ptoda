import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import ImageUpload from '../components/ImageUpload'

const CATEGORIES = ['food', 'toy', 'soap', 'bed']
const STATS = ['hunger', 'happiness', 'cleanliness', 'energy']
const EMPTY = { name: '', description: '', category: 'food', price: 10, stat_target: 'hunger', stat_boost: 20, sprite: '', is_available: true }

export default function AdminItems() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function load() {
    const { data } = await supabase.from('items').select('*').order('name')
    setList(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const payload = { ...form, price: Number(form.price), stat_boost: Number(form.stat_boost), sprite: form.sprite || null }
      if (form.id) {
        await supabase.from('items').update(payload).eq('id', form.id)
      } else {
        const { id: _, ...rest } = payload
        await supabase.from('items').insert(rest)
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

  async function toggle(item) {
    await supabase.from('items').update({ is_available: !item.is_available }).eq('id', item.id)
    await load()
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Shop Items</h2>
        <Button onClick={() => setForm({ ...EMPTY })}>+ New Item</Button>
      </div>

      {msg && <div className="bg-slate-800 rounded-xl px-4 py-2 text-sm">{msg}</div>}

      <div className="flex flex-col gap-3">
        {list.map(item => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-slate-400 text-xs">{item.category} · {item.price} 🪙 · +{item.stat_boost} {item.stat_target}</div>
              <div className={`text-xs mt-1 ${item.is_available ? 'text-green-400' : 'text-slate-600'}`}>
                {item.is_available ? 'In shop' : 'Hidden'}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="secondary" onClick={() => setForm({ ...item })}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => toggle(item)}>
                {item.is_available ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-slate-500 text-sm">No items yet. Add one!</p>}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{form.id ? 'Edit' : 'New'} Item</h3>
              <button onClick={() => setForm(null)} className="text-slate-400 text-2xl">&times;</button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Kibble Snack"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">Description</label>
              <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-400">Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-400">Stat target</label>
                <select value={form.stat_target} onChange={e => set('stat_target', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none">
                  {STATS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-400">Price (coins)</label>
                <input type="number" min={0} value={form.price} onChange={e => set('price', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-400">Stat boost (+pts)</label>
                <input type="number" min={1} max={100} value={form.stat_boost} onChange={e => set('stat_boost', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>

            <ImageUpload label="Item image" value={form.sprite} folder="items"
              onChange={url => set('sprite', url)} />

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_available} onChange={e => set('is_available', e.target.checked)} />
              Show in shop
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
