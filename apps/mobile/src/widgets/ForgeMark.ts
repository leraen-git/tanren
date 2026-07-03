import type { ColorProp } from 'react-native-android-widget'

export function forgeMarkSvg(stroke: ColorProp, accent: ColorProp, size: number): string {
  const s = size
  const cx = s / 2
  const cy = s / 2
  const r = s * 0.33
  const sw = s * 0.06
  const barW = s * 0.07
  const dotR = s * 0.12

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
    <rect x="${cx - barW / 2}" y="${s * 0.06}" width="${barW}" height="${s * 0.88}" fill="${stroke}"/>
    <rect x="${s * 0.06}" y="${cy - barW / 2}" width="${s * 0.88}" height="${barW}" fill="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${accent}"/>
  </svg>`
}
