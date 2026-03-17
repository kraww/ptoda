import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getTodaySubmissions, submitScore } from '../../lib/games'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const TILES = [
  { id: 0, active: '#ef4444', inactive: 'rgb(127 29 29 / 0.5)', label: 'Red' },
  { id: 1, active: '#3b82f6', inactive: 'rgb(30 58 138 / 0.5)', label: 'Blue' },
  { id: 2, active: '#22c55e', inactive: 'rgb(20 83 45 / 0.5)', label: 'Green' },
  { id: 3, active: '#eab308', inactive: 'rgb(113 63 18 / 0.5)', label: 'Yellow' },
]

export default function SimonGame() {
  const { user, loadProfile } = useAuth()
  const [gameRow, setGameRow] = useState(null)
  const [phase, setPhase] = useState('idle')   // idle | showing | input | done
  const [sequence, setSequence] = useState([])
  const [round, setRound] = useState(1)
  const [activeId, setActiveId] = useState(null)
  const [inputIndex, setInputIndex] = useState(0)
  const [todaySubs, setTodaySubs] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const timeoutsRef = useRef([])

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('games').select('*').eq('key', 'simon').single(),
      getTodaySubmissions(supabase, user.id, 'simon'),
    ]).then(([{ data }, subs]) => { setGameRow(data); setTodaySubs(subs) })
  }, [user])

  function clearTimeouts() { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = [] }
  function addTimeout(fn, delay) { const id = setTimeout(fn, delay); timeoutsRef.current.push(id); return id }

  function showSequence(seq) {
    setPhase('showing')
    setActiveId(null)
    const initialSpeed  = gameRow?.config?.initial_speed ?? 800
    const speedDecrease = gameRow?.config?.speed_decrease ?? 40
    const flashDuration = Math.max(200, initialSpeed - (seq.length - 1) * speedDecrease)
    const gap = 100
    const stepTime = flashDuration + gap
    const delay = 400
    seq.forEach((id, i) => {
      addTimeout(() => setActiveId(id), delay + i * stepTime)
      addTimeout(() => setActiveId(null), delay + i * stepTime + flashDuration)
    })
    addTimeout(() => { setInputIndex(0); setPhase('input') }, delay + seq.length * stepTime + 200)
  }

  function startGame() {
    clearTimeouts()
    const seq = [Math.floor(Math.random() * 4)]
    setSequence(seq)
    setRound(1)
    setSubmitted(false)
    showSequence(seq)
  }

  function handleTileClick(id) {
    if (phase !== 'input') return
    setActiveId(id)
    addTimeout(() => setActiveId(null), 150)

    if (id !== sequence[inputIndex]) {
      clearTimeouts()
      setPhase('done')
      return
    }

    const nextIdx = inputIndex + 1
    if (nextIdx === sequence.length) {
      const nextSeq = [...sequence, Math.floor(Math.random() * 4)]
      setRound(r => r + 1)
      setSequence(nextSeq)
      addTimeout(() => showSequence(nextSeq), 600)
    } else {
      setInputIndex(nextIdx)
    }
  }

  async function handleSubmit() {
    const coinsPerRound = gameRow?.config?.coins_per_round ?? 4
    const maxCoins      = gameRow?.config?.max_coins ?? 40
    const score         = round - 1  // rounds successfully completed
    const coins         = Math.min(maxCoins, score * coinsPerRound)
    setSubmitting(true)
    try {
      await submitScore(supabase, user.id, 'simon', score, coins)
      await loadProfile(user.id)
      setTodaySubs(s => s + 1)
      setSubmitted(true)
    } catch {}
    setSubmitting(false)
  }

  useEffect(() => () => clearTimeouts(), [])

  if (!gameRow) return <LoadingSpinner message="Loading game…" />

  const limit         = gameRow.daily_submission_limit
  const coinsPerRound = gameRow?.config?.coins_per_round ?? 4
  const maxCoins      = gameRow?.config?.max_coins ?? 40
  const score         = round - 1
  const coins         = Math.min(maxCoins, score * coinsPerRound)
  const canSubmit     = todaySubs < limit && !submitted && phase === 'done' && score > 0

  return (
    <div className="flex flex-col gap-5">
      <Link to="/games" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit">
        <ArrowLeft size={14} /> Games
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Simon Says</h1>
          <p className="text-sm text-text-muted mt-0.5">Repeat the pattern. How far can you go?</p>
        </div>
        <span className="text-xs text-text-muted mt-1">{todaySubs}/{limit} submitted today</span>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-5">
        {/* Status */}
        {(phase === 'showing' || phase === 'input') && (
          <p className="text-center text-sm text-text-muted">
            {phase === 'showing'
              ? `Round ${round} — watch the pattern…`
              : `Round ${round} — step ${inputIndex + 1} of ${sequence.length}`}
          </p>
        )}

        {/* Tiles */}
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto w-full">
          {TILES.map(tile => (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              disabled={phase !== 'input'}
              className="h-24 rounded-xl transition-all duration-75 active:scale-95 disabled:cursor-default"
              style={{
                background: activeId === tile.id ? tile.active : tile.inactive,
                boxShadow: activeId === tile.id ? `0 0 20px ${tile.active}60` : 'none',
              }}
            />
          ))}
        </div>

        {phase === 'idle' && (
          <Button onClick={startGame} size="lg" className="w-full">Start</Button>
        )}

        {phase === 'done' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Rounds completed</span>
              <span className="text-text-primary font-medium">{score}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-border pt-1.5">
              <span className="text-text-muted font-medium">Coins earned</span>
              <span className="text-accent-light font-bold">+{coins}</span>
            </div>

            {submitted && <p className="text-center text-xs text-success">Score submitted!</p>}

            <div className="flex gap-2">
              {canSubmit && (
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                  {submitting ? 'Submitting…' : `Submit ${coins} coins`}
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
