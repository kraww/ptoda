import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { applyDecay } from '../lib/statDecay'
import { useAuth } from './AuthContext'

const PetContext = createContext(null)

export function PetProvider({ children }) {
  const { user } = useAuth()
  const [pet, setPet] = useState(null)
  const [species, setSpecies] = useState(null)
  const [decayConfig, setDecayConfig] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadPet = useCallback(async () => {
    if (!user) { setPet(null); setSpecies(null); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      // Load decay config
      const { data: decayCfg } = await supabase.from('decay_config').select('*')
      setDecayConfig(decayCfg ?? [])

      // Load pet
      const { data: petData, error: petErr } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_alive', true)
        .order('adopted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (petErr) throw petErr

      if (!petData) { setPet(null); setSpecies(null); setLoading(false); return }

      // Apply time-based stat decay
      const decayed = applyDecay(petData, decayCfg ?? [])
      setPet(decayed)

      // Load species info
      const { data: sp } = await supabase
        .from('species')
        .select('*')
        .eq('id', petData.species_id)
        .single()
      setSpecies(sp ?? null)
    } catch (e) {
      setError(e?.message ?? 'Failed to load pet')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadPet() }, [loadPet])

  return (
    <PetContext.Provider value={{ pet, setPet, species, decayConfig, loading, error, reload: loadPet }}>
      {children}
    </PetContext.Provider>
  )
}

export function usePet() {
  const ctx = useContext(PetContext)
  if (!ctx) throw new Error('usePet must be used inside PetProvider')
  return ctx
}
