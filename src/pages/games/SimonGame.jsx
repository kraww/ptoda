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
  const [gameState, setGameState] = useState('idle') // idle | showing | input | failed
  const [sequence, setSequence] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [inputIndex, setInputIndex] = useState(0)
  const [round, setRound] = useState(0)
  const [todaySubs, setTodaySubs] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const timeoutsRef = useRef([])

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('games').select('*').eq('key', 'simon').single(),
      getTodaySubmissions(supabase, user.id, 'simon'),
    ]).then(([{ data }, subs]) => {
      setGameRow(data)
      setTodaySubs(subs)
    })
  }, [user])

  function clearTimeouts() {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  function addTimeout(fn, delay) {
    const id = setTimeout(fn, delay)
    timeoutsRef.current.push(id)
    return id
  }

  function showSequence(seq) {
    setGameState('showing')
    setActiveId(null)
    const initialSpeed = gameRow?.config?.initial_speed ?? 800
    const speedDecrease = gameRow?.config?.speed_decrease ?? 40
    const flashDuration = Math.max(200, initialSpeed - (seq.length - 1) * speedDecrease)
    const gap = 100
    const stepTime = flashDuration + gap

    let delay = 400
    seq.forEach((id, i) => {
      addTimeout(() => setActiveId(id), delay + i * stepTime)
      addTimeout(() => setActiveId(null), delay + i * stepTime + flashDuration)
    })
    addTimeout(() => {
      setInputIndex(0)
      setGameState('input')
    }, delay + seq.length * stepTime + 200)
  }

  function startGame() {
    clearTimeouts()
    const firstSeq = [Math.floor(Math.random() * 4)]
    setSequence(firstSeq)
    setRound(1)
    setSubmitted(false)
    showSequence(firstSeq)
  }

  function handleTileClick(id) {
    if (gameState !== 'input') return
    setActiveId(id)
    addTimeout(() => setActiveId(null), 150)

    if (id !== sequence[inputIndex]) {
      clearTimeouts()
      setGameState('failed')
      return
    }

    const nextIndex = inputIndex + 1
    if (nextIndex === sequence.length) {
      // Round complete
      const nextRound = round + 1
      const nextSeq = [...sequence, Math.floor(Math.random() * 4)]
      setRound(nextRound)
      setSequence(nextSeq)
      addTimeout(() => showSequence(nextSeq), 600)
    } else {
      setInputIndex(nextIndex)
    }
  }

  async function handleSubmit() {
    const maxCoins = gameRow?.config?.max_coins ?? 40
    const coinsPerRound = gameRow?.config?.coins_per_round ?? 4
    const coins = Math.min(maxCoins, (round - 1) * coinsPerRound)
    setSubmitting(true)
    try {
      await submitScore(supabase, user.id, 'simon', round - 1, coins)
      await loadProfile(user.id)
      setTodaySubs(s => s + 1)
      setSubmitted(true)
    } catch {}
    setSubmitting(false)
  }

  useEffect(() => () => clearTimeouts(), [])

  if (!gameRow) return <LoadingSpinner message="Loading game…" />

  const limit = gameRow.daily_submission_limit
  const canSubmit = todaySubs < limit && !submitted && gameState === 'failed'
  const coinsPerRound = gameRow?.config?.coins_per_round ?? 4
  const maxCoins = gameRow?.config?.max_coins ?? 40
  const coinsEarned = Math.min(maxCoins, (round - 1) * coinsPerRound)

  return (
    <div className="flex flex-col gap-5">
      <Link to="/games" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit">
        <ArrowLeft size={14} /> Games
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Simon Says</h1>
          <p className="text-sm text-text-muted mt-0.5">Repeat the pattern. Each round adds one step.</p>
        </div>
        <span className="text-xs text-text-muted mt-1">{todaySubs}/{limit} submitted today</span>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-5">
        {/* Status */}
        {gameState !== 'idle' && (
          <div className="text-center">
            <p className="text-sm text-text-muted">
              {gameState === 'showing' && 'Watch the pattern…'}
              {gameState === 'input' && `Your turn — step ${inputIndex + 1} of ${sequence.length}`}
              {gameState === 'failed' && `Round ${round - 1} — game over`}
            </p>
            {gameState !== 'idle' && <p className="text-xs text-text-muted mt-0.5">Round {gameState === 'failed' ? round - 1 : round}</p>}
          </div>
        )}

        {/* Tiles grid */}
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto w-full">
          {TILES.map(tile => (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              disabled={gameState !== 'input'}
              className="h-24 rounded-xl transition-all duration-75 active:scale-95 disabled:cursor-default"
              style={{
                background: activeId === tile.id ? tile.active : tile.inactive,
                boxShadow: activeId === tile.id ? `0 0 20px ${tile.active}60` : 'none',
              }}
            />
          ))}
        </div>

        {gameState === 'idle' && (
          <Button onClick={startGame} size="lg" className="w-full">Start</Button>
        )}

        {gameState === 'failed' && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-text-primary">{round - 1}</p>
              <p className="text-sm text-text-muted mt-1">rounds completed</p>
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
