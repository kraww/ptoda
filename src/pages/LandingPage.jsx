import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Wordmark */}
        <div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">T'poda</h1>
          <p className="text-text-secondary mt-2 text-base leading-relaxed">
            Adopt an egg. Raise it your way.<br />See what it becomes.
          </p>
        </div>

        {/* Feature list */}
        <div className="flex flex-col gap-2 border-l-2 border-accent pl-4">
          {[
            'Hatch eggs into unique pets',
            'How you raise them shapes who they become',
            'Earn coins, shop for care items',
            'Play mini-games and compete with friends',
          ].map(line => (
            <p key={line} className="text-sm text-text-muted">{line}</p>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <Link to="/register">
            <Button className="w-full" size="lg">Create Account</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" className="w-full" size="lg">Log In</Button>
          </Link>
        </div>

        <p className="text-2xs text-text-muted text-center">Free to play · Works on mobile</p>
      </div>
    </div>
  )
}
