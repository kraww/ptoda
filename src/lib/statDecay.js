import { STAT_MIN, STAT_MAX, DEFAULT_DECAY } from './constants'

/**
 * Given the pet's current stats, the last time stats were updated,
 * and the decay config from the DB, calculate what the stats should
 * be right now.
 *
 * This runs on the client when the app loads — no server needed.
 * The pet "gets hungry" even when the app is closed because we track
 * time elapsed, not a running timer.
 */
export function applyDecay(pet, decayConfig) {
  if (!pet?.last_stat_update) return pet

  const now = Date.now()
  const lastUpdate = new Date(pet.last_stat_update).getTime()
  const hoursElapsed = (now - lastUpdate) / (1000 * 60 * 60)

  if (hoursElapsed < 0.01) return pet // Less than ~36 seconds, skip

  const rates = buildRates(decayConfig)

  return {
    ...pet,
    hunger:      clamp(pet.hunger      - rates.hunger      * hoursElapsed),
    happiness:   clamp(pet.happiness   - rates.happiness   * hoursElapsed),
    cleanliness: clamp(pet.cleanliness - rates.cleanliness * hoursElapsed),
    energy:      clamp(pet.energy      - rates.energy      * hoursElapsed),
  }
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

function clamp(value) {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(value)))
}
