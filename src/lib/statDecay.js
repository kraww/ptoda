import { STAT_MIN, STAT_MAX, DEFAULT_DECAY, SLEEP_DURATION_HOURS } from './constants'

/**
 * Given the pet's current stats and the time since last update,
 * calculate what the stats should be right now and whether the
 * pet has become sick or been lost.
 *
 * Sleeping pets: energy does not decay. After SLEEP_DURATION_HOURS
 * the pet auto-wakes with full energy and a small happiness bonus.
 */
export function applyDecay(pet, decayConfig) {
  if (!pet?.last_stat_update) return pet

  const now = Date.now()
  const lastUpdate = new Date(pet.last_stat_update).getTime()
  const hoursElapsed = (now - lastUpdate) / (1000 * 60 * 60)

  if (hoursElapsed < 0.01) return pet // Less than ~36 seconds, skip

  const rates = buildRates(decayConfig)

  const hunger      = clamp(pet.hunger      - rates.hunger      * hoursElapsed)
  const happiness   = clamp(pet.happiness   - rates.happiness   * hoursElapsed)
  const cleanliness = clamp(pet.cleanliness - rates.cleanliness * hoursElapsed)

  // Handle sleep state — no energy decay while sleeping; auto-wake after full duration
  let energy = pet.energy
  let is_sleeping = pet.is_sleeping ?? false
  let sleep_started_at = pet.sleep_started_at ?? null
  let happinessBonus = 0

  if (pet.is_sleeping && pet.sleep_started_at) {
    const hoursSlept = (now - new Date(pet.sleep_started_at).getTime()) / 3600000
    if (hoursSlept >= SLEEP_DURATION_HOURS) {
      // Auto-wake: full energy + small happiness boost
      energy = STAT_MAX
      happinessBonus = 15
      is_sleeping = false
      sleep_started_at = null
    }
    // Still sleeping: energy unchanged until wake
  } else {
    energy = clamp(pet.energy - rates.energy * hoursElapsed)
  }

  const finalHappiness = clamp(happiness + happinessBonus)
  const anyStatZero = hunger === 0 || finalHappiness === 0 || cleanliness === 0 || energy === 0

  // If already sick, check if recovery window has expired
  if (pet.is_sick && pet.sick_since) {
    const recoveryWindowHours = getRecoveryWindow(decayConfig)
    const hoursSickFor = (now - new Date(pet.sick_since).getTime()) / (1000 * 60 * 60)
    if (hoursSickFor >= recoveryWindowHours) {
      return { ...pet, hunger, happiness: finalHappiness, cleanliness, energy, is_sleeping, sleep_started_at, is_alive: false }
    }
    return { ...pet, hunger, happiness: finalHappiness, cleanliness, energy, is_sleeping, sleep_started_at }
  }

  // If not yet sick but a stat just hit zero, go sick now
  if (!pet.is_sick && anyStatZero) {
    return {
      ...pet,
      hunger, happiness: finalHappiness, cleanliness, energy,
      is_sleeping, sleep_started_at,
      is_sick: true,
      sick_since: new Date().toISOString(),
    }
  }

  return { ...pet, hunger, happiness: finalHappiness, cleanliness, energy, is_sleeping, sleep_started_at }
}

function buildRates(decayConfig) {
  if (!decayConfig?.length) return DEFAULT_DECAY
  const rates = { ...DEFAULT_DECAY }
  for (const row of decayConfig) {
    if (row.stat_name in rates) {
      rates[row.stat_name] = row.points_per_hour
    }
  }
  return rates
}

function getRecoveryWindow(decayConfig) {
  const row = decayConfig?.find(r => r.recovery_window_hours != null)
  return row?.recovery_window_hours ?? 48
}

function clamp(value) {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(value)))
}
