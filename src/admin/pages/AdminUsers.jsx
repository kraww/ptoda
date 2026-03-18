import { useEffect, useState } from 'react'
import { Pencil, Check, X, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const EVOLUTION_FORMS = ['gourmet', 'wildling', 'pristine', 'dreamer']

export default function AdminUsers() {
  const [users, setUsers]       = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [msg, setMsg]           = useState(null)

  // Inline edits
  const [editUsername, setEditUsername] = useState({ id: null, value: '', error: null, saving: false })
  const [editCoins,    setEditCoins]    = useState({ id: null, value: '', saving: false })

  // Inventory
  const [inventories, setInventories] = useState({})  // userId → rows
  const [allItems,    setAllItems]    = useState([])
  const [addingItem,  setAddingItem]  = useState(null)
  const [addItemId,   setAddItemId]   = useState('')
  const [addItemQty,  setAddItemQty]  = useState(1)

  // Pet actions
  const [evolving,   setEvolving]   = useState(null)  // userId
  const [evolveForm, setEvolveForm] = useState('')

  useEffect(() => {
    loadUsers()
    supabase.from('items').select('id, name').order('name').then(({ data }) => setAllItems(data ?? []))
  }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, coins, created_at, pets(id, name, stage, is_alive, evolution_form, species_id, species:species_id(name))')
      .order('created_at', { ascending: false })
      .limit(200)
    setUsers(data ?? [])
    setLoading(false)
  }

  async function loadInventory(userId) {
    const { data } = await supabase
      .from('inventory')
      .select('id, quantity, items(id, name)')
      .eq('user_id', userId)
      .gt('quantity', 0)
    setInventories(inv => ({ ...inv, [userId]: data ?? [] }))
  }

  async function toggleExpand(userId) {
    if (expandedId === userId) {
      setExpandedId(null)
    } else {
      setExpandedId(userId)
      if (!inventories[userId]) await loadInventory(userId)
    }
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(null), 3000) }

  // ── Username ──────────────────────────────────────────────
  async function saveUsername(userId) {
    const trimmed = editUsername.value.trim()
    if (!trimmed || trimmed.length < 2) { setEditUsername(s => ({ ...s, error: 'Min 2 characters' })); return }
    if (trimmed.length > 20)            { setEditUsername(s => ({ ...s, error: 'Max 20 characters' })); return }
    setEditUsername(s => ({ ...s, saving: true, error: null }))
    const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', userId)
    if (error) {
      setEditUsername(s => ({ ...s, error: error.message.includes('unique') ? 'Username taken' : error.message, saving: false }))
      return
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, username: trimmed } : u))
    setEditUsername({ id: null, value: '', error: null, saving: false })
    flash('Username updated')
  }

  // ── Coins ─────────────────────────────────────────────────
  async function saveCoins(userId) {
    const val = parseInt(editCoins.value)
    if (isNaN(val) || val < 0) return
    setEditCoins(s => ({ ...s, saving: true }))
    await supabase.from('profiles').update({ coins: val }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, coins: val } : u))
    setEditCoins({ id: null, value: '', saving: false })
    flash('Coins updated')
  }

  // ── Inventory ─────────────────────────────────────────────
  async function addItem(userId) {
    if (!addItemId || addItemQty < 1) return
    const { data: existing } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('item_id', addItemId)
      .maybeSingle()
    if (existing) {
      await supabase.from('inventory').update({ quantity: existing.quantity + addItemQty }).eq('id', existing.id)
    } else {
      await supabase.from('inventory').insert({ user_id: userId, item_id: addItemId, quantity: addItemQty })
    }
    setAddingItem(null)
    setAddItemId('')
    setAddItemQty(1)
    await loadInventory(userId)
    flash('Item added')
  }

  async function removeInventoryRow(invId, userId) {
    if (!confirm('Remove this item from the user\'s inventory?')) return
    await supabase.from('inventory').delete().eq('id', invId)
    await loadInventory(userId)
    flash('Item removed')
  }

  // ── Pet actions ────────────────────────────────────────────
  async function resetPetStats(petId) {
    if (!confirm('Reset all stats to 100 and clear sick state?')) return
    await supabase.from('pets').update({
      hunger: 100, happiness: 100, cleanliness: 100, energy: 100,
      is_sick: false, sick_since: null,
      last_stat_update: new Date().toISOString(),
    }).eq('id', petId)
    flash('Pet stats reset')
  }

  async function forceEvolve(petId, userId) {
    if (!evolveForm) return
    await supabase.from('pets').update({
      stage: 'evolved',
      evolution_form: evolveForm,
      evolved_at: new Date().toISOString(),
    }).eq('id', petId)
    setEvolving(null)
    setEvolveForm('')
    await loadUsers()
    flash('Pet evolved')
  }

  async function removePet(petId) {
    if (!confirm('Mark this pet as dead? This cannot be undone.')) return
    await supabase.from('pets').update({ is_alive: false }).eq('id', petId)
    await loadUsers()
    flash('Pet removed')
  }

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Users</h2>
        <p className="text-text-muted text-sm mt-0.5">View and manage registered players.</p>
      </div>

      {msg && (
        <div className="bg-surface border border-border rounded text-text-secondary text-sm px-4 py-2">{msg}</div>
      )}

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by username…"
        className="field"
      />

      {loading ? <p className="text-text-muted text-sm">Loading…</p> : (
        <div className="flex flex-col gap-3">
          {filtered.map(u => {
            const activePet  = u.pets?.find(p => p.is_alive)
            const isExpanded = expandedId === u.id

            return (
              <div key={u.id} className="bg-surface border border-border rounded-lg overflow-hidden">

                {/* ── Header row ── */}
                <div className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">

                    {/* Username edit */}
                    {editUsername.id === u.id ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <input
                            value={editUsername.value}
                            onChange={e => setEditUsername(s => ({ ...s, value: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveUsername(u.id)
                              if (e.key === 'Escape') setEditUsername({ id: null, value: '', error: null, saving: false })
                            }}
                            className="field text-sm py-1 px-2 flex-1"
                            maxLength={20}
                            autoFocus
                          />
                          <button onClick={() => saveUsername(u.id)} disabled={editUsername.saving} className="text-success disabled:opacity-40"><Check size={14} /></button>
                          <button onClick={() => setEditUsername({ id: null, value: '', error: null, saving: false })} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
                        </div>
                        {editUsername.error && <p className="text-xs text-danger">{editUsername.error}</p>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text-primary">{u.username}</span>
                        <button
                          onClick={() => setEditUsername({ id: u.id, value: u.username ?? '', error: null, saving: false })}
                          className="text-text-muted hover:text-text-primary transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}

                    <p className="text-2xs text-text-muted mt-0.5 truncate">
                      {activePet
                        ? <span className="capitalize">{activePet.name} · {activePet.species?.name ?? '?'} · {activePet.evolution_form ?? activePet.stage}</span>
                        : 'No active pet'
                      }
                      {' · '}Joined {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Coins edit */}
                  {editCoins.id === u.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={0}
                        value={editCoins.value}
                        onChange={e => setEditCoins(s => ({ ...s, value: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveCoins(u.id)
                          if (e.key === 'Escape') setEditCoins({ id: null, value: '', saving: false })
                        }}
                        className="field text-sm py-1 px-2 w-24"
                        autoFocus
                      />
                      <button onClick={() => saveCoins(u.id)} className="text-success"><Check size={14} /></button>
                      <button onClick={() => setEditCoins({ id: null, value: '', saving: false })} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditCoins({ id: u.id, value: String(u.coins ?? 0), saving: false })}
                      className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors shrink-0"
                    >
                      {u.coins ?? 0} coins <Pencil size={11} />
                    </button>
                  )}

                  <button
                    onClick={() => toggleExpand(u.id)}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover rounded transition-colors shrink-0"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* ── Expanded panel ── */}
                {isExpanded && (
                  <div className="border-t border-border bg-bg px-4 py-4 flex flex-col gap-5">

                    {/* Pet management */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Pet</p>

                      {activePet ? (
                        <div className="bg-surface border border-border rounded-lg px-3 py-3 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text-primary capitalize">{activePet.name}</p>
                              <p className="text-xs text-text-muted capitalize">
                                {activePet.species?.name ?? '?'} · {activePet.evolution_form ?? activePet.stage}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => resetPetStats(activePet.id)}
                              className="text-xs px-2.5 py-1.5 bg-card border border-border rounded text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                            >
                              Reset stats to 100
                            </button>

                            {activePet.stage !== 'evolved' && (
                              evolving === u.id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={evolveForm}
                                    onChange={e => setEvolveForm(e.target.value)}
                                    className="field text-xs py-1 px-2"
                                  >
                                    <option value="">Pick form…</option>
                                    {EVOLUTION_FORMS.map(f => (
                                      <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => forceEvolve(activePet.id, u.id)}
                                    disabled={!evolveForm}
                                    className="text-xs px-2.5 py-1.5 bg-accent/10 border border-accent/20 rounded text-accent-light hover:bg-accent/20 transition-colors disabled:opacity-40"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => { setEvolving(null); setEvolveForm('') }}
                                    className="text-text-muted hover:text-text-primary"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEvolving(u.id); setEvolveForm('') }}
                                  className="text-xs px-2.5 py-1.5 bg-card border border-border rounded text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                                >
                                  Force evolve
                                </button>
                              )
                            )}

                            <button
                              onClick={() => removePet(activePet.id)}
                              className="text-xs px-2.5 py-1.5 bg-danger/5 border border-danger/20 rounded text-danger hover:bg-danger/10 transition-colors"
                            >
                              Remove pet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted">No active pet.</p>
                      )}
                    </div>

                    {/* Inventory */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Inventory</p>
                        <button
                          onClick={() => { setAddingItem(u.id); setAddItemId(''); setAddItemQty(1) }}
                          className="flex items-center gap-1 text-xs text-accent-light hover:underline"
                        >
                          <Plus size={11} /> Add item
                        </button>
                      </div>

                      {addingItem === u.id && (
                        <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5">
                          <select
                            value={addItemId}
                            onChange={e => setAddItemId(e.target.value)}
                            className="field text-xs py-1 px-2 flex-1"
                          >
                            <option value="">Select item…</option>
                            {allItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                          <input
                            type="number"
                            value={addItemQty}
                            onChange={e => setAddItemQty(parseInt(e.target.value) || 1)}
                            min={1}
                            max={99}
                            className="field text-xs py-1 px-2 w-16"
                          />
                          <button
                            onClick={() => addItem(u.id)}
                            disabled={!addItemId}
                            className="text-xs text-accent-light hover:underline disabled:opacity-40"
                          >
                            Add
                          </button>
                          <button onClick={() => setAddingItem(null)} className="text-text-muted hover:text-text-primary">
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      {(inventories[u.id] ?? []).length === 0 ? (
                        <p className="text-xs text-text-muted">No items.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {(inventories[u.id] ?? []).map(inv => (
                            <div key={inv.id} className="flex items-center gap-2 bg-surface border border-border rounded px-3 py-2">
                              <span className="text-xs text-text-primary flex-1">{inv.items?.name}</span>
                              <span className="text-xs text-text-muted">×{inv.quantity}</span>
                              <button
                                onClick={() => removeInventoryRow(inv.id, u.id)}
                                className="text-text-muted hover:text-danger transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-text-muted text-sm">No users found.</p>}
        </div>
      )}
    </div>
  )
}
