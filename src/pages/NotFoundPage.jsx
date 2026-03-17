import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 text-center px-6">
      <p className="text-6xl font-bold text-border">404</p>
      <h1 className="text-xl font-semibold text-text-primary">Page not found</h1>
      <p className="text-text-muted text-sm">This page doesn't exist or was moved.</p>
      <Link to="/"><Button variant="secondary">Go Home</Button></Link>
    </div>
  )
}
