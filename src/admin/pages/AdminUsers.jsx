import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles')
      .select('id, username, coins, created_at, pets(id, name, stage, is_alive)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setUsers(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold">Users</h2>
        <p className="text-slate-400 text-sm mt-1">View registered players and their pets.</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by username…"
        className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
      />

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(u => {
            const activePet = u.pets?.find(p => p.is_alive)
            return (
              <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{u.username}</div>
                    <div className="text-slate-500 text-xs">{u.id}</div>
                  </div>
                  <div className="text-primary-400 text-sm">{u.coins} 🪙</div>
                </div>
                {activePet ? (
                  <div className="mt-2 text-xs text-slate-400">
                    Pet: <span className="text-slate-200">{activePet.name}</span> ({activePet.stage})
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-600">No active pet</div>
                )}
                <div className="mt-1 text-xs text-slate-600">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-slate-500 text-sm">No users found</p>}
        </div>
      )}
    </div>
  )
}
