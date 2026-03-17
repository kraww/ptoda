import { useEffect, useState } from 'react'
import { Package, Gift, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import { STAT_MAX } from '../lib/constants'
import Toast from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'

export default function InventoryPage() {
  const { user } = useAuth()
  const { pet, setPet } = usePet()
  const [inventory, setInventory] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [using, setUsing] = useState(null)
  const [giftingInv, setGiftingInv] = useState(null)
  const [giftFriendId, setGiftFriendId] = useState('')
  const [gifting, setGifting] = useState(false)

  async function loadInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('id, quantity, items(id, name, sprite, stat_target, stat_boost, category, description)')
      .eq('user_id', user.id)
      .gt('quantity', 0)
    setInventory(data ?? [])
    setLoading(false)
  }

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select('requester_id, recipient_id, requester:requester_id(id, username), recipient:recipient_id(id, username)')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'accepted')
    const list = (data ?? []).map(f => f.requester_id === user.id ? f.recipient : f.requester)
    setFriends(list)
  }

  useEffect(() => { loadInventory(); loadFriends() }, [])

  async function useItem(inv) {
    if (using || !pet) return
    setUsing(inv.id)
    try {
      const item = inv.items
      const stat = item.stat_target
      const newVal = Math.min(STAT_MAX, (pet[stat] ?? 0) + item.stat_boost)

      await supabase.from('pets').update({ [stat]: newVal, last_stat_update: new Date().toISOString() }).eq('id', pet.id)
      await supabase.from('inventory').update({ quantity: inv.quantity - 1 }).eq('id', inv.id)
      await supabase.from('care_log').insert({ pet_id: pet.id, action: 'item', item_id: item.id, coins_earned: 0 })

      setPet(p => ({ ...p, [stat]: newVal }))
      setToast(`Used ${item.name} — +${item.stat_boost} ${stat}`)
      await loadInventory()
    } catch { setToast('Failed to use item') }
    finally { setUsing(null) }
  }

  async function sendGift() {
    if (!giftingInv || !giftFriendId) return
    setGifting(true)
    try {
      const itemId = giftingInv.items.id
      // Add to recipient's inventory
      const { data: existing } = await supabase.from('inventory')
        .select('id, quantity').eq('user_id', giftFriendId).eq('item_id', itemId).maybeSingle()
      if (existing) {
        await supabase.from('inventory').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
      } else {
        await supabase.from('inventory').insert({ user_id: giftFriendId, item_id: itemId, quantity: 1, gifted_from: user.id })
      }
      // Remove from sender's inventory
      if (giftingInv.quantity <= 1) {
        await supabase.from('inventory').delete().eq('id', giftingInv.id)
      } else {
        await supabase.from('inventory').update({ quantity: giftingInv.quantity - 1 }).eq('id', giftingInv.id)
      }
      const friend = friends.find(f => f.id === giftFriendId)
      setToast(`Gifted ${giftingInv.items.name} to ${friend?.username}`)
      setGiftingInv(null)
      setGiftFriendId('')
      await loadInventory()
    } catch { setToast('Failed to send gift') }
    finally { setGifting(false) }
  }

  if (loading) return <LoadingSpinner message="Loading your items…" />

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Inventory</h1>
        <p className="text-text-muted text-sm mt-0.5">Items you own — tap to use on your pet</p>
      </div>

      {!pet && (
        <div className="bg-warn/5 border border-warn/30 rounded text-warn text-sm px-4 py-3">
          Adopt a pet to use items
        </div>
      )}

      {inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Package size={36} className="text-text-muted" />
          <p className="text-text-muted text-sm">Your bag is empty</p>
          <p className="text-2xs text-text-muted">Buy items in the Shop</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {inventory.map(inv => (
            <div key={inv.id} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-4">
              <div className="w-10 h-10 bg-card rounded flex items-center justify-center shrink-0">
                {inv.items.sprite
                  ? <img src={inv.items.sprite} alt={inv.items.name} className="w-8 h-8 object-contain" />
                  : <Package size={16} className="text-text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{inv.items.name}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  +{inv.items.stat_boost} {inv.items.stat_target} · x{inv.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {friends.length > 0 && (
                  <button onClick={() => { setGiftingInv(inv); setGiftFriendId('') }}
                    className="text-text-muted hover:text-accent-light transition-colors"
                    title="Gift to friend">
                    <Gift size={15} />
                  </button>
                )}
                <button
                  onClick={() => useItem(inv)}
                  disabled={using === inv.id || !pet}
                  className="bg-card hover:bg-hover border border-border text-text-primary text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                >
                  {using === inv.id ? '…' : 'Use'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gift modal */}
      {giftingInv && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-text-primary">Gift {giftingInv.items.name}</p>
              <button onClick={() => setGiftingInv(null)} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Send to</label>
              <select value={giftFriendId} onChange={e => setGiftFriendId(e.target.value)} className="field text-sm">
                <option value="">Select a friend…</option>
                {friends.map(f => <option key={f.id} value={f.id}>{f.username}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={sendGift} disabled={gifting || !giftFriendId}>
                {gifting ? 'Sending…' : 'Send Gift'}
              </Button>
              <Button variant="ghost" onClick={() => setGiftingInv(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
