// Synodic month length in days and a reference new moon (2000-01-06 18:14 UTC)
const SYNODIC_MONTH = 29.530588853
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0)

export interface MoonPhaseInfo {
  /** 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter */
  phase: number
  /** Fraction of the disc that is lit, 0..1 */
  illumination: number
  /** Human-readable phase name */
  name: string
  /** True while the lit fraction is growing */
  waxing: boolean
}

const PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
]

export function computeMoonPhase(date: Date): MoonPhaseInfo {
  const daysSinceReference = (date.getTime() - REFERENCE_NEW_MOON) / 86_400_000
  const phase = (((daysSinceReference / SYNODIC_MONTH) % 1) + 1) % 1
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2

  // Split the cycle into 8 named segments centered on the principal phases
  const segment = Math.round(phase * 8) % 8
  return {
    phase,
    illumination,
    name: PHASE_NAMES[segment],
    waxing: phase < 0.5,
  }
}

/** Builds the SVG path for the lit portion of a moon disc centered at (cx, cy) */
export function litPath(phase: number, cx = 40, cy = 40, r = 30): string {
  const rx = Math.abs(r * Math.cos(2 * Math.PI * phase))
  const top = `${cx} ${cy - r}`
  const bottom = `${cx} ${cy + r}`
  if (phase < 0.5) {
    // Waxing: lit on the right; terminator bulges right for crescent, left for gibbous
    const sweep = phase < 0.25 ? 0 : 1
    return `M ${top} A ${r} ${r} 0 0 1 ${bottom} A ${rx} ${r} 0 0 ${sweep} ${top} Z`
  }
  // Waning: lit on the left; terminator bulges right for gibbous, left for crescent
  const sweep = phase < 0.75 ? 0 : 1
  return `M ${top} A ${r} ${r} 0 0 0 ${bottom} A ${rx} ${r} 0 0 ${sweep} ${top} Z`
}
