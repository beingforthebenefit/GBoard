import { describe, it, expect } from 'vitest'
import {
  formatSignRange,
  getAstrologySnapshot,
  getConstellationPattern,
  getMoonPhase,
  getSunSign,
} from '../utils/astrology.js'

describe('astrology utils', () => {
  it('resolves Aries on boundary start date', () => {
    const { sign } = getSunSign(new Date('2026-03-21T12:00:00Z'))
    expect(sign.name).toBe('Aries')
  })

  it('resolves Capricorn across year boundary', () => {
    const { sign } = getSunSign(new Date('2026-01-10T12:00:00Z'))
    expect(sign.name).toBe('Capricorn')
  })

  it('formats sign date range', () => {
    const { sign } = getSunSign(new Date('2026-03-07T12:00:00Z'))
    expect(formatSignRange(sign)).toBe('Feb 19 - Mar 20')
  })

  it('returns Saturday snapshot details for March 7, 2026', () => {
    const snapshot = getAstrologySnapshot(new Date('2026-03-07T12:00:00Z'))
    expect(snapshot.sign.name).toBe('Pisces')
    expect(snapshot.weekday.dayName).toBe('Saturday')
    expect(snapshot.weekday.ruler).toBe('Saturn')
  })

  it('returns moon phase with valid illumination bounds', () => {
    const moon = getMoonPhase(new Date('2026-03-07T12:00:00Z'))
    expect(moon.illumination).toBeGreaterThanOrEqual(0)
    expect(moon.illumination).toBeLessThanOrEqual(100)
    expect(moon.name.length).toBeGreaterThan(0)
  })

  it('returns a constellation pattern for the active sign', () => {
    const snapshot = getAstrologySnapshot(new Date('2026-03-07T12:00:00Z'))
    expect(snapshot.constellation.name).toBe('Pisces')
    expect(snapshot.constellation.stars.length).toBeGreaterThan(4)
    expect(snapshot.constellation.lines.length).toBeGreaterThan(3)
  })

  it('falls back to a safe constellation for unknown sign keys', () => {
    const fallback = getConstellationPattern('Unknown Sign')
    expect(fallback.name).toBe('Aries')
  })
})
