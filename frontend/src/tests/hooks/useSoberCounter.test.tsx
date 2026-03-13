import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSoberCounter } from '../../hooks/useSoberCounter.js'

describe('useSoberCounter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns computed sober duration', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-13T12:00:00'))

    const { result } = renderHook(() => useSoberCounter('2025-01-01T00:00:00'))

    expect(result.current.years).toBe(1)
    expect(result.current.months).toBe(2)
    expect(result.current.days).toBe(12)
    expect(result.current.hours).toBe(12)
  })

  it('returns zeros for future sobriety date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-13T12:00:00'))

    const { result } = renderHook(() => useSoberCounter('2027-01-01T00:00:00'))

    expect(result.current.years).toBe(0)
    expect(result.current.months).toBe(0)
    expect(result.current.days).toBe(0)
    expect(result.current.hours).toBe(0)
  })
})
