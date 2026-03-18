import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const VAPID_PUBLIC = 'BCWXDgDwg1h-lr6JEQZV5QrJTWrL49L8Iyy_6ddFLLy2u3eoqNw8SVxZB2Ai0kN6vLT45rmV-V1uWOCt-tkYb3g'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function PushPermissionBanner() {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem('push-dismissed')) return
    setVisible(true)
  }, [user])

  async function enable() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setVisible(false); return }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        subscription: sub.toJSON(),
      }, { onConflict: 'user_id' })
    } catch {}
    setVisible(false)
  }

  function dismiss() {
    localStorage.setItem('push-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-surface border border-accent/30 rounded-lg px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
        <Bell size={15} className="text-accent-light" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">Get pet reminders</p>
        <p className="text-xs text-text-muted mt-0.5">We'll notify you when your pet needs attention</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={enable} className="text-xs font-semibold text-accent-light hover:text-accent transition-colors">
          Enable
        </button>
        <button onClick={dismiss} className="text-text-muted hover:text-text-primary transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
