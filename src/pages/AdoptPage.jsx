import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import { STAGE_EGG } from '../lib/constants'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function AdoptPage() {
  const { user } = useAuth()
  const { reload } = usePet()
  const navigate = useNavigate()
  const [species, setSpecies] = useState([])
  const [selected, setSelected] = useState(null)
  const [petName, setPetName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adopting, setAdopting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('species').select('*').eq('is_available', true).then(({ data }) => {
      setSpecies(data ?? [])
      setLoading(false)
    })
  }, [])

  async function handleAdopt() {
    if (!selected || !petName.trim()) return
    setAdopting(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('pets').insert({
        user_id: user.id,
        species_id: selected.id,
        name: petName.trim(),
        stage: STAGE_EGG,
        hunger: 80,
        happiness: 80,
        cleanliness: 80,
        energy: 80,
        action_counts: { feed: 0, play: 0, clean: 0, sleep: 0 },
        is_alive: true,
        last_stat_update: new Date().toISOString(),
      })
      if (err) throw err
      await reload()
      navigate('/pet')
    } catch (e) {
      setError(e.message)
      setAdopting(false)
    }
  }

  if (loading) return <LoadingSpinner message="Finding available eggs…" />

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary-400">Choose Your Egg</h1>
        <p className="text-slate-400 text-sm mt-1">Each species hatches differently — pick the one calling to you</p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {species.length === 0 ? (
        <div className="text-center text-slate-500 py-12">
          <div className="text-4xl mb-3">🪺</div>
          No eggs available right now. Check back soon!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {species.map(sp => (
            <button
              key={sp.id}
              onClick={() => setSelected(sp)}
              className={`rounded-2xl border-2 p-4 text-center transition-all
                ${selected?.id === sp.id
                  ? 'border-primary-500 bg-primary-900/30'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}
            >
              <div className="text-5xl mb-2">
                {sp.egg_sprite ? (
                  <img src={sp.egg_sprite} alt={sp.name} className="w-16 h-16 mx-auto object-contain" />
                ) : '🥚'}
              </div>
              <div className="font-semibold text-sm">{sp.name}</div>
              <div className="text-slate-400 text-xs mt-1 line-clamp-2">{sp.description}</div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-3 bg-slate-900 rounded-2xl p-4 border border-slate-800">
          <p className="text-sm text-slate-300">Give your <span className="text-primary-400 font-semibold">{selected.name}</span> egg a name:</p>
          <input
            type="text"
            value={petName}
            onChange={e => setPetName(e.target.value)}
            placeholder="Enter a name…"
            maxLength={20}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-primary-500"
          />
          <Button onClick={handleAdopt} disabled={adopting || !petName.trim()} size="lg">
            {adopting ? 'Adopting…' : '🥚 Adopt This Egg'}
          </Button>
        </div>
      )}
    </div>
  )
}
