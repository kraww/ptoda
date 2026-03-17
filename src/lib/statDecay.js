import { STAT_MIN, STAT_MAX, DEFAULT_DECAY } from './constants'

/**
 * Given the pet's current stats and the time since last update,
 * calculate what the stats should be right now and whether the
 * pet has become sick or been lost.
 *
 * Returns the updated pet object with:
 * - Decayed stat values
 * - is_sick: true if any stat just hit 0
 * - sick_since: timestamp of when sickness started
 * - is_alive: false if the recovery window has expired
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
  const energy      = clamp(pet.energy      - rates.energy      * hoursElapsed)

  const anyStatZero = hunger === 0 || happiness === 0 || cleanliness === 0 || energy === 0

  // If already sick, check if recovery window has expired
  if (pet.is_sick && pet.sick_since) {
    const recoveryWindowHours = getRecoveryWindow(decayConfig)
    const hoursSickFor = (now - new Date(pet.sick_since).getTime()) / (1000 * 60 * 60)
    if (hoursSickFor >= recoveryWindowHours) {
      return { ...pet, hunger, happiness, cleanliness, energy, is_alive: false }
    }
    return { ...pet, hunger, happiness, cleanliness, energy }
  }

  // If not yet sick but a stat just hit zero, go sick now
  if (!pet.is_sick && anyStatZero) {
    return {
      ...pet,
      hunger, happiness, cleanliness, energy,
      is_sick: true,
      sick_since: new Date().toISOString(),
    }
  }

  return { ...pet, hunger, happiness, cleanliness, energy }
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
  // recovery_window_hours lives on any decay_config row (same value on all)
  const row = decayConfig?.find(r => r.recovery_window_hours != null)
  return row?.recovery_window_hours ?? 48
}

function clamp(value) {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(value)))
}
