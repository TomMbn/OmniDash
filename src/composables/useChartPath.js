// Courbe lissée (Catmull-Rom vers Bézier) pour un viewBox SVG de largeur et hauteur données.
export function smoothPath(values, { width = 100, height = 40, pad = 4 } = {}) {
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    height - pad - ((value - min) / range) * (height - pad * 2)
  ])

  let path = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    path += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}`
      + ` ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`
  }
  return path
}
