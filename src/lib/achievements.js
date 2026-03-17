import { Egg, Sparkles, Utensils, Gamepad2, Moon, Heart, Package, ShoppingBag, Trophy } from 'lucide-react'

const ICON_MAP = { Egg, Sparkles, Utensils, Gamepad2, Moon, Heart, Package, ShoppingBag, Trophy }

export function getAchievementIcon(name) {
  return ICON_MAP[name] ?? Trophy
}

/**
 * Award an achievement and automatically grant any attached rewards.
 * Silently no-ops if the user already has this achievement.
 */
export async function award(supabase, userId, key) {
  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_key: key })

  if (error) return // already earned (unique constraint) or insert failed

  // Fetch reward details
  const { data: ach } = await supabase
    .from('achievements')
    .select('name, reward_type, reward_value, reward_coins, reward_item_id')
    .eq('key', key)
    .maybeSingle()

  if (!ach) return

  // Grant coins
  if (ach.reward_coins > 0) {
    const { data: p } = await supabase.from('profiles').select('coins').eq('id', userId).single()
    await supabase.from('profiles').update({ coins: (p?.coins ?? 0) + ach.reward_coins }).eq('id', userId)
  }

  // Grant item
  if (ach.reward_item_id) {
    const { data: inv } = await supabase
      .from('inventory').select('id, quantity')
      .eq('user_id', userId).eq('item_id', ach.reward_item_id).maybeSingle()
    if (inv) {
      await supabase.from('inventory').update({ quantity: inv.quantity + 1 }).eq('id', inv.id)
    } else {
      await supabase.from('inventory').insert({ user_id: userId, item_id: ach.reward_item_id, quantity: 1 })
    }
  }

  // Grant avatar unlock
  if (ach.reward_type === 'avatar' && ach.reward_value) {
    await supabase.from('user_avatars').insert({ user_id: userId, avatar_id: ach.reward_value })
  }

  // Grant theme unlock
  if (ach.reward_type === 'theme' && ach.reward_value) {
    const { data: p } = await supabase.from('profiles').select('unlocked_themes').eq('id', userId).single()
    const current = p?.unlocked_themes ?? ['dark', 'light', 'neutral']
    if (!current.includes(ach.reward_value)) {
      await supabase.from('profiles').update({
        unlocked_themes: [...current, ach.reward_value],
      }).eq('id', userId)
    }
  }
}

// Load all achievements + which ones a user has earned
export async function loadAchievements(supabase, userId) {
  const [{ data: all }, { data: earned }] = await Promise.all([
    supabase.from('achievements').select('*').order('key'),
    supabase.from('user_achievements').select('achievement_key, earned_at').eq('user_id', userId),
  ])
  const earnedKeys  = new Set((earned ?? []).map(e => e.achievement_key))
  const earnedDates = Object.fromEntries((earned ?? []).map(e => [e.achievement_key, e.earned_at]))
  return (all ?? []).map(a => ({
    ...a,
    earned:    earnedKeys.has(a.key),
    earned_at: earnedDates[a.key] ?? null,
  }))
}
