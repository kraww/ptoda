import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getTodaySubmissions, submitScore } from '../../lib/games'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function MeterStopperGame() {
  const { user, loadProfile } = useAuth()
  const [gameRow, setGameRow] = useState(null)
  const [gameState, setGameState] = useState('idle') // idle | playing | result
  const [position, setPosition] = useState(0.1)
  const [score, setScore] = useState(null)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [todaySubs, setTodaySubs] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const posRef = useRef(0.1)
  const dirRef = useRef(1)
  const animRef = useRef(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('games').select('*').eq('key', 'meter-stopper').single(),
      getTodaySubmissions(supabase, user.id, 'meter-stopper'),
    ]).then(([{ data }, subs]) => {
      setGameRow(data)
      setTodaySubs(subs)
    })
  }, [user])

  useEffect(() => {
    if (gameState !== 'playing') return
    const speed = gameRow?.config?.speed ?? 1.5
    let lastTime = null
    function tick(time) {
      if (lastTime !== null) {
        const dt = (time - lastTime) / 1000
        posRef.current += dirRef.current * speed * dt
        if (posRef.current >= 1) { posRef.current = 1; dirRef.current = -1 }
        if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1 }
        setPosition(posRef.current)
      }
      lastTime = time
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [gameState, gameRow])

  function startGame() {
    posRef.current = 0.1
    dirRef.current = 1
    setPosition(0.1)
    setScore(null)
    setSubmitted(false)
    setCoinsEarned(0)
    setGameState('playing')
  }

  function stopNeedle() {
    if (gameState !== 'playing') return
    cancelAnimationFrame(animRef.current)
    const pos = posRef.current
    const zoneWidth = gameRow?.config?.zone_width ?? 0.18
    const distFromCenter = Math.abs(pos - 0.5)
    const rawScore = Math.max(0, Math.round(100 - (distFromCenter / 0.5) * 100))
    const coinsMin = gameRow?.config?.coins_min ?? 5
    const coinsMax = gameRow?.config?.coins_max ?? 20
    const coins = Math.round(coinsMin + (coinsMax - coinsMin) * (rawScore / 100))
    setScore(rawScore)
    setCoinsEarned(coins)
    setGameState('result')
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitScore(supabase, user.id, 'meter-stopper', score, coinsEarned)
      await loadProfile(user.id)
      setTodaySubs(s => s + 1)
      setSubmitted(true)
    } catch {}
    setSubmitting(false)
  }

  if (!gameRow) return <LoadingSpinner message="Loading game…" />

  const limit = gameRow.daily_submission_limit
  const zoneWidth = gameRow.config?.zone_width ?? 0.18
  const canSubmit = todaySubs < limit && !submitted

  return (
    <div className="flex flex-col gap-5">
      <Link to="/games" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit">
        <ArrowLeft size={14} /> Games
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Meter Stopper</h1>
          <p className="text-sm text-text-muted mt-0.5">Stop the needle in the green zone.</p>
        </div>
        <span className="text-xs text-text-muted mt-1">{todaySubs}/{limit} submitted today</span>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-5">
        {/* Meter bar */}
        <div
          className="relative h-16 bg-card rounded-lg overflow-hidden select-none"
          onClick={stopNeedle}
          style={{ cursor: gameState === 'playing' ? 'pointer' : 'default' }}
        >
          {/* Green zone */}
          <div className="absolute top-0 h-full" style={{
            left: `${(0.5 - zoneWidth / 2) * 100}%`,
            width: `${zoneWidth * 100}%`,
            background: 'rgb(34 197 94 / 0.15)',
            borderLeft: '2px solid rgb(34 197 94 / 0.5)',
            borderRight: '2px solid rgb(34 197 94 / 0.5)',
          }} />
          {/* Center tick */}
          <div className="absolute top-2 bottom-2 w-px bg-success/20" style={{ left: '50%' }} />
          {/* Needle */}
          <div className="absolute top-0 h-full w-0.5" style={{
            left: `${position * 100}%`,
            transform: 'translateX(-50%)',
            background: gameState === 'result'
              ? (score >= 60 ? 'rgb(34 197 94)' : 'rgb(229 72 77)')
              : 'rgb(167 139 250)',
            transition: gameState === 'result' ? 'background 0.2s' : 'none',
          }} />
          {/* Label */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-text-muted">Press Start</span>
            </div>
          )}
          {gameState === 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-text-muted font-medium">Click to stop!</span>
            </div>
          )}
        </div>

        {gameState === 'idle' && (
          <Button onClick={startGame} size="lg" className="w-full">Start</Button>
        )}

        {gameState === 'playing' && (
          <Button onClick={stopNeedle} size="lg" className="w-full">STOP</Button>
        )}

        {gameState === 'result' && (
          <div className="flex flex-col gap-4">
            <div className="text-center py-2">
              <p className="text-4xl font-bold text-text-primary">{score}%</p>
              <p className="text-sm text-text-muted mt-1">
                {score === 100 ? 'Perfect!' : score >= 80 ? 'Excellent!' : score >= 60 ? 'Great!' : score >= 40 ? 'Not bad' : 'Keep trying!'}
              </p>
              <p className="text-accent-light font-semibold mt-1">+{coinsEarned} coins</p>
              {submitted && <p className="text-xs text-success mt-1">Score submitted!</p>}
            </div>
            <div className="flex gap-2">
              {canSubmit && (
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? 'Submitting…' : `Submit for ${coinsEarned} coins`}
                </Button>
              )}
              <Button variant={canSubmit ? 'secondary' : 'primary'} onClick={startGame} className="flex-1">
                Play Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
