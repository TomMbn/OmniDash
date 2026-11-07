// Dates au fuseau de l'appareil : toISOString() donne l'heure UTC,
// ce qui fait basculer sur la veille tout ce qui est saisi entre minuit et 1 h ou 2 h.

const pad = (n) => String(n).padStart(2, '0')

// AAAA-MM-JJ du jour local
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// Lundi de la semaine locale, à minuit
export const mondayOf = (date = new Date()) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1))
  return monday
}
