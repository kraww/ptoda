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

const SESSION_START_LENGTHS = [1, 4, 7]

export default function SimonGame() {
  const { user, loadProfile } = useAuth()
  const [gameRow, setGameRow] = useState(null)
  const [phase, setPhase] = useState('idle')         // idle | showing | input | fail | between | done
  const [sessionRound, setSessionRound] = useState(1)
  const [sessionResults, setSessionResults] = useState([])  // rounds survived per session round
  const [sequence, setSequence] = useState([])
  const [simonRound, setSimonRound] = useState(1)    // current simon round within a session round
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

  function generateSequence(length) {
    return Array.from({ length }, () => Math.floor(Math.random() * 4))
  }

  function showSequence(seq, onDone) {
    setPhase('showing')
    setActiveId(null)
    const initialSpeed   = gameRow?.config?.initial_speed ?? 800
    const speedDecrease  = gameRow?.config?.speed_decrease ?? 40
    const flashDuration  = Math.max(200, initialSpeed - (seq.length - 1) * speedDecrease)
    const gap = 100
    const stepTime = flashDuration + gap
    let delay = 400
    seq.forEach((id, i) => {
      addTimeout(() => setActiveId(id), delay + i * stepTime)
      addTimeout(() => setActiveId(null), delay + i * stepTime + flashDuration)
    })
    addTimeout(() => { setInputIndex(0); setPhase('input'); onDone?.() }, delay + seq.length * stepTime + 200)
  }

  function startSessionRound(sRound) {
    clearTimeouts()
    const startLen = SESSION_START_LENGTHS[sRound - 1]
    const seq = generateSequence(startLen)
    setSequence(seq)
    setSimonRound(startLen)
    setInputIndex(0)
    setActiveId(null)
    showSequence(seq)
  }

  function startSession() {
    setSessionRound(1)
    setSessionResults([])
    setSubmitted(false)
    startSessionRound(1)
  }

  function handleTileClick(id) {
    if (phase !== 'input') return
    setActiveId(id)
    addTimeout(() => setActiveId(null), 150)

    if (id !== sequence[inputIndex]) {
      clearTimeouts()
      // Failed — record rounds survived
      const survived = simonRound - SESSION_START_LENGTHS[sessionRound - 1]
      const newResults = [...sessionResults, Math.max(0, survived)]
      setSessionResults(newResults)
      setPhase(sessionRound >= 3 ? 'done' : 'fail')
      return
    }

    const nextIdx = inputIndex + 1
    if (nextIdx === sequence.length) {
      // Round complete — extend sequence
      const nextSimonRound = simonRound + 1
      const nextSeq = [...sequence, Math.floor(Math.random() * 4)]
      setSimonRound(nextSimonRound)
      setSequence(nextSeq)
      addTimeout(() => showSequence(nextSeq), 600)
    } else {
      setInputIndex(nextIdx)
    }
  }

  function continueSession() {
    const nextSRound = sessionRound + 1
    setSessionRound(nextSRound)
    startSessionRound(nextSRound)
  }

  async function handleSubmit() {
    const coinsPerRound = gameRow?.config?.coins_per_round ?? 4
    const maxCoins      = gameRow?.config?.max_coins ?? 40
    const totalRounds   = sessionResults.reduce((s, r) => s + r, 0)
    const totalCoins    = Math.min(maxCoins, totalRounds * coinsPerRound)
    setSubmitting(true)
    try {
      await submitScore(supabase, user.id, 'simon', totalRounds, totalCoins)
      await loadProfile(user.id)
      setTodaySubs(s => s + 1)
      setSubmitted(true)
      setPhase('done')
    } catch {}
    setSubmitting(false)
  }

  useEffect(() => () => clearTimeouts(), [])

  if (!gameRow) return <LoadingSpinner message="Loading game…" />

  const limit         = gameRow.daily_submission_limit
  const coinsPerRound = gameRow?.config?.coins_per_round ?? 4
  const maxCoins      = gameRow?.config?.max_coins ?? 40
  const totalRounds   = sessionResults.reduce((s, r) => s + r, 0)
  const totalCoins    = Math.min(maxCoins, totalRounds * coinsPerRound)
  const canSubmit     = todaySubs < limit && !submitted && sessionResults.length > 0
  const startLengths  = SESSION_START_LENGTHS

  return (
    <div className="flex flex-col gap-5">
      <Link to="/games" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit">
        <ArrowLeft size={14} /> Games
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Simon Says</h1>
          <p className="text-sm text-text-muted mt-0.5">Repeat the pattern. 3 rounds — each starts harder.</p>
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
                  sessionResults[r-1] !== undefined ? 'bg-accent' :
                  r === sessionRound && phase !== 'done' ? 'bg-accent-light' : 'bg-card'
                }`} />
              ))}
            </div>
            {(phase === 'showing' || phase === 'input') && (
              <span className="text-xs text-text-muted">
                Session {sessionRound}/3 — starts at {startLengths[sessionRound-1]}
              </span>
            )}
          </div>
        )}

        {/* Status */}
        {(phase === 'showing' || phase === 'input') && (
          <p className="text-center text-sm text-text-muted">
            {phase === 'showing' ? 'Watch the pattern…' : `Your turn — step ${inputIndex + 1} of ${sequence.length}`}
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
          <Button onClick={startSession} size="lg" className="w-full">Start</Button>
        )}

        {(phase === 'fail' || phase === 'done') && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              {sessionResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Session {i + 1} <span className="text-2xs">(starts at {startLengths[i]})</span></span>
                  <span className="text-text-primary font-medium">{r} extra rounds — +{Math.min(maxCoins, r * coinsPerRound)} coins</span>
                </div>
              ))}
              {sessionResults.length > 0 && (
                <div className="flex items-center justify-between text-sm border-t border-border pt-1.5 mt-0.5">
                  <span className="text-text-muted font-medium">Total</span>
                  <span className="text-accent-light font-bold">+{totalCoins} coins</span>
                </div>
              )}
            </div>

            {submitted && <p className="text-center text-xs text-success">Score submitted!</p>}

            <div className="flex gap-2">
              {phase === 'fail' && sessionRound < 3 && (
                <Button onClick={continueSession} className="flex-1">Session {sessionRound + 1} →</Button>
              )}
              {canSubmit && (
                <Button variant={phase === 'fail' && sessionRound < 3 ? 'secondary' : 'primary'} onClick={handleSubmit} disabled={submitting} className="flex-1">
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
