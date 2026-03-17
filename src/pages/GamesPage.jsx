import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const GAME_ROUTES = {
  'meter-stopper': '/games/meter-stopper',
  'simon':         '/games/simon',
  'lucky-roll':    '/games/lucky-roll',
}

export default function GamesPage() {
  const { user } = useAuth()
  const [games, setGames] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: gamesData } = await supabase
        .from('games').select('*').eq('is_active', true).order('created_at')
      setGames(gamesData ?? [])

      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const { data: subs } = await supabase
        .from('game_submissions').select('game_key')
        .eq('user_id', user.id).gte('submitted_at', start.toISOString())
      const counts = {}
      for (const s of subs ?? []) counts[s.game_key] = (counts[s.game_key] ?? 0) + 1
      setSubmissions(counts)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <LoadingSpinner message="Loading games…" />

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Games</h1>
        <p className="text-sm text-text-muted mt-0.5">Earn coins by playing. Up to 3 submitted scores per game each day.</p>
      </div>
      <div className="flex flex-col gap-3">
        {games.map(game => {
          const used = submissions[game.key] ?? 0
          const limit = game.daily_submission_limit
          const route = GAME_ROUTES[game.key]
          if (!route) return null
          return (
            <Link key={game.key} to={route}
              className="bg-surface border border-border rounded-lg p-4 flex items-center gap-4 hover:border-text-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <Gamepad2 size={18} className="text-accent-light" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary">{game.name}</p>
                <p className="text-xs text-text-muted mt-0.5 truncate">{game.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex gap-1">
                  {Array.from({ length: limit }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < used ? 'bg-accent' : 'bg-border'}`} />
                  ))}
                </div>
                <span className="text-2xs text-text-muted">{used}/{limit} today</span>
              </div>
              <ChevronRight size={16} className="text-text-muted shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
