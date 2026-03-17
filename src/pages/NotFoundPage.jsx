import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 text-center px-6">
      <div className="text-6xl">🐾</div>
      <h1 className="text-2xl font-bold">Lost in the wild</h1>
      <p className="text-slate-400">This page doesn't exist.</p>
      <Link to="/"><Button>Go Home</Button></Link>
    </div>
  )
}
