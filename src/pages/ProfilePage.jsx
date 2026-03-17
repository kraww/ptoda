import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, LogOut, Pencil, Check, X, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import { loadAchievements, getAchievementIcon } from '../lib/achievements'
import Button from '../components/ui/Button'
import PetSprite from '../components/pet/PetSprite'
import Toast from '../components/ui/Toast'

const THEME_META = {
  dark:    { label: 'Dark',    bg: '#0e0e10', surface: '#1c1c1f', text: '#f2f3f5' },
  light:   { label: 'Light',   bg: '#f0f0f3', surface: '#ffffff', text: '#18181b' },
  neutral: { label: 'Neutral', bg: '#1a1a1d', surface: '#2a2a2e', text: '#e8e8ed' },
  forest:  { label: 'Forest',  bg: '#0d1410', surface: '#182118', text: '#e8f0e8' },
}

const THEME_VARS = {
  dark:    { bg: '14 14 16',    sidebar: '20 20 22',   surface: '28 28 31',  card: '36 36 40',  hover: '46 46 51',   border: '46 46 51',   textPrimary: '242 243 245', textSecondary: '161 161 170', textMuted: '82 82 91'   },
  light:   { bg: '240 240 243', sidebar: '232 232 236', surface: '255 255 255', card: '245 245 248', hover: '235 235 239', border: '221 221 227', textPrimary: '24 24 27',   textSecondary: '82 82 91',    textMuted: '161 161 170' },
  neutral: { bg: '26 26 29',    sidebar: '34 34 37',   surface: '42 42 46',  card: '50 50 54',  hover: '62 62 68',   border: '62 62 68',   textPrimary: '232 232 237', textSecondary: '152 152 168', textMuted: '90 90 110'  },
  forest:  { bg: '13 20 16',    sidebar: '17 26 20',   surface: '24 33 24',  card: '30 42 30',  hover: '38 52 38',   border: '42 58 42',   textPrimary: '232 240 232', textSecondary: '138 170 138', textMuted: '74 106 74'  },
}

function applyThemeVars(key) {
  const t = THEME_VARS[key] ?? THEME_VARS.dark
  const r = document.documentElement
  r.style.setProperty('--color-bg',             t.bg)
  r.style.setProperty('--color-sidebar',        t.sidebar)
  r.style.setProperty('--color-surface',        t.surface)
  r.style.setProperty('--color-card',           t.card)
  r.style.setProperty('--color-hover',          t.hover)
  r.style.setProperty('--color-border',         t.border)
  r.style.setProperty('--color-text-primary',   t.textPrimary)
  r.style.setProperty('--color-text-secondary', t.textSecondary)
  r.style.setProperty('--color-text-muted',     t.textMuted)
}

function AvatarDisplay({ profile, size = 56 }) {
  const imgUrl = profile?.avatar?.image_url
  if (imgUrl) return <img src={imgUrl} alt="avatar" className="rounded-full object-cover shrink-0 border border-border" style={{ width: size, height: size }} />
  const initial = (profile?.username ?? '?')[0].toUpperCase()
  return (
    <div className="rounded-full bg-accent/20 flex items-center justify-center shrink-0 select-none" style={{ width: size, height: size, fontSize: size * 0.4 }}>
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
  const [achievements, setAchievements] = useState([])
  const [availableAvatars, setAvailableAvatars] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => { setBioValue(profile?.bio ?? '') }, [profile?.bio])

  useEffect(() => {
    if (!user) return
    supabase
      .from('pets')
      .select('id, name, stage, evolution_form, evolved_at, species:species_id(*)')
      .eq('user_id', user.id).eq('stage', 'evolved').eq('is_alive', false)
      .order('evolved_at', { ascending: false })
      .then(({ data }) => setPastEvolutions(data ?? []))
    loadAchievements(supabase, user.id).then(setAchievements)

    // Load avatars: defaults + user unlocks
    Promise.all([
      supabase.from('avatars').select('*').eq('is_default', true),
      supabase.from('user_avatars').select('avatar:avatar_id(*)').eq('user_id', user.id),
    ]).then(([{ data: defaults }, { data: unlocked }]) => {
      const unlockedAvatars = (unlocked ?? []).map(u => u.avatar).filter(Boolean)
      const all = [...(defaults ?? []), ...unlockedAvatars]
      const unique = [...new Map(all.map(a => [a.id, a])).values()]
      setAvailableAvatars(unique)
    })
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

  async function selectTheme(theme) {
    applyThemeVars(theme)  // instant visual update
    await supabase.from('profiles').update({ active_theme: theme }).eq('id', user.id)
    loadProfile(user.id)
  }

  async function selectAvatar(avatarId) {
    await supabase.from('profiles').update({ active_avatar: avatarId }).eq('id', user.id)
    await loadProfile(user.id)
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
        <AvatarDisplay profile={profile} size={56} />
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

      {/* Avatar picker */}
      {availableAvatars.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="section-label mb-3">Avatar</p>
          <div className="flex flex-wrap gap-2">
            {availableAvatars.map(av => (
              <button key={av.id} onClick={() => selectAvatar(av.id)}
                className={`rounded-full overflow-hidden border-2 transition-colors ${profile?.active_avatar === av.id ? 'border-accent' : 'border-transparent hover:border-border'}`}
              >
                <img src={av.image_url} alt={av.name} className="w-12 h-12 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Theme picker */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <p className="section-label mb-3">Theme</p>
        <div className="flex flex-wrap gap-2">
          {(profile?.unlocked_themes ?? ['dark', 'light', 'neutral']).map(key => {
            const meta = THEME_META[key]
            if (!meta) return null
            const isActive = (profile?.active_theme ?? 'dark') === key
            return (
              <button key={key} onClick={() => selectTheme(key)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${isActive ? 'border-accent' : 'border-border hover:border-text-muted'}`}
              >
                <div className="flex gap-0.5">
                  <div className="w-4 h-4 rounded-sm" style={{ background: meta.bg }} />
                  <div className="w-4 h-4 rounded-sm" style={{ background: meta.surface }} />
                  <div className="w-4 h-4 rounded-sm" style={{ background: meta.text }} />
                </div>
                <span className="text-2xs text-text-muted">{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <p className="section-label px-4 pt-4 pb-3">
            Achievements <span className="text-text-muted font-normal normal-case">({achievements.filter(a => a.earned).length}/{achievements.length})</span>
          </p>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            {achievements.map(a => {
              const Icon = getAchievementIcon(a.icon)
              return (
                <div
                  key={a.key}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${a.earned ? 'bg-accent/5 border-accent/20' : 'bg-card border-border opacity-40'}`}
                >
                  <Icon size={15} className={a.earned ? 'text-accent-light shrink-0' : 'text-text-muted shrink-0'} />
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

      {/* Sign out */}
      <Button variant="danger" onClick={handleSignOut}>
        <LogOut size={14} /> Sign Out
      </Button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
