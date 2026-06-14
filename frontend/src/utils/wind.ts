export const WIND_DIR_DEGREES: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
}

/** Compass label (e.g. "NW") to degrees the wind blows FROM, or null if unknown */
export function windDirToDegrees(dir: string): number | null {
  return WIND_DIR_DEGREES[dir] ?? null
}
