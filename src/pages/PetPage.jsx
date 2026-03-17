import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Utensils, Gamepad2, Sparkles, Moon, Pill, AlertTriangle, Egg, Backpack, ChevronUp, Sun, Bird } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePet } from '../context/PetContext'
import { determineEvolution } from '../lib/evolutionLogic'
import { award } from '../lib/achievements'
import {
  STAGE_EGG, STAGE_BABY, STAGE_EVOLVED,
  HATCH_ACTION_THRESHOLD, EVOLVE_ACTION_THRESHOLD,
  COINS_PER_ACTION, STAT_MAX, STAT_MIN, DEFAULT_RECOVERY_WINDOW_HOURS,
  SLEEP_DURATION_HOURS, ACTION_COOLDOWN_HOURS,
} from '../lib/constants'
import PetSprite from '../components/pet/PetSprite'
import StatPanel from '../components/pet/StatPanel'
import Button from '../components/ui/Button'
import Toast from '../components/ui/Toast'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import InventoryDrawer from '../components/pet/InventoryDrawer'

// Sleep button uses Moon icon but is rendered separately below the grid
const CARE_ACTIONS = [
  { id: 'feed',  label: 'Feed',  Icon: Utensils, stat: 'hunger',      sideEffect: { cleanliness: -10 }, accent: 'text-orange-400 border-orange-400/20 hover:bg-orange-400/5' },
  { id: 'play',  label: 'Play',  Icon: Gamepad2, stat: 'happiness',   sideEffect: { energy: -15 },      accent: 'text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/5' },
  { id: 'clean', label: 'Clean', Icon: Sparkles, stat: 'cleanliness', sideEffect: null,                 accent: 'text-sky-400    border-sky-400/20    hover:bg-sky-400/5'    },
]

function getSickTimeLeft(sickSince, decayConfig) {
  if (!sickSince) return null
  const windowHours = decayConfig?.find(r => r.recovery_window_hours != null)?.recovery_window_hours
    ?? DEFAULT_RECOVERY_WINDOW_HOURS
  const msLeft = (new Date(sickSince).getTime() + windowHours * 3600000) - Date.now()
  if (msLeft <= 0) return 'Overdue'
  const h = Math.floor(msLeft / 3600000)
  const m = Math.floor((msLeft % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`
}

function getCooldownMs(actionId, actionLastUsed, cooldownHours = ACTION_COOLDOWN_HOURS) {
  const lastUsed = actionLastUsed?.[actionId]
  if (!lastUsed) return 0
  return Math.max(0, new Date(lastUsed).getTime() + cooldownHours * 3600000 - Date.now())
}

function formatCooldown(ms) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return m > 0 ? `${m}m` : '<1m'
}

function getSleepProgress(sleepStartedAt) {
  if (!sleepStartedAt) return { hoursSlept: 0, label: '' }
  const hoursSlept = (Date.now() - new Date(sleepStartedAt).getTime()) / 3600000
  if (hoursSlept >= SLEEP_DURATION_HOURS) return { hoursSlept, label: 'Fully rested — wake up!' }
  const remaining = SLEEP_DURATION_HOURS - hoursSlept
  const h = Math.floor(remaining)
  const m = Math.floor((remaining % 1) * 60)
  const label = h > 0 ? `${h}h ${m}m until fully rested` : `${m}m until fully rested`
  return { hoursSlept, label }
}

export default function PetPage() {
  const { user, profile, loadProfile } = useAuth()
  const { pet, setPet, species, decayConfig, loading, error, reload } = usePet()
  const [toast, setToast] = useState(null)
  const [acting, setActing] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmRelease, setConfirmRelease] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)

  if (loading) return <LoadingSpinner message="Loading your pet…" />

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <p className="text-danger text-sm">{error}</p>
      <Button onClick={reload}>Try again</Button>
    </div>
  )

  if (!pet) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
      <div className="w-20 h-20 rounded-xl bg-surface border border-border flex items-center justify-center">
        <Egg size={36} className="text-text-muted" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-text-primary">No pet yet</h2>
        <p className="text-text-muted text-sm mt-1">Adopt an egg to get started</p>
      </div>
      <Link to="/adopt"><Button>Adopt an Egg</Button></Link>
    </div>
  )

  const totalActions = Object.values(pet.action_counts ?? {}).reduce((a, b) => a + b, 0)
  const canHatch  = pet.stage === STAGE_EGG  && totalActions >= HATCH_ACTION_THRESHOLD
  const canEvolve = pet.stage === STAGE_BABY && totalActions >= EVOLVE_ACTION_THRESHOLD
  const timeLeft  = pet.is_sick ? getSickTimeLeft(pet.sick_since, decayConfig) : null
  const sleepProgress = pet.is_sleeping ? getSleepProgress(pet.sleep_started_at) : null
  const releaseMinDays = decayConfig?.find(r => r.release_min_days != null)?.release_min_days ?? 5
  const canRelease = pet.stage === STAGE_EVOLVED && !pet.is_released && pet.evolved_at
    && (Date.now() - new Date(pet.evolved_at).getTime()) >= releaseMinDays * 86400000

  const abandonCooldownMs = profile?.last_abandoned_at
    ? Math.max(0, new Date(profile.last_abandoned_at).getTime() + 86400000 - Date.now())
    : 0
  const abandonCooldownLabel = abandonCooldownMs > 0 ? (() => {
    const h = Math.floor(abandonCooldownMs / 3600000)
    const m = Math.floor((abandonCooldownMs % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  })() : null

  async function doCareAction(action) {
    if (acting || pet.is_sick || pet.is_sleeping) return
    if ((pet[action.stat] ?? 0) >= STAT_MAX) return
    if (getCooldownMs(action.id, pet.action_last_used) > 0) return
    setActing(true)
    try {
      const stat    = action.stat
      const newVal  = Math.min(STAT_MAX, (pet[stat] ?? 0) + 20)
      const newCounts   = { ...pet.action_counts,   [action.id]: (pet.action_counts?.[action.id]   ?? 0) + 1 }
      const newLastUsed = { ...pet.action_last_used, [action.id]: new Date().toISOString() }

      const updates      = { [stat]: newVal, action_counts: newCounts, action_last_used: newLastUsed, last_stat_update: new Date().toISOString() }
      const localUpdates = { [stat]: newVal, action_counts: newCounts, action_last_used: newLastUsed }

      // Apply side effects (e.g. feed dirties, play tires)
      if (action.sideEffect) {
        for (const [seStat, delta] of Object.entries(action.sideEffect)) {
          const newSEVal = Math.max(STAT_MIN, Math.min(STAT_MAX, (pet[seStat] ?? 0) + delta))
          updates[seStat] = newSEVal
          localUpdates[seStat] = newSEVal
        }
      }

      await supabase.from('pets').update(updates).eq('id', pet.id)
      await supabase.from('profiles').update({ coins: (profile?.coins ?? 0) + COINS_PER_ACTION }).eq('id', user.id)
      await loadProfile(user.id)
      await supabase.from('care_log').insert({ pet_id: pet.id, action: action.id, coins_earned: COINS_PER_ACTION })

      setPet(p => ({ ...p, ...localUpdates }))
      setToast(`${action.label} +${COINS_PER_ACTION} coins`)

      // Achievement checks
      const newTotal = Object.values(newCounts).reduce((a, b) => a + b, 0)
      if (newTotal >= 100) award(supabase, user.id, 'dedicated')
    } catch { setToast('Something went wrong') }
    finally { setActing(false) }
  }

  async function doSleep() {
    if (acting || pet.is_sick) return
    if (getCooldownMs('sleep', pet.action_last_used, SLEEP_DURATION_HOURS) > 0) return
    setActing(true)
    try {
      const now = new Date().toISOString()
      const newLastUsed  = { ...pet.action_last_used, sleep: now }
      const newSleepCount = (pet.action_counts?.sleep ?? 0) + 1
      const newCounts    = { ...pet.action_counts, sleep: newSleepCount }
      await supabase.from('pets').update({
        is_sleeping: true, sleep_started_at: now,
        action_counts: newCounts, action_last_used: newLastUsed, last_stat_update: now,
      }).eq('id', pet.id)
      await supabase.from('care_log').insert({ pet_id: pet.id, action: 'sleep', coins_earned: 0 })
      setPet(p => ({ ...p, is_sleeping: true, sleep_started_at: now, action_last_used: newLastUsed, action_counts: newCounts }))
      setToast(`${pet.name} is sleeping`)

      if (newSleepCount >= 10) award(supabase, user.id, 'well_rested')
    } catch { setToast('Something went wrong') }
    finally { setActing(false) }
  }

  async function doWakeUp() {
    if (acting) return
    setActing(true)
    try {
      const hoursSlept = Math.min(SLEEP_DURATION_HOURS, (Date.now() - new Date(pet.sleep_started_at).getTime()) / 3600000)
      const energyGained = Math.round((hoursSlept / SLEEP_DURATION_HOURS) * STAT_MAX)
      const happinessGained = Math.round((hoursSlept / SLEEP_DURATION_HOURS) * 15)
      const newEnergy    = Math.min(STAT_MAX, (pet.energy    ?? 0) + energyGained)
      const newHappiness = Math.min(STAT_MAX, (pet.happiness ?? 0) + happinessGained)
      const now = new Date().toISOString()

      await supabase.from('pets').update({
        is_sleeping: false, sleep_started_at: null,
        energy: newEnergy, happiness: newHappiness,
        last_stat_update: now,
      }).eq('id', pet.id)

      setPet(p => ({ ...p, is_sleeping: false, sleep_started_at: null, energy: newEnergy, happiness: newHappiness }))
      const h = hoursSlept < 1 ? `${Math.round(hoursSlept * 60)}m` : `${hoursSlept.toFixed(1)}h`
      setToast(`${pet.name} woke up after ${h}`)
    } catch { setToast('Something went wrong') }
    finally { setActing(false) }
  }

  async function useMedicine() {
    if (acting) return
    setActing(true)
    try {
      const { data: inv } = await supabase
        .from('inventory')
        .select('id, quantity, items!inner(id, category)')
        .eq('user_id', user.id)
        .eq('items.category', 'medicine')
        .gt('quantity', 0)
        .limit(1)
        .maybeSingle()

      if (!inv) { setToast('No medicine in your bag'); setActing(false); return }

      await supabase.from('pets').update({
        is_sick: false, sick_since: null,
        hunger: 40, happiness: 40, cleanliness: 40, energy: 40,
        last_stat_update: new Date().toISOString(),
      }).eq('id', pet.id)

      await supabase.from('inventory').update({ quantity: inv.quantity - 1 }).eq('id', inv.id)
      await supabase.from('care_log').insert({ pet_id: pet.id, action: 'medicine', item_id: inv.items.id, coins_earned: 0 })

      await reload()
      setToast(`${pet.name} is recovering`)
    } catch { setToast('Something went wrong') }
    finally { setActing(false) }
  }

  async function hatch() {
    if (acting) return
    setActing(true)
    try {
      await supabase.from('pets').update({ stage: STAGE_BABY, last_stat_update: new Date().toISOString() }).eq('id', pet.id)
      await reload()
      setToast('Your egg hatched!')
      award(supabase, user.id, 'first_hatch')
    } catch { setToast('Something went wrong') }
    finally { setActing(false) }
  }

  async function doAbandon() {
    setActing(true)
    setConfirmAbandon(false)
    try {
      const now = new Date().toISOString()
      await supabase.from('pets').update({ is_alive: false, is_released: false }).eq('id', pet.id)
      await supabase.from('profiles').update({ last_abandoned_at: now }).eq('id', user.id)
      await loadProfile(user.id)
      await reload()
      setToast(`${pet.name} was abandoned`)
    } catch { setToast('Something went wrong') }
    finally { setActing(false) }
  }

  async function doRelease() {
    setActing(true)
    setConfirmRelease(false)
    try {
      await supabase.from('pets').update({
        is_released: true, released_at: new Date().toISOString(), is_alive: false,
      }).eq('id', pet.id)
      await reload()
      setToast(`${pet.name} has been released`)
    } catch { setToast('Something went wrong') }
    finally { setActing(false) }
  }

  async function evolve() {
    if (acting) return
    setActing(true)
    try {
      const form = determineEvolution(pet.action_counts)
      await supabase.from('pets').update({
        stage: STAGE_EVOLVED, evolution_form: form,
        evolved_at: new Date().toISOString(), last_stat_update: new Date().toISOString(),
      }).eq('id', pet.id)
      await reload()
      setToast(`${pet.name} evolved into ${form} form`)
      award(supabase, user.id, 'first_evolution')
      award(supabase, user.id, `form_${form}`)
    } catch { setToast('Something went wrong') }
    finally { setActing(false) }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{pet.name}</h1>
          <p className="text-text-muted text-sm capitalize">{species?.name ?? '—'} · {pet.stage}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-text-primary">{profile?.coins ?? 0}</p>
          <p className="text-2xs text-text-muted">coins</p>
        </div>
      </div>

      {/* Sick warning */}
      {pet.is_sick && (
        <div className="bg-danger/5 border border-danger/30 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-danger">{pet.name} is sick</p>
              <p className="text-xs text-text-muted mt-0.5">
                Use medicine to nurse them back to health.{' '}
                {timeLeft && <span className="text-warn font-medium">{timeLeft}.</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={useMedicine} disabled={acting} variant="danger" size="sm">
              <Pill size={13} /> Use Medicine
            </Button>
            <Link to="/shop" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Buy medicine
            </Link>
          </div>
        </div>
      )}

      {/* Sleeping banner */}
      {pet.is_sleeping && (
        <div className="bg-surface border border-green-400/20 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-400">{pet.name} is sleeping</p>
            <p className="text-xs text-text-muted mt-0.5">{sleepProgress?.label}</p>
          </div>
          <Button onClick={doWakeUp} disabled={acting} size="sm">
            <Sun size={13} /> Wake Up
          </Button>
        </div>
      )}

      {/* Pet display */}
      <div className={`relative flex justify-center items-center py-10 bg-surface border border-border rounded-lg overflow-hidden ${pet.is_sick ? 'opacity-50 grayscale' : ''}`}>
        <PetSprite pet={pet} species={species} size={180} />

        {/* Stage badge */}
        <div className="absolute top-3 right-3">
          <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted bg-card border border-border px-2 py-1 rounded">
            {pet.stage === STAGE_EVOLVED && pet.evolution_form ? pet.evolution_form : pet.stage}
          </span>
        </div>

        {/* Release button */}
        {canRelease && !confirmRelease && (
          <button
            onClick={() => setConfirmRelease(true)}
            className="absolute top-3 left-3 flex items-center gap-1 text-2xs text-text-muted hover:text-accent-light bg-card border border-border px-2 py-1 rounded transition-colors"
          >
            <Bird size={11} /> Release
          </button>
        )}
        {canRelease && confirmRelease && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-card border border-border px-2 py-1 rounded">
            <span className="text-2xs text-text-muted">Sure?</span>
            <button onClick={doRelease} disabled={acting} className="text-2xs text-accent-light hover:text-accent font-medium transition-colors">Yes</button>
            <button onClick={() => setConfirmRelease(false)} className="text-2xs text-text-muted hover:text-text-primary transition-colors">No</button>
          </div>
        )}
      </div>

      {/* Stage prompts */}
      {!pet.is_sick && canHatch && (
        <div className="bg-surface border border-accent/30 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-text-secondary">Your egg is ready to hatch</p>
          <Button onClick={hatch} disabled={acting} size="sm">Hatch</Button>
        </div>
      )}
      {!pet.is_sick && canEvolve && (
        <div className="bg-surface border border-yellow-400/30 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-text-secondary">Ready to evolve</p>
          <Button onClick={evolve} disabled={acting} size="sm">Evolve</Button>
        </div>
      )}
      {!pet.is_sick && pet.stage === STAGE_EGG && !canHatch && (
        <p className="text-center text-text-muted text-xs">
          {HATCH_ACTION_THRESHOLD - totalActions} more care action{HATCH_ACTION_THRESHOLD - totalActions === 1 ? '' : 's'} until hatch
        </p>
      )}

      {/* Stats */}
      <StatPanel pet={pet} />

      {/* Care actions — hidden while sleeping (all locked anyway) */}
      {!pet.is_sleeping && <div>
        <p className="section-label mb-3">Care</p>
        <div className="grid grid-cols-2 gap-2">
          {CARE_ACTIONS.map(({ id, label, Icon, stat, accent, sideEffect }) => {
            const isCapped     = (pet[stat] ?? 0) >= STAT_MAX
            const cooldownMs   = getCooldownMs(id, pet.action_last_used)
            const onCooldown   = cooldownMs > 0
            const isDisabled   = acting || pet.is_sick || pet.is_sleeping || isCapped || onCooldown
            const hint = onCooldown           ? formatCooldown(cooldownMs)
                       : isCapped             ? 'full'
                       : null
            return (
              <button
                key={id}
                onClick={() => doCareAction({ id, label, stat, sideEffect })}
                disabled={isDisabled}
                className={`flex items-center gap-3 px-4 py-3.5 bg-surface border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accent}`}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="text-sm font-medium text-text-primary">{label}</span>
                {hint && !pet.is_sick && !pet.is_sleeping && (
                  <span className="ml-auto text-2xs text-text-muted">{hint}</span>
                )}
              </button>
            )
          })}

          {/* Sleep — 4th slot in the grid */}
          {(() => {
            const sleepCooldownMs = getCooldownMs('sleep', pet.action_last_used, SLEEP_DURATION_HOURS)
            const onCooldown = sleepCooldownMs > 0
            const hint = pet.is_sleeping ? null : onCooldown ? formatCooldown(sleepCooldownMs) : null
            return (
              <button
                onClick={doSleep}
                disabled={acting || pet.is_sick || pet.is_sleeping || onCooldown}
                className="flex items-center gap-3 px-4 py-3.5 bg-surface border text-green-400 border-green-400/20 hover:bg-green-400/5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Moon size={16} strokeWidth={2} />
                <span className="text-sm font-medium text-text-primary">Sleep</span>
                {hint && <span className="ml-auto text-2xs text-text-muted">{hint}</span>}
              </button>
            )
          })()}
        </div>
      </div>}

      {/* Abandon */}
      <div className="flex justify-center pt-2 pb-8">
        {!confirmAbandon ? (
          <button
            onClick={() => setConfirmAbandon(true)}
            disabled={!!abandonCooldownLabel}
            className="text-xs text-text-muted hover:text-danger transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {abandonCooldownLabel ? `Abandon on cooldown (${abandonCooldownLabel})` : 'Abandon pet'}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-danger font-medium">This counts as a failed pet and can't be undone.</p>
            <div className="flex gap-3">
              <button onClick={doAbandon} disabled={acting}
                className="text-xs text-danger hover:underline font-semibold disabled:opacity-40">
                Yes, abandon
              </button>
              <button onClick={() => setConfirmAbandon(false)} className="text-xs text-text-muted hover:text-text-primary">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bag pull-up tab — aligned with content column */}
      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 md:left-56 z-40 flex justify-center pointer-events-none">
        <div className="w-full max-w-2xl flex justify-center">
          <button
            onClick={() => setDrawerOpen(true)}
            className="pointer-events-auto flex items-center gap-2 bg-card border border-border border-b-0 rounded-t-xl px-6 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-hover transition-colors shadow-lg"
          >
            <Backpack size={15} strokeWidth={2} />
            Bag
            <ChevronUp size={13} className="text-text-muted" />
          </button>
        </div>
      </div>

      <InventoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
