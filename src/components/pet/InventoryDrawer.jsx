import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePet } from '../../context/PetContext'
import { STAT_MAX } from '../../lib/constants'
import Drawer from '../ui/Drawer'
import Toast from '../ui/Toast'

export default function InventoryDrawer({ open, onClose }) {
  const { user } = useAuth()
  const { pet, setPet } = usePet()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(false)
  const [using, setUsing] = useState(null)
  const [toast, setToast] = useState(null)

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

  useEffect(() => {
    if (open) loadInventory()
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

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Use an Item">
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

                {/* Use button */}
                <button
                  onClick={() => useItem(inv)}
                  disabled={using === inv.id}
                  className="shrink-0 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                >
                  {using === inv.id ? '…' : 'Use'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
