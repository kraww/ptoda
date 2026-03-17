import StatBar from './StatBar'

export default function StatPanel({ pet }) {
  if (!pet) return null
  return (
    <div className="flex flex-col gap-3 bg-slate-900 rounded-2xl p-4 border border-slate-800">
      <StatBar stat="hunger"      value={pet.hunger} />
      <StatBar stat="happiness"   value={pet.happiness} />
      <StatBar stat="cleanliness" value={pet.cleanliness} />
      <StatBar stat="energy"      value={pet.energy} />
    </div>
  )
}
