import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Egg } from 'lucide-react'
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
        hunger: 80, happiness: 80, cleanliness: 80, energy: 80,
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
    <div className="flex flex-col gap-6">

      <div>
        <h1 className="text-2xl font-bold text-text-primary">Adopt an Egg</h1>
        <p className="text-text-muted text-sm mt-1">Choose a species — how you raise it determines what it becomes</p>
      </div>

      {error && (
        <div className="bg-danger/5 border border-danger/30 rounded text-danger text-sm px-4 py-3">{error}</div>
      )}

      {species.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Egg size={36} className="text-text-muted" />
          <p className="text-text-muted text-sm">No eggs available right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {species.map(sp => (
            <button
              key={sp.id}
              onClick={() => setSelected(sp)}
              className={`text-left p-4 rounded-lg border transition-colors
                ${selected?.id === sp.id
                  ? 'border-accent bg-accent/5'
                  : 'border-border bg-surface hover:bg-hover'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                {sp.egg_sprite
                  ? <img src={sp.egg_sprite} alt={sp.name} className="w-10 h-10 object-contain" />
                  : <div className="w-10 h-10 bg-card rounded flex items-center justify-center"><Egg size={18} className="text-text-muted" /></div>
                }
                <span className="font-semibold text-text-primary">{sp.name}</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{sp.description}</p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Name your {selected.name}</p>
            <p className="text-xs text-text-muted mt-0.5">You can't change this later</p>
          </div>
          <input
            type="text"
            value={petName}
            onChange={e => setPetName(e.target.value)}
            placeholder="Enter a name…"
            maxLength={20}
            className="field"
          />
          <Button onClick={handleAdopt} disabled={adopting || !petName.trim()}>
            {adopting ? 'Adopting…' : 'Adopt'}
          </Button>
        </div>
      )}
    </div>
  )
}
