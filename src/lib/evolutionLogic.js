import { ACTION_EVOLUTION_MAP, EVOLUTION_FORMS } from './constants'

/**
 * Looks at the pet's action_counts object and returns which evolution
 * form the pet should become.
 *
 * action_counts looks like: { feed: 14, play: 3, clean: 7, sleep: 9 }
 * Whichever action was done most → determines the evolution form.
 * Ties are broken by the order in ACTION_EVOLUTION_MAP.
 */
export function determineEvolution(actionCounts) {
  if (!actionCounts) return EVOLUTION_FORMS[0]

  let topAction = null
  let topCount = -1

  for (const [action, form] of Object.entries(ACTION_EVOLUTION_MAP)) {
    const count = actionCounts[action] ?? 0
    if (count > topCount) {
      topCount = count
      topAction = action
    }
  }

  return ACTION_EVOLUTION_MAP[topAction] ?? EVOLUTION_FORMS[0]
}
