import { useEffect, useState } from 'react'
import { Package, Gift, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePet } from '../../context/PetContext'
import { STAT_MAX } from '../../lib/constants'
import Drawer from '../ui/Drawer'
import Toast from '../ui/Toast'
import Button from '../ui/Button'

export default function InventoryDrawer({ open, onClose, compact = false }) {
  const { user } = useAuth()
  const { pet, setPet } = usePet()
  const [inventory, setInventory] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(false)
  const [using, setUsing] = useState(null)
  const [toast, setToast] = useState(null)

  // Gift state
  const [giftingInv, setGiftingInv] = useState(null)
  const [giftFriendId, setGiftFriendId] = useState('')
  const [gifting, setGifting] = useState(false)

  async function loadInventory() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('inventory')
      .select('id, quantity, items(id, name, sprite, stat_target, stat_boost, category, description)')
      .eq('user_id', user.id)
      .gt('quantity', 0)
    setInventory(data ?? [])
    setLoading(false)
  }

  async function loadFriends() {
    if (!user) return
    const { data: fships } = await supabase
      .from('friendships')
      .select('requester_id, recipient_id, status')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    const otherIds = (fships ?? [])
      .filter(f => f.status === 'accepted')
      .map(f => f.requester_id === user.id ? f.recipient_id : f.requester_id)
    if (otherIds.length === 0) { setFriends([]); return }
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', otherIds)
    setFriends(profiles ?? [])
  }

  useEffect(() => {
    if (open) { loadInventory(); loadFriends() }
  }, [open])

  async function useItem(inv) {
    if (using || !pet) return
    setUsing(inv.id)
    try {
      const item   = inv.items
      const stat   = item.stat_target
      const newVal = Math.min(STAT_MAX, (pet[stat] ?? 0) + item.stat_boost)

      await supabase.from('pets').update({
        [stat]: newVal,
        last_stat_update: new Date().toISOString(),
      }).eq('id', pet.id)

      await supabase.from('inventory').update({ quantity: inv.quantity - 1 }).eq('id', inv.id)
      await supabase.from('care_log').insert({ pet_id: pet.id, action: 'item', item_id: item.id, coins_earned: 0 })

      setPet(p => ({ ...p, [stat]: newVal }))
      setToast(`Used ${item.name} — +${item.stat_boost} ${stat}`)
      await loadInventory()
    } catch {
      setToast('Failed to use item')
    } finally {
      setUsing(null)
    }
  }

  async function sendGift() {
    if (!giftingInv || !giftFriendId) return
    setGifting(true)
    try {
      const itemId = giftingInv.items.id
      const { data: existing } = await supabase.from('inventory')
        .select('id, quantity').eq('user_id', giftFriendId).eq('item_id', itemId).maybeSingle()
      if (existing) {
        await supabase.from('inventory').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
      } else {
        await supabase.from('inventory').insert({ user_id: giftFriendId, item_id: itemId, quantity: 1, gifted_from: user.id })
      }
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
    } catch {
      setToast('Failed to send gift')
    } finally {
      setGifting(false)
    }
  }

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Use an Item" compact={compact}>
        {!pet && (
          <p className="text-text-muted text-sm text-center py-8">Adopt a pet to use items</p>
        )}

        {pet && loading && (
          <p className="text-text-muted text-sm text-center py-8">Loading…</p>
        )}

        {pet && !loading && inventory.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Package size={28} className="text-text-muted" />
            <p className="text-text-muted text-sm">Your bag is empty</p>
            <p className="text-2xs text-text-muted">Buy items in the Shop</p>
          </div>
        )}

        {pet && !loading && inventory.length > 0 && (
          <div className="flex flex-col gap-2 pb-2">
            {inventory.map(inv => (
              <div
                key={inv.id}
                className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-3"
              >
                {/* Icon */}
                <div className="w-9 h-9 bg-surface rounded flex items-center justify-center shrink-0">
                  {inv.items.sprite
                    ? <img src={inv.items.sprite} alt={inv.items.name} className="w-7 h-7 object-contain" />
                    : <Package size={14} className="text-text-muted" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{inv.items.name}</p>
                  <p className="text-xs text-text-muted">
                    +{inv.items.stat_boost} {inv.items.stat_target} · x{inv.quantity}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {friends.length > 0 && (
                    <button
                      onClick={() => { setGiftingInv(inv); setGiftFriendId('') }}
                      className="text-text-muted hover:text-accent-light transition-colors"
                      title="Gift to friend"
                    >
                      <Gift size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => useItem(inv)}
                    disabled={using === inv.id}
                    className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                  >
                    {using === inv.id ? '…' : 'Use'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* Gift modal */}
      {giftingInv && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-text-primary">Gift {giftingInv.items.name}</p>
              <button onClick={() => setGiftingInv(null)} className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Send to</label>
              <select
                value={giftFriendId}
                onChange={e => setGiftFriendId(e.target.value)}
                className="field text-sm"
              >
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
    </>
  )
}
