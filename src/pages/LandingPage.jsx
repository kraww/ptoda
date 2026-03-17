import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8">
      <div>
        <div className="text-7xl mb-4">🥚</div>
        <h1 className="text-4xl font-bold text-primary-400 mb-2">T'poda</h1>
        <p className="text-slate-400 text-lg max-w-xs mx-auto">
          Adopt an egg. Raise it your way. See what it becomes.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link to="/register">
          <Button className="w-full" size="lg">Get Started</Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary" className="w-full" size="lg">Log In</Button>
        </Link>
      </div>

      <p className="text-slate-600 text-xs">Free to play · Mobile friendly</p>
    </div>
  )
}
