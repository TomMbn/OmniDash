// Icône et couleur de chaque sous-section, sur le principe des catégories du Dressing.
import { createLucideIcon, Droplets, Footprints, HeartPulse, Package, Scissors, Shirt, Smile, Sparkles, SprayCan, ThermometerSnowflake, Watch } from 'lucide-vue-next'
import { trousers } from '@lucide/lab'

const Trousers = createLucideIcon('Trousers', trousers)

const GROUPS = {
  'manteau et vestes': { icon: Shirt, tone: 'sleep' },
  hauts: { icon: Shirt, tone: 'dress' },
  bas: { icon: Trousers, tone: 'nutri' },
  chaussures: { icon: Footprints, tone: 'windows' },
  accessoires: { icon: Watch, tone: 'shop' },
  'couches chaudes': { icon: ThermometerSnowflake, tone: 'travel' },
}

const CATEGORY_LOOKS = {
  vetements: { icon: Shirt, tone: 'dress' },
  cheveux: { icon: Scissors, tone: 'muscu' },
  visage: { icon: Sparkles, tone: 'windows' },
  corps: { icon: Droplets, tone: 'sleep' },
  dents: { icon: Smile, tone: 'finance' },
  sante: { icon: HeartPulse, tone: 'nutri' },
  parfums: { icon: SprayCan, tone: 'dress' },
}

export const lookFor = (category, group = '') =>
  (category === 'vetements' && GROUPS[group.toLowerCase()]) ||
  CATEGORY_LOOKS[category] ||
  { icon: Package, tone: 'shop' }

export const toneStyle = (tone) => ({
  '--tone': `var(--module-${tone})`,
  '--tone-dim': `var(--module-${tone}-dim)`,
})
