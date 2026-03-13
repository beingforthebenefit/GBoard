import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMedia } from '../../hooks/useMedia.js'

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useMedia', () => {
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

  it('fetches media items and totalItems on mount', async () => {
    const items = [{ title: 'Show', type: 'episode', date: '2026-03-13', subtitle: 'S01E01' }]
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items, totalItems: 5 }),
    })

    const { result } = renderHook(() => useMedia())
    expect(result.current.loading).toBe(true)

    await flushEffects()
    expect(result.current.loading).toBe(false)
    expect(result.current.items).toEqual(items)
    expect(result.current.totalItems).toBe(5)
  })

  it('silently handles fetch failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    const { result } = renderHook(() => useMedia())
    await flushEffects()

    expect(result.current.loading).toBe(false)
    expect(result.current.items).toEqual([])
    expect(result.current.totalItems).toBe(0)
  })

  it('silently handles network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network failed'))

    const { result } = renderHook(() => useMedia())
    await flushEffects()

    expect(result.current.loading).toBe(false)
    expect(result.current.items).toEqual([])
    expect(result.current.totalItems).toBe(0)
  })

  it('falls back to items.length when totalItems missing', async () => {
    const items = [{ title: 'Show', type: 'episode', date: '2026-03-13', subtitle: 'S01E01' }]
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items }),
    })

    const { result } = renderHook(() => useMedia())
    await flushEffects()

    expect(result.current.totalItems).toBe(1)
  })

  it('polls every 30 minutes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], totalItems: 0 }),
    })

    renderHook(() => useMedia())
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000)
    })
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cleans up on unmount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], totalItems: 0 }),
    })

    const { unmount } = renderHook(() => useMedia())
    await flushEffects()
    unmount()

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
