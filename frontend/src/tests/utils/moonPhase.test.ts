import { describe, it, expect } from 'vitest'
import { computeMoonPhase } from '../../utils/moonPhase.js'

const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0)
const SYNODIC_MS = 29.530588853 * 86_400_000

describe('computeMoonPhase', () => {
  it('returns new moon at the reference date', () => {
    const { phase, illumination, name } = computeMoonPhase(new Date(REFERENCE_NEW_MOON))
    expect(phase).toBeCloseTo(0, 5)
    expect(illumination).toBeCloseTo(0, 5)
    expect(name).toBe('New Moon')
  })

  it('returns full moon half a synodic month later', () => {
    const { phase, illumination, name } = computeMoonPhase(
      new Date(REFERENCE_NEW_MOON + SYNODIC_MS / 2)
    )
    expect(phase).toBeCloseTo(0.5, 5)
    expect(illumination).toBeCloseTo(1, 5)
    expect(name).toBe('Full Moon')
  })

  it('returns first quarter at a quarter cycle, waxing', () => {
    const result = computeMoonPhase(new Date(REFERENCE_NEW_MOON + SYNODIC_MS / 4))
    expect(result.name).toBe('First Quarter')
    expect(result.illumination).toBeCloseTo(0.5, 5)
    expect(result.waxing).toBe(true)
  })

  it('returns last quarter at three quarters, waning', () => {
    const result = computeMoonPhase(new Date(REFERENCE_NEW_MOON + (SYNODIC_MS * 3) / 4))
    expect(result.name).toBe('Last Quarter')
    expect(result.waxing).toBe(false)
  })

  it('handles dates before the reference epoch', () => {
    const { phase } = computeMoonPhase(new Date(REFERENCE_NEW_MOON - SYNODIC_MS / 2))
    expect(phase).toBeCloseTo(0.5, 5)
  })

  it('wraps across many cycles', () => {
    const { phase } = computeMoonPhase(new Date(REFERENCE_NEW_MOON + SYNODIC_MS * 100))
    // Float rounding can land just below 1.0, which is equivalent to 0 on the cycle
    expect(Math.min(phase, 1 - phase)).toBeCloseTo(0, 4)
  })
})
