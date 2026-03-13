import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWeather } from '../../hooks/useWeather.js'

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useWeather', () => {
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

  it('fetches weather data on mount', async () => {
    const weatherData = {
      current: { temp: 72, description: 'clear' },
      forecast: [],
    }
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => weatherData,
    })

    const { result } = renderHook(() => useWeather())
    expect(result.current.loading).toBe(true)

    await flushEffects()
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(weatherData)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useWeather())
    await flushEffects()

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Weather API error: 500')
    expect(result.current.data).toBeNull()
  })

  it('sets error on network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network failed'))

    const { result } = renderHook(() => useWeather())
    await flushEffects()

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Network failed')
  })

  it('polls on interval', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ current: { temp: 72 }, forecast: [] }),
    })

    renderHook(() => useWeather())
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000)
    })
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cleans up interval on unmount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ current: { temp: 72 }, forecast: [] }),
    })

    const { unmount } = renderHook(() => useWeather())
    await flushEffects()

    unmount()
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
