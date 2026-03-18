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
      const { data: decayCfg } = await supabase.from('decay_config').select('*')
      setDecayConfig(decayCfg ?? [])

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

      // Eggs don't have stats — skip decay entirely so they can't get sick or die
      if (petData.stage === 'egg') {
        setPet(petData)
      } else {
        // Apply time-based stat decay (may trigger sick or death)
        const decayed = applyDecay(petData, decayCfg ?? [])

        const sickChanged  = decayed.is_sick      !== petData.is_sick
        const aliveChanged = decayed.is_alive     !== petData.is_alive
        const sleepChanged = decayed.is_sleeping  !== petData.is_sleeping
        const statsChanged = decayed.hunger      !== petData.hunger
                          || decayed.happiness   !== petData.happiness
                          || decayed.cleanliness !== petData.cleanliness
                          || decayed.energy      !== petData.energy

        if (sickChanged || aliveChanged || sleepChanged || statsChanged) {
          const updates = {
            hunger:      decayed.hunger,
            happiness:   decayed.happiness,
            cleanliness: decayed.cleanliness,
            energy:      decayed.energy,
            last_stat_update: new Date().toISOString(),
          }
          if (sickChanged)  { updates.is_sick   = decayed.is_sick;   updates.sick_since = decayed.sick_since ?? null }
          if (aliveChanged) { updates.is_alive  = decayed.is_alive }
          if (sleepChanged) { updates.is_sleeping = decayed.is_sleeping; updates.sleep_started_at = decayed.sleep_started_at ?? null }
          await supabase.from('pets').update(updates).eq('id', petData.id)
        }

        setPet(decayed)
      }

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
