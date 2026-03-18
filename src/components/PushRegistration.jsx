import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const VAPID_PUBLIC = 'BCWXDgDwg1h-lr6JEQZV5QrJTWrL49L8Iyy_6ddFLLy2u3eoqNw8SVxZB2Ai0kN6vLT45rmV-V1uWOCt-tkYb3g'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function PushRegistration() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return

    async function register() {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) return // Already subscribed

        // Only prompt if permission is already granted or default (not denied)
        if (Notification.permission !== 'granted') return

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        })

        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          subscription: sub.toJSON(),
        }, { onConflict: 'user_id' })
      } catch {}
    }

    register()
  }, [user])

  return null
}
