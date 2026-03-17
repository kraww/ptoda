import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, LogOut, Pencil, Check, X, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import Button from '../components/ui/Button'
import PetSprite from '../components/pet/PetSprite'
import Toast from '../components/ui/Toast'

function Avatar({ username, size = 56 }) {
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

export default function ProfilePage() {
  const { user, profile, loadProfile, signOut } = useAuth()
  const { pet, species } = usePet()
  const navigate = useNavigate()

  const [editingBio, setEditingBio] = useState(false)
  const [bioValue, setBioValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [pastEvolutions, setPastEvolutions] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    setBioValue(profile?.bio ?? '')
  }, [profile?.bio])

  useEffect(() => {
    if (!user) return
    supabase
      .from('pets')
      .select('id, name, stage, evolution_form, evolved_at, species:species_id(*)')
      .eq('user_id', user.id)
      .eq('stage', 'evolved')
      .eq('is_alive', false)
      .order('evolved_at', { ascending: false })
      .then(({ data }) => setPastEvolutions(data ?? []))
  }, [user])

  async function saveBio() {
    setSaving(true)
    try {
      await supabase.from('profiles').update({ bio: bioValue.trim() }).eq('id', user.id)
      await loadProfile(user.id)
      setEditingBio(false)
      setToast('Bio updated')
    } catch { setToast('Failed to save') }
    finally { setSaving(false) }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar username={profile?.username} size={56} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-text-primary truncate">{profile?.username ?? '…'}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            {memberSince && <p className="text-xs text-text-muted">Joined {memberSince}</p>}
            <Link
              to={`/user/${profile?.username}`}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-light transition-colors"
            >
              <ExternalLink size={11} /> Public profile
            </Link>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">About</p>
          {!editingBio && (
            <button onClick={() => setEditingBio(true)} className="text-text-muted hover:text-text-primary transition-colors">
              <Pencil size={13} />
            </button>
          )}
        </div>
        {editingBio ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={bioValue}
              onChange={e => setBioValue(e.target.value)}
              maxLength={200}
              rows={3}
              className="field resize-none text-sm"
              placeholder="Say something about yourself…"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-2xs text-text-muted">{bioValue.length}/200</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingBio(false); setBioValue(profile?.bio ?? '') }} className="text-text-muted hover:text-text-primary transition-colors"><X size={14} /></button>
                <button onClick={saveBio} disabled={saving} className="text-accent-light hover:text-accent transition-colors disabled:opacity-40"><Check size={14} /></button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            {profile?.bio?.trim() || <span className="text-text-muted italic">No bio yet</span>}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Coins',    value: profile?.coins ?? 0 },
          { label: 'Evolutions', value: pastEvolutions.length },
          { label: 'Email',    value: user?.email?.split('@')[0] ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface border border-border rounded-lg px-3 py-3 text-center">
            <p className="text-base font-bold text-text-primary truncate">{value}</p>
            <p className="text-2xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Current pet */}
      {pet && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <p className="section-label px-4 pt-4 pb-3">Current Pet</p>
          <div className="flex items-center gap-4 px-4 pb-4">
            <PetSprite pet={pet} species={species} size={64} />
            <div>
              <p className="font-semibold text-text-primary">{pet.name}</p>
              <p className="text-xs text-text-muted capitalize">
                {species?.name ?? '—'} · {pet.evolution_form ?? pet.stage}
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
                <PetSprite pet={p} species={p.species} size={36} />
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

      {/* Sign out */}
      <Button variant="danger" onClick={handleSignOut}>
        <LogOut size={14} /> Sign Out
      </Button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
