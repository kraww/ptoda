import StatBar from './StatBar'

export default function StatPanel({ pet }) {
  if (!pet) return null
  return (
    <div className="flex flex-col gap-3.5 bg-surface border border-border rounded-lg p-4">
      <p className="section-label">Stats</p>
      <StatBar stat="hunger"      value={pet.hunger} />
      <StatBar stat="happiness"   value={pet.happiness} />
      <StatBar stat="cleanliness" value={pet.cleanliness} />
      <StatBar stat="energy"      value={pet.energy} />
    </div>
  )
}
