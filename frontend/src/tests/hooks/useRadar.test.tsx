import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRadar } from '../../hooks/useRadar.js'

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useRadar', () => {
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

  it('fetches radar data on mount', async () => {
    const radarData = {
      zoom: 6,
      centerX: 10,
      centerY: 25,
      locX: 0.5,
      locY: 0.5,
      host: 'https://tilecache.rainviewer.com',
      radarPath: '/v2/radar/1234',
    }
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => radarData,
    })

    const { result } = renderHook(() => useRadar())
    expect(result.current.loading).toBe(true)

    await flushEffects()
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(radarData)
  })

  it('silently handles fetch failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    const { result } = renderHook(() => useRadar())
    await flushEffects()

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('silently handles network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network failed'))

    const { result } = renderHook(() => useRadar())
    await flushEffects()

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('polls every 5 minutes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ zoom: 6, centerX: 10, centerY: 25, locX: 0.5, locY: 0.5, host: '', radarPath: '' }),
    })

    renderHook(() => useRadar())
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000)
    })
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cleans up on unmount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ zoom: 6, centerX: 10, centerY: 25, locX: 0.5, locY: 0.5, host: '', radarPath: '' }),
    })

    const { unmount } = renderHook(() => useRadar())
    await flushEffects()
    unmount()

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
