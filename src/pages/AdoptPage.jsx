import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Egg, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import { STAGE_EGG } from '../lib/constants'
import { award } from '../lib/achievements'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function isNightAvailable(nightStart, nightEnd) {
  const hour = new Date().getHours()
  if (nightStart <= nightEnd) return hour >= nightStart && hour < nightEnd
  return hour >= nightStart || hour < nightEnd
}

function formatNightHours(start, end) {
  const fmt = h => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
  return `${fmt(start)}–${fmt(end)}`
}

export default function AdoptPage() {
  const { user } = useAuth()
  const { pet, reload } = usePet()
  const navigate = useNavigate()
  const [species, setSpecies] = useState([])
  const [releaseCount, setReleaseCount] = useState(0)
  const [selected, setSelected] = useState(null)
  const [petName, setPetName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adopting, setAdopting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('species').select('*').eq('is_available', true),
      supabase.from('pets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_released', true),
    ]).then(([{ data: sp }, { count }]) => {
      setSpecies(sp ?? [])
      setReleaseCount(count ?? 0)
      setLoading(false)
    })
  }, [user])

  function getLockReason(sp) {
    if (sp.availability_type === 'night_only') {
      const start = sp.night_start ?? 22
      const end   = sp.night_end   ?? 6
      if (!isNightAvailable(start, end)) return `Available ${formatNightHours(start, end)}`
    }
    if (sp.availability_type === 'milestone') {
      const needed = sp.milestone_required ?? 1
      if (releaseCount < needed) return `Requires ${needed} release${needed === 1 ? '' : 's'} (you have ${releaseCount})`
    }
    return null
  }

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
      const { count } = await supabase.from('pets').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if ((count ?? 0) >= 3) award(supabase, user.id, 'collector')
      await reload()
      navigate('/pet')
    } catch (e) {
      setError(e.message)
      setAdopting(false)
    }
  }

  if (loading) return <LoadingSpinner message="Finding available eggs…" />

  if (pet) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <p className="text-text-primary font-semibold">You already have a pet</p>
      <p className="text-text-muted text-sm">Release your current pet before adopting a new egg.</p>
      <Button onClick={() => navigate('/pet')}>Go to my pet</Button>
    </div>
  )

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
          {species.map(sp => {
            const lockReason = getLockReason(sp)
            const isLocked = !!lockReason
            return (
              <button
                key={sp.id}
                onClick={() => !isLocked && setSelected(sp)}
                disabled={isLocked}
                className={`text-left p-4 rounded-lg border transition-colors relative
                  ${isLocked
                    ? 'border-border bg-surface opacity-50 cursor-not-allowed'
                    : selected?.id === sp.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border bg-surface hover:bg-hover'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {sp.egg_sprite
                    ? <img src={sp.egg_sprite} alt={sp.name} className="w-10 h-10 object-contain" />
                    : <div className="w-10 h-10 bg-card rounded flex items-center justify-center"><Egg size={18} className="text-text-muted" /></div>
                  }
                  <span className="font-semibold text-text-primary">{sp.name}</span>
                  {isLocked && <Lock size={13} className="text-text-muted ml-auto shrink-0" />}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{sp.description}</p>
                {isLocked && (
                  <p className="text-2xs text-text-muted mt-2 font-medium">{lockReason}</p>
                )}
              </button>
            )
          })}
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
