import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import { STAT_MAX } from '../lib/constants'
import Toast from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function InventoryPage() {
  const { user } = useAuth()
  const { pet, setPet } = usePet()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [using, setUsing] = useState(null)

  async function loadInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('id, quantity, items(id, name, sprite, stat_target, stat_boost, category, description)')
      .eq('user_id', user.id)
      .gt('quantity', 0)
    setInventory(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadInventory() }, [])

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
              <button
                onClick={() => useItem(inv)}
                disabled={using === inv.id || !pet}
                className="shrink-0 bg-card hover:bg-hover border border-border text-text-primary text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-40"
              >
                {using === inv.id ? '…' : 'Use'}
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
