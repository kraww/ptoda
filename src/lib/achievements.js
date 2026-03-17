import { Egg, Sparkles, Utensils, Gamepad2, Moon, Heart, Package, ShoppingBag, Trophy } from 'lucide-react'

// Map icon name strings (stored in DB) to Lucide components
const ICON_MAP = { Egg, Sparkles, Utensils, Gamepad2, Moon, Heart, Package, ShoppingBag, Trophy }

export function getAchievementIcon(name) {
  return ICON_MAP[name] ?? Trophy
}

// Award an achievement — silently ignores if already earned (unique constraint)
export async function award(supabase, userId, key) {
  await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_key: key })
}

// Load all achievement definitions + which ones a user has earned
export async function loadAchievements(supabase, userId) {
  const [{ data: all }, { data: earned }] = await Promise.all([
    supabase.from('achievements').select('*').order('key'),
    supabase.from('user_achievements').select('achievement_key, earned_at').eq('user_id', userId),
  ])
  const earnedKeys = new Set((earned ?? []).map(e => e.achievement_key))
  const earnedDates = Object.fromEntries((earned ?? []).map(e => [e.achievement_key, e.earned_at]))
  return (all ?? []).map(a => ({
    ...a,
    earned: earnedKeys.has(a.key),
    earned_at: earnedDates[a.key] ?? null,
  }))
}
