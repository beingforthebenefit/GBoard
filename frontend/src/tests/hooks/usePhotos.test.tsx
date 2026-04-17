import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePhotos } from '../../hooks/usePhotos.js'

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('usePhotos', () => {
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

  it('fetches photos on mount', async () => {
    const photos = [
      { filename: 'photo1.jpg', dateTaken: '2024-01-01T00:00:00Z' },
      { filename: 'photo2.jpg' },
    ]
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ photos }),
    })

    const { result } = renderHook(() => usePhotos())
    expect(result.current.loading).toBe(true)

    await flushEffects()
    expect(result.current.loading).toBe(false)
    expect(result.current.photos).toEqual(photos)
    expect(result.current.error).toBeNull()
  })

  it('handles missing photos gracefully', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    const { result } = renderHook(() => usePhotos())
    await flushEffects()
    expect(result.current.photos).toEqual([])
  })

  it('sets error on fetch failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    const { result } = renderHook(() => usePhotos())
    await flushEffects()

    expect(result.current.error).toBe('Photos API error: 500')
  })

  it('sets error on network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network failed'))

    const { result } = renderHook(() => usePhotos())
    await flushEffects()

    expect(result.current.error).toBe('Network failed')
  })

  it('polls every 60 minutes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ photos: [] }),
    })

    renderHook(() => usePhotos())
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000)
    })
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cleans up on unmount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ photos: [] }),
    })

    const { unmount } = renderHook(() => usePhotos())
    await flushEffects()
    unmount()

    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
