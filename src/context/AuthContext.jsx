import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(null)
  const [loginBonus, setLoginBonus] = useState(null)   // { streak, bonus } — shown once then cleared
  const [loginStreak, setLoginStreak] = useState(0)    // persists for session, shown in sidebar

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const [{ data }, { data: streakData }] = await Promise.all([
      supabase.from('profiles').select('*, avatar:active_avatar(id, image_url)').eq('id', userId).single(),
      supabase.rpc('record_login'),
    ])
    setProfile(data ?? null)
    if (streakData) {
      setLoginStreak(streakData.streak ?? 0)
      if (streakData.streak > 0) setLoginBonus(streakData)
    }
  }

  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const loading = user === undefined

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginBonus, loginStreak, clearLoginBonus: () => setLoginBonus(null), signUp, signIn, signOut, loadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
