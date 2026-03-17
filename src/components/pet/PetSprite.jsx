import { STAGE_EGG, STAGE_BABY, STAGE_EVOLVED } from '../../lib/constants'

const PLACEHOLDER = {
  [STAGE_EGG]:     '🥚',
  [STAGE_BABY]:    '🐣',
  [STAGE_EVOLVED]: '✨',
}

export default function PetSprite({ pet, species, size = 160 }) {
  const stage      = pet?.stage ?? STAGE_EGG
  const form       = pet?.evolution_form ?? null
  const isSleeping = pet?.is_sleeping ?? false

  let imgSrc = null
  if (species) {
    if (stage === STAGE_EGG)     imgSrc = species.egg_sprite
    if (stage === STAGE_BABY)    imgSrc = species.base_sprite
    if (stage === STAGE_EVOLVED) imgSrc = species.evolution_sprites?.[form] ?? species.base_sprite
  }

  const sprite = imgSrc ? (
    <img
      src={imgSrc}
      alt={species?.name ?? 'Pet'}
      style={{ width: size, height: size, objectFit: 'contain' }}
      className="drop-shadow-lg"
    />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      className="flex items-center justify-center select-none"
      role="img"
      aria-label={stage}
    >
      {PLACEHOLDER[stage] ?? '🐾'}
    </div>
  )

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={isSleeping ? 'opacity-40 grayscale' : ''}>
        {sprite}
      </div>

      {isSleeping && (
        <div className="absolute top-0 right-0 flex flex-col items-end gap-1 pointer-events-none select-none">
          <span className="text-text-muted font-bold animate-float-z1" style={{ fontSize: size * 0.18 }}>z</span>
          <span className="text-text-muted font-bold animate-float-z2" style={{ fontSize: size * 0.13 }}>z</span>
          <span className="text-text-muted font-bold animate-float-z3" style={{ fontSize: size * 0.09 }}>z</span>
        </div>
      )}
    </div>
  )
}
