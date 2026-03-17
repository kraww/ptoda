import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getTodaySubmissions, submitScore } from '../../lib/games'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default function LuckyRollGame() {
  const { user, loadProfile } = useAuth()
  const [gameRow, setGameRow] = useState(null)
  const [gameState, setGameState] = useState('idle') // idle | rolling | result
  const [face, setFace] = useState(0)
  const [won, setWon] = useState(false)
  const [todaySubs, setTodaySubs] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('games').select('*').eq('key', 'lucky-roll').single(),
      getTodaySubmissions(supabase, user.id, 'lucky-roll'),
    ]).then(([{ data }, subs]) => {
      setGameRow(data)
      setTodaySubs(subs)
    })
  }, [user])

  function roll() {
    if (gameState === 'rolling') return
    setGameState('rolling')
    setSubmitted(false)

    const winChance = gameRow?.config?.win_chance ?? 0.45
    const didWin = Math.random() < winChance
    const finalFace = didWin
      ? Math.floor(Math.random() * 3) + 3  // 3,4,5 (faces 4,5,6 = win)
      : Math.floor(Math.random() * 3)       // 0,1,2 (faces 1,2,3 = lose)

    let ticks = 0
    const totalTicks = 20
    intervalRef.current = setInterval(() => {
      setFace(Math.floor(Math.random() * 6))
      ticks++
      if (ticks >= totalTicks) {
        clearInterval(intervalRef.current)
        setFace(finalFace)
        setWon(didWin)
        setGameState('result')
      }
    }, 60)
  }

  async function handleSubmit() {
    const coins = won ? (gameRow?.config?.coins_win ?? 12) : 0
    setSubmitting(true)
    try {
      await submitScore(supabase, user.id, 'lucky-roll', won ? 1 : 0, coins)
      await loadProfile(user.id)
      setTodaySubs(s => s + 1)
      setSubmitted(true)
    } catch {}
    setSubmitting(false)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  if (!gameRow) return <LoadingSpinner message="Loading game…" />

  const limit = gameRow.daily_submission_limit
  const coinsWin = gameRow?.config?.coins_win ?? 12
  const canSubmit = todaySubs < limit && !submitted && gameState === 'result'

  return (
    <div className="flex flex-col gap-5">
      <Link to="/games" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit">
        <ArrowLeft size={14} /> Games
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Lucky Roll</h1>
          <p className="text-sm text-text-muted mt-0.5">Roll the die. High numbers win.</p>
        </div>
        <span className="text-xs text-text-muted mt-1">{todaySubs}/{limit} submitted today</span>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 flex flex-col items-center gap-6">
        {/* Die display */}
        <div
          className="w-32 h-32 rounded-2xl bg-card border-2 flex items-center justify-center select-none transition-all duration-100"
          style={{
            borderColor: gameState === 'result'
              ? (won ? 'rgb(34 197 94)' : 'rgb(229 72 77)')
              : 'rgb(var(--color-border))',
            fontSize: '5rem',
            lineHeight: 1,
          }}
        >
          {DIE_FACES[face]}
        </div>

        {gameState === 'result' && (
          <div className="text-center">
            <p className={`text-2xl font-bold ${won ? 'text-success' : 'text-danger'}`}>
              {won ? 'Winner!' : 'No luck this time'}
            </p>
            {won && <p className="text-accent-light font-semibold mt-1">+{coinsWin} coins</p>}
            {submitted && <p className="text-xs text-success mt-1">Score submitted!</p>}
          </div>
        )}

        <div className="flex gap-2 w-full">
          {canSubmit && won && (
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? 'Submitting…' : `Claim ${coinsWin} coins`}
            </Button>
          )}
          <Button
            variant={canSubmit && won ? 'secondary' : 'primary'}
            onClick={roll}
            disabled={gameState === 'rolling'}
            className="flex-1"
          >
            {gameState === 'rolling' ? 'Rolling…' : gameState === 'idle' ? 'Roll' : 'Roll Again'}
          </Button>
        </div>

        {gameState === 'result' && !won && !canSubmit && (
          <p className="text-xs text-text-muted text-center -mt-2">Only wins can be submitted</p>
        )}
      </div>
    </div>
  )
}
