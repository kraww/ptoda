import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/pet')
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
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-text-muted text-sm mt-1">Log in to check on your pet</p>
        </div>

        {error && (
          <div className="bg-danger/5 border border-danger/30 rounded text-danger text-sm px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="field" />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="mt-1">
            {loading ? 'Logging in…' : 'Log In'}
          </Button>
        </form>

        <p className="text-center text-text-muted text-sm">
          No account?{' '}
          <Link to="/register" className="text-accent-light hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
