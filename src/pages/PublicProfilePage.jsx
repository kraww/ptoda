import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { loadAchievements, getAchievementIcon } from '../lib/achievements'
import PetSprite from '../components/pet/PetSprite'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function Avatar({ username, size = 72 }) {
  const initial = (username ?? '?')[0].toUpperCase()
  return (
    <div
      className="rounded-full bg-accent/20 flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      <span className="font-bold text-accent-light">{initial}</span>
    </div>
  )
}

export default function PublicProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [currentPet, setCurrentPet] = useState(null)
  const [pastEvolutions, setPastEvolutions] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, bio, created_at')
        .eq('username', username)
        .maybeSingle()

      if (!prof) { setNotFound(true); setLoading(false); return }
      setProfile(prof)

      const [{ data: pet }, { data: past }] = await Promise.all([
        supabase
          .from('pets')
          .select('*, species:species_id(*)')
          .eq('user_id', prof.id)
          .eq('is_alive', true)
          .order('adopted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('pets')
          .select('id, name, stage, evolution_form, evolved_at, species:species_id(*)')
          .eq('user_id', prof.id)
          .eq('stage', 'evolved')
          .eq('is_alive', false)
          .order('evolved_at', { ascending: false }),
      ])

      setCurrentPet(pet ?? null)
      setPastEvolutions(past ?? [])
      const allAch = await loadAchievements(supabase, prof.id)
      setAchievements(allAch.filter(a => a.earned))
      setLoading(false)
    }
    load()
  }, [username])

  if (loading) return <LoadingSpinner message="Loading profile…" />

  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <p className="text-text-primary font-semibold">User not found</p>
      <p className="text-text-muted text-sm">No one goes by "{username}"</p>
      <Link to="/" className="text-accent-light text-sm hover:underline">Go home</Link>
    </div>
  )

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-20 flex flex-col gap-5">

      {/* Back link */}
      <Link to="/" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit">
        <ArrowLeft size={14} /> Home
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar username={profile.username} size={72} />
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{profile.username}</h1>
          {memberSince && <p className="text-xs text-text-muted mt-0.5">Joined {memberSince}</p>}
        </div>
      </div>

      {/* Bio */}
      {profile.bio?.trim() && (
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <p className="text-sm text-text-secondary">{profile.bio}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface border border-border rounded-lg px-4 py-3 text-center">
          <p className="text-lg font-bold text-text-primary">{pastEvolutions.length}</p>
          <p className="text-2xs text-text-muted mt-0.5">Past Evolutions</p>
        </div>
        <div className="bg-surface border border-border rounded-lg px-4 py-3 text-center">
          <p className="text-lg font-bold text-text-primary capitalize">
            {currentPet ? (currentPet.evolution_form ?? currentPet.stage) : '—'}
          </p>
          <p className="text-2xs text-text-muted mt-0.5">Current Stage</p>
        </div>
      </div>

      {/* Current pet */}
      {currentPet && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <p className="section-label px-4 pt-4 pb-3">Current Pet</p>
          <div className="flex items-center gap-4 px-4 pb-4">
            <PetSprite pet={currentPet} species={currentPet.species} size={80} />
            <div>
              <p className="text-lg font-semibold text-text-primary">{currentPet.name}</p>
              <p className="text-sm text-text-muted capitalize">
                {currentPet.species?.name ?? '—'} · {currentPet.evolution_form ?? currentPet.stage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Past evolutions */}
      {pastEvolutions.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <p className="section-label px-4 pt-4 pb-3">Past Evolutions</p>
          <div className="flex flex-col">
            {pastEvolutions.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <PetSprite pet={p} species={p.species} size={40} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{p.name}</p>
                  <p className="text-xs text-text-muted capitalize">{p.species?.name ?? '—'} · {p.evolution_form}</p>
                </div>
                {p.evolved_at && (
                  <p className="ml-auto text-2xs text-text-muted">
                    {new Date(p.evolved_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements — only earned ones shown on public profile */}
      {achievements.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <p className="section-label px-4 pt-4 pb-3">Achievements</p>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            {achievements.map(a => {
              const Icon = getAchievementIcon(a.icon)
              return (
                <div key={a.key} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-accent/5 border-accent/20">
                  <Icon size={15} className="text-accent-light shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{a.name}</p>
                    <p className="text-2xs text-text-muted truncate">{a.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pastEvolutions.length === 0 && !currentPet && (
        <p className="text-center text-text-muted text-sm py-8">No pet activity yet</p>
      )}

    </div>
  )
}
