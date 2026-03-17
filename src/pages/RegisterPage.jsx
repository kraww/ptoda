import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signUp(email, password, username)
      navigate('/adopt')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div>
          <h1 className="text-2xl font-bold text-text-primary">Create account</h1>
          <p className="text-text-muted text-sm mt-1">Your egg is waiting</p>
        </div>

        {error && (
          <div className="bg-danger/5 border border-danger/30 rounded text-danger text-sm px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required minLength={2} maxLength={20} className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="field" />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="mt-1">
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-text-muted text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-light hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
