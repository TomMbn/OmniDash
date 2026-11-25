import { Moon, Repeat, Sun } from 'lucide-vue-next'

export const SECTION_LOOKS = {
  matin: { icon: Sun, tone: 'windows' },
  soir: { icon: Moon, tone: 'sleep' },
  habitude: { icon: Repeat, tone: 'routine' },
}

export const toneStyle = (tone) => ({
  '--tone': `var(--module-${tone})`,
  '--tone-dim': `var(--module-${tone}-dim)`,
})
