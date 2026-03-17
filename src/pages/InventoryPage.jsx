import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import { STAT_MAX, COINS_PER_ACTION } from '../lib/constants'
import Toast from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function InventoryPage() {
  const { user, profile, loadProfile } = useAuth()
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

      await supabase.from('pets').update({
        [stat]: newVal,
        last_stat_update: new Date().toISOString(),
      }).eq('id', pet.id)

      await supabase.from('inventory').update({ quantity: inv.quantity - 1 }).eq('id', inv.id)
      await supabase.from('care_log').insert({ pet_id: pet.id, action: 'item', item_id: item.id, coins_earned: 0 })

      setPet(p => ({ ...p, [stat]: newVal }))
      setToast(`Used ${item.name}! +${item.stat_boost} ${stat}`)
      await loadInventory()
    } catch (e) {
      setToast('Failed to use item')
    } finally {
      setUsing(null)
    }
  }

  if (loading) return <LoadingSpinner message="Loading your items…" />

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Your Items</h1>

      {inventory.length === 0 ? (
        <div className="text-center text-slate-500 py-16">
          <div className="text-4xl mb-3">🎒</div>
          <p>Your bag is empty</p>
          <p className="text-sm mt-1">Buy items in the Shop!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {inventory.map(inv => (
            <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-center">
                {inv.items.sprite
                  ? <img src={inv.items.sprite} alt={inv.items.name} className="w-16 h-16 object-contain" />
                  : <span className="text-4xl">{CATEGORY_EMOJI[inv.items.category] ?? '📦'}</span>}
              </div>
              <div className="font-semibold text-sm text-center">{inv.items.name}</div>
              <div className="text-slate-500 text-xs text-center">x{inv.quantity}</div>
              <button
                onClick={() => useItem(inv)}
                disabled={using === inv.id || !pet}
                className="mt-auto bg-primary-700 hover:bg-primary-600 active:scale-95 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-semibold transition-all"
              >
                {using === inv.id ? '…' : 'Use'}
              </button>
            </div>
          ))}
        </div>
      )}

      {!pet && (
        <p className="text-center text-slate-500 text-sm">Adopt a pet to use items</p>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

const CATEGORY_EMOJI = { food: '🍖', toy: '⭐', soap: '🫧', bed: '⚡' }
