import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getTodaySubmissions, submitScore } from '../../lib/games'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
const COIN_MULTS = [1, 1.5, 2]

export default function LuckyRollGame() {
  const { user, loadProfile } = useAuth()
  const [gameRow, setGameRow] = useState(null)
  const [phase, setPhase] = useState('idle')   // idle | rolling | result | done
  const [rollNumber, setRollNumber] = useState(1)
  const [rollResults, setRollResults] = useState([])   // [{face, won, coins}]
  const [face, setFace] = useState(0)
  const [todaySubs, setTodaySubs] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('games').select('*').eq('key', 'lucky-roll').single(),
      getTodaySubmissions(supabase, user.id, 'lucky-roll'),
    ]).then(([{ data }, subs]) => { setGameRow(data); setTodaySubs(subs) })
  }, [user])

  function roll() {
    if (phase === 'rolling') return
    const winChance = gameRow?.config?.win_chance ?? 0.45
    const baseCoins = gameRow?.config?.coins_win  ?? 12
    const didWin    = Math.random() < winChance
    const finalFace = didWin
      ? Math.floor(Math.random() * 3) + 3
      : Math.floor(Math.random() * 3)
    const coins = didWin ? Math.round(baseCoins * COIN_MULTS[rollNumber - 1]) : 0

    setPhase('rolling')
    let ticks = 0
    intervalRef.current = setInterval(() => {
      setFace(Math.floor(Math.random() * 6))
      ticks++
      if (ticks >= 20) {
        clearInterval(intervalRef.current)
        setFace(finalFace)
        const newResults = [...rollResults, { face: finalFace, won: didWin, coins }]
        setRollResults(newResults)
        setPhase(rollNumber >= 3 ? 'done' : 'result')
      }
    }, 60)
  }

  function nextRoll() {
    setRollNumber(r => r + 1)
    setPhase('idle')
  }

  function startSession() {
    setRollNumber(1)
    setRollResults([])
    setSubmitted(false)
    setPhase('idle')
  }

  async function handleSubmit() {
    const totalCoins = rollResults.reduce((s, r) => s + r.coins, 0)
    const wins = rollResults.filter(r => r.won).length
    setSubmitting(true)
    try {
      await submitScore(supabase, user.id, 'lucky-roll', wins, totalCoins)
      await loadProfile(user.id)
      setTodaySubs(s => s + 1)
      setSubmitted(true)
      setPhase('done')
    } catch {}
    setSubmitting(false)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  if (!gameRow) return <LoadingSpinner message="Loading game…" />

  const limit      = gameRow.daily_submission_limit
  const baseCoins  = gameRow?.config?.coins_win ?? 12
  const totalCoins = rollResults.reduce((s, r) => s + r.coins, 0)
  const canSubmit  = todaySubs < limit && !submitted && rollResults.length > 0
  const isRolling  = phase === 'rolling'

  return (
    <div className="flex flex-col gap-5">
      <Link to="/games" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit">
        <ArrowLeft size={14} /> Games
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Lucky Roll</h1>
          <p className="text-sm text-text-muted mt-0.5">3 rolls per session. Later rolls are worth more.</p>
        </div>
        <span className="text-xs text-text-muted mt-1">{todaySubs}/{limit} submitted today</span>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 flex flex-col items-center gap-5">
        {/* Round indicator */}
        <div className="flex gap-1.5 self-start w-full justify-between items-center">
          <div className="flex gap-1.5">
            {[1,2,3].map(r => (
              <div key={r} className={`w-6 h-1.5 rounded-full transition-colors ${
                rollResults[r-1] !== undefined
                  ? (rollResults[r-1].won ? 'bg-success' : 'bg-danger/60')
                  : r === rollNumber && phase !== 'done' ? 'bg-accent-light' : 'bg-card'
              }`} />
            ))}
          </div>
          {phase !== 'done' && !submitted && (
            <span className="text-xs text-text-muted">
              Roll {rollNumber} — {Math.round(baseCoins * COIN_MULTS[rollNumber - 1])} coins if win
            </span>
          )}
        </div>

        {/* Die */}
        <div
          className="w-32 h-32 rounded-2xl bg-card border-2 flex items-center justify-center select-none"
          style={{
            borderColor: (phase === 'result' || phase === 'done') && rollResults.length > 0
              ? (rollResults[rollResults.length - 1].won ? 'rgb(34 197 94)' : 'rgb(229 72 77)')
              : 'rgb(var(--color-border))',
            fontSize: '5rem',
            lineHeight: 1,
            transition: 'border-color 0.2s',
          }}
        >
          {DIE_FACES[face]}
        </div>

        {/* Results breakdown */}
        {rollResults.length > 0 && (
          <div className="w-full flex flex-col gap-1.5">
            {rollResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Roll {i + 1}</span>
                <span className={r.won ? 'text-success font-medium' : 'text-text-muted'}>
                  {r.won ? `+${r.coins} coins` : 'No luck'}
                </span>
              </div>
            ))}
            {rollResults.length > 1 && (
              <div className="flex items-center justify-between text-sm border-t border-border pt-1.5 mt-0.5">
                <span className="text-text-muted font-medium">Total</span>
                <span className="text-accent-light font-bold">+{totalCoins} coins</span>
              </div>
            )}
          </div>
        )}

        {submitted && <p className="text-sm text-success font-medium">Score submitted!</p>}

        {/* Buttons */}
        <div className="flex gap-2 w-full">
          {(phase === 'idle' || isRolling) && (
            <Button onClick={roll} disabled={isRolling} size="lg" className="flex-1">
              {isRolling ? 'Rolling…' : rollNumber === 1 && rollResults.length === 0 ? 'Roll' : `Roll ${rollNumber}`}
            </Button>
          )}

          {phase === 'result' && (
            <>
              <Button onClick={() => { nextRoll() }} className="flex-1">
                Roll {rollNumber + 1} →
              </Button>
              {canSubmit && (
                <Button variant="secondary" onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? 'Submitting…' : `Submit ${totalCoins} coins`}
                </Button>
              )}
            </>
          )}

          {(phase === 'done' || submitted) && (
            <>
              {canSubmit && !submitted && (
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? 'Submitting…' : `Submit ${totalCoins} coins`}
                </Button>
              )}
              <Button variant={canSubmit && !submitted ? 'secondary' : 'primary'} onClick={startSession} className="flex-1">
                Play Again
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
