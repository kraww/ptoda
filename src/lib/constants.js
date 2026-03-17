// Stat boundaries
export const STAT_MAX = 100
export const STAT_MIN = 0
export const STAT_CRITICAL = 20  // Below this, show warning
export const STAT_SICK = 0       // At this level, pet becomes sick

// Default recovery window before a sick pet is lost
export const DEFAULT_RECOVERY_WINDOW_HOURS = 48

// Pet stages
export const STAGE_EGG = 'egg'
export const STAGE_BABY = 'baby'
export const STAGE_EVOLVED = 'evolved'

// Evolution forms (must match what's in the DB species table)
export const EVOLUTION_FORMS = ['gourmet', 'wildling', 'pristine', 'dreamer']

// Which care action contributes to which evolution path
export const ACTION_EVOLUTION_MAP = {
  feed:  'gourmet',
  play:  'wildling',
  clean: 'pristine',
  sleep: 'dreamer',
}

// How many total care actions before the egg hatches
export const HATCH_ACTION_THRESHOLD = 10

// How many total care actions (post-hatch) before evolution unlocks
export const EVOLVE_ACTION_THRESHOLD = 30

// Default stat decay rates (points per hour) — overridden by DB decay_config
export const DEFAULT_DECAY = {
  hunger:      5,
  happiness:   3,
  cleanliness: 2,
  energy:      4,
}

// Coins earned per care action
export const COINS_PER_ACTION = 2

// Sleep mechanic
export const SLEEP_DURATION_HOURS = 8   // Full rest takes 8 hours
