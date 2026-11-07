// Logos des services d'abonnement, sans requête réseau.
// Seules les icônes listées ici entrent dans le bundle (imports nommés).

import {
  siApple,
  siApplemusic,
  siAppletv,
  siAudible,
  siClaude,
  siCrunchyroll,
  siDeepl,
  siDeezer,
  siDiscord,
  siDropbox,
  siDuolingo,
  siGithub,
  siGoogle,
  siGooglegemini,
  siHbomax,
  siIcloud,
  siLequipe,
  siMistralai,
  siNetflix,
  siNordvpn,
  siNotion,
  siOrange,
  siParamountplus,
  siPerplexity,
  siPlaystation,
  siProton,
  siSncf,
  siSpotify,
  siSteam,
  siStrava,
  siTwitch,
  siUber,
  siYoutube,
  siYoutubemusic,
} from 'simple-icons'

// Mots-clés cherchés dans le nom et le motif, du plus précis au plus général
const SERVICES = [
  { keys: ['APPLE MUSIC'], icon: siApplemusic },
  { keys: ['APPLE TV'], icon: siAppletv },
  { keys: ['ICLOUD'], icon: siIcloud },
  { keys: ['APPLE'], icon: siApple },
  { keys: ['YOUTUBE MUSIC'], icon: siYoutubemusic },
  { keys: ['YOUTUBE'], icon: siYoutube },
  { keys: ['GEMINI'], icon: siGooglegemini },
  { keys: ['GOOGLE'], icon: siGoogle },
  { keys: ['NETFLIX'], icon: siNetflix },
  { keys: ['SPOTIFY'], icon: siSpotify },
  { keys: ['DEEZER'], icon: siDeezer },
  { keys: ['AUDIBLE'], icon: siAudible },
  { keys: ['PARAMOUNT'], icon: siParamountplus },
  { keys: ['HBO'], icon: siHbomax },
  { keys: ['CRUNCHYROLL'], icon: siCrunchyroll },
  { keys: ['TWITCH'], icon: siTwitch },
  { keys: ['DROPBOX'], icon: siDropbox },
  { keys: ['ORANGE'], not: ['ORANGE BLEUE'], icon: siOrange },
  { keys: ['PLAYSTATION', 'PSN', 'SONY INTERACTIVE'], icon: siPlaystation },
  { keys: ['STEAM'], icon: siSteam },
  { keys: ['DISCORD'], icon: siDiscord },
  { keys: ['CLAUDE', 'ANTHROPIC'], icon: siClaude },
  { keys: ['PERPLEXITY'], icon: siPerplexity },
  { keys: ['MISTRAL'], icon: siMistralai },
  { keys: ['NOTION'], icon: siNotion },
  { keys: ['GITHUB'], icon: siGithub },
  { keys: ['DEEPL'], icon: siDeepl },
  { keys: ['DUOLINGO'], icon: siDuolingo },
  { keys: ['STRAVA'], icon: siStrava },
  { keys: ['NORDVPN'], icon: siNordvpn },
  { keys: ['PROTON'], icon: siProton },
  { keys: ['UBER'], icon: siUber },
  { keys: ['SNCF'], icon: siSncf },
  { keys: ['L EQUIPE', 'LEQUIPE'], icon: siLequipe },
]

// Teintes douces pour l'initiale de repli
const PALETTE = ['finance', 'windows', 'muscu', 'sleep', 'dress', 'nutri']

const normalize = (s) =>
  ` ${String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()} `

// Mot entier, ou début de mot pour les noms longs (SPOTIFYP2A1B)
const hasKey = (text, key) => text.includes(` ${key} `) || (key.length >= 5 && text.includes(` ${key}`))

// Luminance relative d'une couleur hexadécimale
const luminance = (hex) => {
  const n = parseInt(hex, 16)
  const channel = (c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

// Hachage simple et stable d'une chaîne
const hash = (s) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

export function findService(name, pattern) {
  const text = normalize(`${name ?? ''} ${pattern ?? ''}`)
  return SERVICES.find((s) => s.keys.some((k) => hasKey(text, k)) && !(s.not || []).some((k) => hasKey(text, k))) ?? null
}

// { type: 'svg', path, color, title, fill, light } ou { type: 'initial', letter, color, background }
export function logoFor(name, pattern) {
  const service = findService(name, pattern)
  if (service) {
    const { path, hex, title } = service.icon
    const lum = luminance(hex)
    // Blanc sur la couleur de marque si le contraste suffit (2,5:1), sinon pictogramme sombre
    const whiteContrast = 1.05 / (lum + 0.05)
    return {
      type: 'svg',
      path,
      color: `#${hex}`,
      title,
      fill: whiteContrast >= 2.5 ? '#FFFFFF' : '#111111',
      light: lum > 0.8,
    }
  }
  const clean = normalize(name || pattern).trim()
  const letter = clean.charAt(0) || '?'
  const tone = PALETTE[hash(clean || '?') % PALETTE.length]
  return { type: 'initial', letter, color: `var(--module-${tone})`, background: `var(--module-${tone}-dim)` }
}
