export async function getTodaySubmissions(supabase, userId, gameKey) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('game_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('game_key', gameKey)
    .gte('submitted_at', start.toISOString())
  return count ?? 0
}

export async function submitScore(supabase, userId, gameKey, score, coinsEarned) {
  const { error } = await supabase.rpc('submit_game_score', {
    p_game_key: gameKey,
    p_score: score,
    p_coins_earned: coinsEarned,
  })
  if (error) throw error
}
