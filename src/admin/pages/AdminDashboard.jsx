import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [users, pets, species, items] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('pets').select('id', { count: 'exact', head: true }).eq('is_alive', true),
        supabase.from('species').select('id', { count: 'exact', head: true }),
        supabase.from('items').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        users:   users.count ?? 0,
        pets:    pets.count  ?? 0,
        species: species.count ?? 0,
        items:   items.count ?? 0,
      })
    }
    load()
  }, [])

  const tiles = [
    { label: 'Players',      value: stats?.users,   icon: '👥' },
    { label: 'Active Pets',  value: stats?.pets,    icon: '🐾' },
    { label: 'Species',      value: stats?.species, icon: '🧬' },
    { label: 'Shop Items',   value: stats?.items,   icon: '📦' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {tiles.map(t => (
          <div key={t.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-1">{t.icon}</div>
            <div className="text-2xl font-bold">{t.value ?? '—'}</div>
            <div className="text-slate-400 text-sm">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
