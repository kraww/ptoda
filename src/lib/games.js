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
  const { error } = await supabase.from('game_submissions').insert({
    user_id: userId,
    game_key: gameKey,
    score,
    coins_earned: coinsEarned,
  })
  if (error) throw error
  if (coinsEarned > 0) {
    const { data: prof } = await supabase.from('profiles').select('coins').eq('id', userId).single()
    await supabase.from('profiles').update({ coins: (prof?.coins ?? 0) + coinsEarned }).eq('id', userId)
  }
}
