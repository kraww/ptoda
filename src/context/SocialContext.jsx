import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SocialContext = createContext(null)

export function SocialProvider({ children }) {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) return
    const [{ count: pending }, { count: unread }] = await Promise.all([
      supabase.from('friendships').select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id).eq('status', 'pending'),
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id).eq('is_read', false),
    ])
    setPendingCount(pending ?? 0)
    setUnreadCount(unread ?? 0)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return (
    <SocialContext.Provider value={{ pendingCount, unreadCount, refresh }}>
      {children}
    </SocialContext.Provider>
  )
}

export function useSocial() {
  const ctx = useContext(SocialContext)
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider')
  return ctx
}
