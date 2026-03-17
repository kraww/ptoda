import { useEffect, useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // user id being edited
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

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

  function startEdit(u) {
    setEditing(u.id)
    setEditValue(u.username ?? '')
    setSaveError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setEditValue('')
    setSaveError(null)
  }

  async function saveUsername(userId) {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed.length < 2) { setSaveError('Min 2 characters'); return }
    if (trimmed.length > 20)            { setSaveError('Max 20 characters'); return }

    setSaving(true)
    setSaveError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', userId)

    if (error) {
      setSaveError(error.message.includes('unique') ? 'Username already taken' : error.message)
      setSaving(false)
      return
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, username: trimmed } : u))
    setEditing(null)
    setSaving(false)
  }

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Users</h2>
        <p className="text-text-muted text-sm mt-1">View and manage registered players.</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by username…"
        className="field"
      />

      {loading ? (
        <p className="text-text-muted text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(u => {
            const activePet  = u.pets?.find(p => p.is_alive)
            const isEditing  = editing === u.id
            return (
              <div key={u.id} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveUsername(u.id); if (e.key === 'Escape') cancelEdit() }}
                            className="field text-sm py-1 px-2 flex-1"
                            maxLength={20}
                            autoFocus
                          />
                          <button onClick={() => saveUsername(u.id)} disabled={saving} className="text-success hover:opacity-80 transition-opacity disabled:opacity-40"><Check size={15} /></button>
                          <button onClick={cancelEdit} className="text-text-muted hover:text-text-primary transition-colors"><X size={15} /></button>
                        </div>
                        {saveError && <p className="text-xs text-danger">{saveError}</p>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">{u.username}</span>
                        <button onClick={() => startEdit(u)} className="text-text-muted hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100">
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                    <p className="text-2xs text-text-muted mt-0.5 truncate">{u.id}</p>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-text-muted">{u.coins} coins</span>
                      <button onClick={() => startEdit(u)} className="text-text-muted hover:text-text-primary transition-colors">
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex items-center gap-4 text-xs text-text-muted">
                  {activePet ? (
                    <span>Pet: <span className="text-text-secondary capitalize">{activePet.name} ({activePet.stage})</span></span>
                  ) : (
                    <span>No active pet</span>
                  )}
                  <span>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-text-muted text-sm">No users found</p>}
        </div>
      )}
    </div>
  )
}
