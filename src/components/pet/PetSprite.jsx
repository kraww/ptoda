import { STAGE_EGG, STAGE_BABY, STAGE_EVOLVED } from '../../lib/constants'

// Placeholder emoji per stage — replaced by real art once assets are ready
const PLACEHOLDER = {
  [STAGE_EGG]:     '🥚',
  [STAGE_BABY]:    '🐣',
  [STAGE_EVOLVED]: '✨',
}

export default function PetSprite({ pet, species, size = 160 }) {
  const stage = pet?.stage ?? STAGE_EGG
  const form  = pet?.evolution_form ?? null

  // Try to get image URL from species data
  let imgSrc = null
  if (species) {
    if (stage === STAGE_EGG)     imgSrc = species.egg_sprite
    if (stage === STAGE_BABY)    imgSrc = species.base_sprite
    if (stage === STAGE_EVOLVED) imgSrc = species.evolution_sprites?.[form] ?? species.base_sprite
  }

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={species?.name ?? 'Pet'}
        style={{ width: size, height: size, objectFit: 'contain' }}
        className="drop-shadow-lg"
      />
    )
  }

  // No art yet — show placeholder emoji
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      className="flex items-center justify-center select-none"
      role="img"
      aria-label={stage}
    >
      {PLACEHOLDER[stage] ?? '🐾'}
    </div>
  )
}
