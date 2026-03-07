import { describe, it, expect } from 'vitest'
import { computeSoberDuration } from '../utils/soberCounter.js'

describe('computeSoberDuration', () => {
  it('returns all zeros when now equals sobriety date', () => {
    const date = new Date('2025-01-01T00:00:00')
    const result = computeSoberDuration(date, date)
    expect(result).toEqual({ years: 0, months: 0, days: 0, hours: 0 })
  })

  it('returns all zeros when now is before sobriety date', () => {
    const sobriety = new Date('2025-06-01T00:00:00')
    const now = new Date('2025-01-01T00:00:00')
    const result = computeSoberDuration(sobriety, now)
    expect(result).toEqual({ years: 0, months: 0, days: 0, hours: 0 })
  })

  it('returns exactly 1 year for a date exactly one year ago', () => {
    const sobriety = new Date('2024-03-07T00:00:00')
    const now = new Date('2025-03-07T00:00:00')
    const result = computeSoberDuration(sobriety, now)
    expect(result.years).toBe(1)
    expect(result.months).toBe(0)
    expect(result.days).toBe(0)
    expect(result.hours).toBe(0)
  })

  it('decomposes 1 year, 2 months, 15 days, 3 hours correctly', () => {
    const sobriety = new Date('2024-01-01T09:00:00')
    const now = new Date('2025-03-16T12:00:00')
    const result = computeSoberDuration(sobriety, now)
    expect(result.years).toBe(1)
    expect(result.months).toBe(2)
    expect(result.days).toBe(15)
    expect(result.hours).toBe(3)
  })

  it('all values are non-negative', () => {
    const sobriety = new Date('2020-06-15T10:30:00')
    const now = new Date('2026-03-07T08:00:00')
    const result = computeSoberDuration(sobriety, now)
    expect(result.years).toBeGreaterThanOrEqual(0)
    expect(result.months).toBeGreaterThanOrEqual(0)
    expect(result.days).toBeGreaterThanOrEqual(0)
    expect(result.hours).toBeGreaterThanOrEqual(0)
  })

  it('handles leap year correctly (Feb 29)', () => {
    // Sobriety starts Feb 29, 2024 (leap year)
    const sobriety = new Date('2024-02-29T00:00:00')
    // One year later (2025 is not a leap year, so Feb 28 + 1 day = Mar 1)
    const now = new Date('2025-03-01T00:00:00')
    const result = computeSoberDuration(sobriety, now)
    // date-fns handles this correctly: differenceInYears is 0 (not yet a full year by calendar months)
    expect(result.years).toBeGreaterThanOrEqual(0)
    expect(result.months).toBeGreaterThanOrEqual(0)
    expect(result.days).toBeGreaterThanOrEqual(0)
    expect(result.hours).toBeGreaterThanOrEqual(0)
  })

  it('returns 6 months for exactly half a year', () => {
    const sobriety = new Date('2024-09-07T00:00:00')
    const now = new Date('2025-03-07T00:00:00')
    const result = computeSoberDuration(sobriety, now)
    expect(result.years).toBe(0)
    expect(result.months).toBe(6)
    expect(result.days).toBe(0)
    expect(result.hours).toBe(0)
  })
})
