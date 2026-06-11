import { describe, it, expect } from 'vitest'
import { computeMilestoneProgress } from '../../utils/milestones.js'

describe('computeMilestoneProgress', () => {
  const sober = new Date('2024-01-01T00:00:00')

  it('targets the 60-day milestone six weeks in', () => {
    const result = computeMilestoneProgress(sober, new Date('2024-02-15T12:00:00'))
    expect(result.next.label).toBe('60 days')
    expect(result.daysRemaining).toBe(14)
    expect(result.totalDays).toBe(45)
    expect(result.progress).toBeGreaterThan(0.4)
    expect(result.progress).toBeLessThan(0.6)
  })

  it('targets 24 hours on day one', () => {
    const result = computeMilestoneProgress(sober, new Date('2024-01-01T06:00:00'))
    expect(result.next.label).toBe('24 hours')
    expect(result.totalDays).toBe(0)
    expect(result.progress).toBeCloseTo(0.25, 2)
  })

  it('targets yearly anniversaries after the first year', () => {
    const result = computeMilestoneProgress(
      new Date('2021-09-15T00:00:00'),
      new Date('2026-06-09T08:00:00')
    )
    expect(result.next.label).toBe('5 years')
    expect(result.daysRemaining).toBeGreaterThan(0)
    expect(result.totalDays).toBeGreaterThan(1700)
  })

  it('clamps progress to [0, 1]', () => {
    const result = computeMilestoneProgress(sober, new Date('2030-06-15T00:00:00'))
    expect(result.progress).toBeGreaterThanOrEqual(0)
    expect(result.progress).toBeLessThanOrEqual(1)
  })

  it('returns zeros when now is before the sobriety date', () => {
    const result = computeMilestoneProgress(sober, new Date('2023-12-01T00:00:00'))
    expect(result.totalDays).toBe(0)
    expect(result.next.label).toBe('24 hours')
  })
})
