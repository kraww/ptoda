import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Toast from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function ShopPage() {
  const { user, profile, loadProfile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    supabase.from('items').select('*').eq('is_available', true).order('price').then(({ data }) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])

  async function buy(item) {
    if (buying) return
    const coins = profile?.coins ?? 0
    if (coins < item.price) { setToast('Not enough coins!'); return }
    setBuying(item.id)
    try {
      // Deduct coins
      await supabase.from('profiles').update({ coins: coins - item.price }).eq('id', user.id)

      // Add to inventory (upsert quantity)
      const { data: existing } = await supabase.from('inventory')
        .select('id, quantity').eq('user_id', user.id).eq('item_id', item.id).maybeSingle()
      if (existing) {
        await supabase.from('inventory').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
      } else {
        await supabase.from('inventory').insert({ user_id: user.id, item_id: item.id, quantity: 1 })
      }

      await loadProfile(user.id)
      setToast(`Bought ${item.name}!`)
    } catch (e) {
      setToast('Purchase failed')
    } finally {
      setBuying(null)
    }
  }

  if (loading) return <LoadingSpinner message="Loading shop…" />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shop</h1>
        <div className="text-primary-400 font-bold">{profile?.coins ?? 0} 🪙</div>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-slate-500 py-16">
          <div className="text-4xl mb-3">🏪</div>
          Shop is stocked soon — check back!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map(item => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-center">
                {item.sprite
                  ? <img src={item.sprite} alt={item.name} className="w-16 h-16 object-contain" />
                  : <span className="text-4xl">{CATEGORY_EMOJI[item.category] ?? '📦'}</span>}
              </div>
              <div className="font-semibold text-sm text-center">{item.name}</div>
              <div className="text-slate-400 text-xs text-center line-clamp-2">{item.description}</div>
              <div className="text-xs text-center text-primary-300">
                +{item.stat_boost} {item.stat_target}
              </div>
              <button
                onClick={() => buy(item)}
                disabled={buying === item.id}
                className="mt-auto bg-primary-700 hover:bg-primary-600 active:scale-95 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-semibold transition-all"
              >
                {buying === item.id ? '…' : `${item.price} 🪙`}
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

const CATEGORY_EMOJI = { food: '🍖', toy: '⭐', soap: '🫧', bed: '⚡' }
