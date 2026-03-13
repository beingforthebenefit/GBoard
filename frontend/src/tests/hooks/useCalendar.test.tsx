import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCalendar } from '../../hooks/useCalendar.js'

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useCalendar', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    fetchMock.mockReset()
  })

  it('fetches events on mount', async () => {
    const events = [
      {
        id: '1',
        title: 'Meeting',
        start: '2026-03-13T10:00:00Z',
        end: '2026-03-13T11:00:00Z',
        allDay: false,
      },
    ]
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ events }),
    })

    const { result } = renderHook(() => useCalendar())
    expect(result.current.loading).toBe(true)

    await flushEffects()
    expect(result.current.loading).toBe(false)
    expect(result.current.events).toEqual(events)
    expect(result.current.error).toBeNull()
  })

  it('handles missing events gracefully', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useCalendar())
    await flushEffects()
    expect(result.current.events).toEqual([])
  })

  it('sets error on fetch failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    const { result } = renderHook(() => useCalendar())
    await flushEffects()

    expect(result.current.error).toBe('Calendar API error: 500')
  })

  it('sets error on network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network failed'))

    const { result } = renderHook(() => useCalendar())
    await flushEffects()

    expect(result.current.error).toBe('Network failed')
  })

  it('polls every 15 minutes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ events: [] }),
    })

    renderHook(() => useCalendar())
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000)
    })
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cleans up on unmount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ events: [] }),
    })

    const { unmount } = renderHook(() => useCalendar())
    await flushEffects()
    unmount()

    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
