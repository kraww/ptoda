import { useState } from 'react'
import { Egg, Heart, Sparkles, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Button from './ui/Button'

const STEPS = [
  {
    Icon: Egg,
    title: 'Adopt an egg',
    body: 'Visit the Adopt page to pick your first egg. Different species hatch at different times — some only appear at night.',
  },
  {
    Icon: Heart,
    title: 'Care for your pet',
    body: 'Feed, play, clean, and let it sleep to keep its stats up. Stats decay over time, so check in daily. Let any stat hit zero and your pet gets sick.',
  },
  {
    Icon: Sparkles,
    title: 'Watch it evolve',
    body: 'How you care for your pet shapes its personality. Feed it the most and it becomes a Gourmet. Play the most and it becomes a Wildling. There are four possible forms.',
  },
  {
    Icon: Star,
    title: 'Release and collect',
    body: 'After raising your pet long enough, you can release it. Released pets become badges on your profile — and unlock new egg species to adopt.',
  },
]

export default function OnboardingModal() {
  const { user, loadProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [finishing, setFinishing] = useState(false)

  async function finish() {
    setFinishing(true)
    await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id)
    await loadProfile(user.id)
  }

  const { Icon, title, body } = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl flex flex-col gap-6 p-7">

        {/* Step dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-border'}`} />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Icon size={30} className="text-accent-light" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center flex flex-col gap-2">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <p className="text-sm text-text-muted leading-relaxed">{body}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="flex-1">
              Back
            </Button>
          )}
          <Button
            onClick={() => isLast ? finish() : setStep(s => s + 1)}
            disabled={finishing}
            className="flex-1"
          >
            {isLast ? (finishing ? 'Starting…' : "Let's go!") : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
