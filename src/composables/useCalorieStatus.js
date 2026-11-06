// Écart à l'objectif : tenu à ±5 %, puis limite jusqu'à 15 % au-dessus ou 30 % en dessous.
export function calorieState(calories, target) {
  if (!target) return 'plain'
  const ratio = calories / target
  if (ratio >= 0.95 && ratio <= 1.05) return 'good'
  return ratio >= 0.7 && ratio <= 1.15 ? 'mid' : 'bad'
}
