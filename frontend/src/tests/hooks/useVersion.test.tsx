import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVersion } from '../../hooks/useVersion.js'

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useVersion', () => {
  const fetchMock = vi.fn()
  const reloadMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    fetchMock.mockReset()
    reloadMock.mockReset()
  })

  it('records baseline startedAt on first fetch', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ startedAt: 1000 }),
    })

    renderHook(() => useVersion())
    await flushEffects()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('reloads page when startedAt changes', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ startedAt: 1000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ startedAt: 2000 }),
      })

    renderHook(() => useVersion())
    await flushEffects()

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })
    await flushEffects()

    expect(reloadMock).toHaveBeenCalled()
  })

  it('does not reload when startedAt is unchanged', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ startedAt: 1000 }),
    })

    renderHook(() => useVersion())
    await flushEffects()

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })
    await flushEffects()

    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('ignores network errors gracefully', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'))

    renderHook(() => useVersion())
    await flushEffects()

    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('ignores non-ok responses', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    renderHook(() => useVersion())
    await flushEffects()

    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('cleans up interval on unmount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ startedAt: 1000 }),
    })

    const { unmount } = renderHook(() => useVersion())
    await flushEffects()
    unmount()

    act(() => {
      vi.advanceTimersByTime(10 * 1000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
