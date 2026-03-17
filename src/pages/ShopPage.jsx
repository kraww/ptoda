import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Toast from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const CATEGORY_LABEL = { food: 'Food', toy: 'Toy', soap: 'Cleaning', bed: 'Rest', medicine: 'Medicine' }

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
    if (coins < item.price) { setToast('Not enough coins'); return }
    setBuying(item.id)
    try {
      await supabase.from('profiles').update({ coins: coins - item.price }).eq('id', user.id)
      const { data: existing } = await supabase.from('inventory')
        .select('id, quantity').eq('user_id', user.id).eq('item_id', item.id).maybeSingle()
      if (existing) {
        await supabase.from('inventory').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
      } else {
        await supabase.from('inventory').insert({ user_id: user.id, item_id: item.id, quantity: 1 })
      }
      await loadProfile(user.id)
      setToast(`Purchased ${item.name}`)
    } catch { setToast('Purchase failed') }
    finally { setBuying(null) }
  }

  if (loading) return <LoadingSpinner message="Loading shop…" />

  return (
    <div className="flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Shop</h1>
          <p className="text-text-muted text-sm mt-0.5">Spend coins on care items</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-text-primary">{profile?.coins ?? 0}</p>
          <p className="text-2xs text-text-muted">coins</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <ShoppingBag size={36} className="text-text-muted" />
          <p className="text-text-muted text-sm">Nothing in stock yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item.id} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-4">
              <div className="w-10 h-10 bg-card rounded flex items-center justify-center shrink-0">
                {item.sprite
                  ? <img src={item.sprite} alt={item.name} className="w-8 h-8 object-contain" />
                  : <ShoppingBag size={16} className="text-text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{item.name}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {CATEGORY_LABEL[item.category] ?? item.category} · +{item.stat_boost} {item.stat_target}
                </p>
              </div>
              <button
                onClick={() => buy(item)}
                disabled={buying === item.id}
                className="shrink-0 bg-card hover:bg-hover border border-border text-text-primary text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-40"
              >
                {buying === item.id ? '…' : `${item.price} coins`}
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
