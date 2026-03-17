import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getTodaySubmissions, submitScore } from '../../lib/games'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const ROUND_SPEED_MULT  = [1, 1.4, 1.9]
const ROUND_ZONE_MULT   = [1, 0.75, 0.55]

export default function MeterStopperGame() {
  const { user, loadProfile } = useAuth()
  const [gameRow, setGameRow] = useState(null)
  const [phase, setPhase] = useState('idle')      // idle | playing | between | done
  const [sessionRound, setSessionRound] = useState(1)
  const [roundResults, setRoundResults] = useState([])  // [{score, coins}]
  const [position, setPosition] = useState(0.1)
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
    ]).then(([{ data }, subs]) => { setGameRow(data); setTodaySubs(subs) })
  }, [user])

  function getRoundCfg(round) {
    const idx = round - 1
    return {
      speed:     (gameRow?.config?.speed      ?? 1.5)  * ROUND_SPEED_MULT[idx],
      zoneWidth: (gameRow?.config?.zone_width ?? 0.18) * ROUND_ZONE_MULT[idx],
    }
  }

  useEffect(() => {
    if (phase !== 'playing') return
    const { speed } = getRoundCfg(sessionRound)
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
  }, [phase, sessionRound, gameRow])

  function startSession() {
    posRef.current = 0.1; dirRef.current = 1
    setPosition(0.1); setSessionRound(1); setRoundResults([])
    setSubmitted(false); setPhase('playing')
  }

  function startNextRound() {
    posRef.current = 0.1; dirRef.current = 1
    setPosition(0.1); setPhase('playing')
  }

  function stopNeedle() {
    if (phase !== 'playing') return
    cancelAnimationFrame(animRef.current)
    const { zoneWidth } = getRoundCfg(sessionRound)
    const pos = posRef.current
    const dist = Math.abs(pos - 0.5)
    const score = Math.max(0, Math.round(100 - (dist / 0.5) * 100))
    const coinsMin = gameRow?.config?.coins_min ?? 5
    const coinsMax = gameRow?.config?.coins_max ?? 20
    const coins = Math.round(coinsMin + (coinsMax - coinsMin) * (score / 100))
    const newResults = [...roundResults, { score, coins }]
    setRoundResults(newResults)
    setPhase(sessionRound >= 3 ? 'done' : 'between')
  }

  async function handleSubmit() {
    const totalCoins = roundResults.reduce((s, r) => s + r.coins, 0)
    const avgScore   = Math.round(roundResults.reduce((s, r) => s + r.score, 0) / roundResults.length)
    setSubmitting(true)
    try {
      await submitScore(supabase, user.id, 'meter-stopper', avgScore, totalCoins)
      await loadProfile(user.id)
      setTodaySubs(s => s + 1)
      setSubmitted(true)
      setPhase('done')
    } catch {}
    setSubmitting(false)
  }

  if (!gameRow) return <LoadingSpinner message="Loading game…" />

  const limit       = gameRow.daily_submission_limit
  const canSubmit   = todaySubs < limit && !submitted && roundResults.length > 0
  const totalCoins  = roundResults.reduce((s, r) => s + r.coins, 0)
  const { zoneWidth } = phase === 'idle' ? getRoundCfg(1) : getRoundCfg(sessionRound)

  return (
    <div className="flex flex-col gap-5">
      <Link to="/games" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit">
        <ArrowLeft size={14} /> Games
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Meter Stopper</h1>
          <p className="text-sm text-text-muted mt-0.5">Stop the needle in the green zone. 3 rounds, gets harder each time.</p>
        </div>
        <span className="text-xs text-text-muted mt-1">{todaySubs}/{limit} submitted today</span>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-5">
        {/* Round indicator */}
        {phase !== 'idle' && (
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {[1,2,3].map(r => (
                <div key={r} className={`w-6 h-1.5 rounded-full transition-colors ${
                  r < sessionRound ? 'bg-accent' :
                  r === sessionRound && phase !== 'done' ? 'bg-accent-light' : 'bg-card'
                }`} />
              ))}
            </div>
            {phase === 'playing' && <span className="text-xs text-text-muted">Round {sessionRound} of 3</span>}
          </div>
        )}

        {/* Meter bar */}
        <div
          className="relative h-16 bg-card rounded-lg overflow-hidden select-none"
          onClick={stopNeedle}
          style={{ cursor: phase === 'playing' ? 'pointer' : 'default' }}
        >
          <div className="absolute top-0 h-full" style={{
            left: `${(0.5 - zoneWidth / 2) * 100}%`,
            width: `${zoneWidth * 100}%`,
            background: 'rgb(34 197 94 / 0.15)',
            borderLeft: '2px solid rgb(34 197 94 / 0.5)',
            borderRight: '2px solid rgb(34 197 94 / 0.5)',
          }} />
          <div className="absolute top-2 bottom-2 w-px bg-success/20" style={{ left: '50%' }} />
          <div className="absolute top-0 h-full w-0.5" style={{
            left: `${position * 100}%`,
            transform: 'translateX(-50%)',
            background: (phase === 'between' || phase === 'done')
              ? ((roundResults[roundResults.length - 1]?.score ?? 0) >= 60 ? 'rgb(34 197 94)' : 'rgb(229 72 77)')
              : 'rgb(167 139 250)',
          }} />
          {phase === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-text-muted">Press Start</span>
            </div>
          )}
          {phase === 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-text-muted font-medium">Click to stop!</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {phase === 'idle' && (
          <Button onClick={startSession} size="lg" className="w-full">Start</Button>
        )}

        {phase === 'playing' && (
          <Button onClick={stopNeedle} size="lg" className="w-full">STOP</Button>
        )}

        {(phase === 'between' || phase === 'done') && (
          <div className="flex flex-col gap-4">
            {/* Per-round breakdown */}
            <div className="flex flex-col gap-1.5">
              {roundResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Round {i + 1}</span>
                  <span className="text-text-primary font-medium">{r.score}% — +{r.coins} coins</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm border-t border-border pt-1.5 mt-0.5">
                <span className="text-text-muted font-medium">Total</span>
                <span className="text-accent-light font-bold">+{totalCoins} coins</span>
              </div>
            </div>

            {submitted && <p className="text-center text-xs text-success">Score submitted!</p>}

            <div className="flex gap-2">
              {phase === 'between' && (
                <Button onClick={() => { setSessionRound(r => r + 1); startNextRound() }} className="flex-1">
                  Round {sessionRound + 1} →
                </Button>
              )}
              {canSubmit && (
                <Button variant={phase === 'between' ? 'secondary' : 'primary'} onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? 'Submitting…' : `Submit ${totalCoins} coins`}
                </Button>
              )}
              {(phase === 'done' || submitted) && (
                <Button variant={canSubmit ? 'ghost' : 'primary'} onClick={startSession} className="flex-1">Play Again</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
