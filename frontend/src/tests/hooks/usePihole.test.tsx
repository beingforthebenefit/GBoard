import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePihole } from '../../hooks/usePihole.js'

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('usePihole', () => {
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

  it('fetches and normalizes pihole data on mount', async () => {
    const apiResponse = {
      totalQueries: 1000,
      blockedQueries: 200,
      blockedPercentage: 20,
      domainsOnBlocklist: 50000,
      status: 'enabled',
      blockedLastHour: 10,
      queriesLastHour: 50,
      clients: [
        {
          name: 'iPhone',
          ip: '192.168.1.10',
          queries: 100,
          blockedQueries: 5,
          blockedPercentage: 5,
        },
      ],
    }
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => apiResponse,
    })

    const { result } = renderHook(() => usePihole())
    expect(result.current.loading).toBe(true)

    await flushEffects()
    expect(result.current.loading).toBe(false)
    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.totalQueries).toBe(1000)
    expect(result.current.data!.clients).toHaveLength(1)
    expect(result.current.data!.clients[0].name).toBe('iPhone')
    expect(result.current.error).toBeNull()
  })

  it('normalizes clients with missing fields', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        totalQueries: 100,
        blockedQueries: 10,
        blockedPercentage: 10,
        domainsOnBlocklist: 1000,
        status: 'enabled',
        blockedLastHour: 1,
        queriesLastHour: 5,
        clients: [{ ip: '192.168.1.5' }],
      }),
    })

    const { result } = renderHook(() => usePihole())
    await flushEffects()

    expect(result.current.data!.clients[0]).toEqual({
      name: '',
      ip: '192.168.1.5',
      queries: 0,
      blockedQueries: 0,
      blockedPercentage: 0,
    })
  })

  it('handles non-array clients', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        totalQueries: 100,
        blockedQueries: 10,
        blockedPercentage: 10,
        domainsOnBlocklist: 1000,
        status: 'enabled',
        blockedLastHour: 1,
        queriesLastHour: 5,
        clients: null,
      }),
    })

    const { result } = renderHook(() => usePihole())
    await flushEffects()

    expect(result.current.data!.clients).toEqual([])
  })

  it('sets error on fetch failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    const { result } = renderHook(() => usePihole())
    await flushEffects()

    expect(result.current.error).toBe('Pi-hole API error: 500')
  })

  it('sets error on network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network failed'))

    const { result } = renderHook(() => usePihole())
    await flushEffects()

    expect(result.current.error).toBe('Network failed')
  })

  it('polls every 1 minute', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        totalQueries: 100,
        blockedQueries: 10,
        blockedPercentage: 10,
        domainsOnBlocklist: 1000,
        status: 'enabled',
        blockedLastHour: 1,
        queriesLastHour: 5,
        clients: [],
      }),
    })

    renderHook(() => usePihole())
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(60 * 1000)
    })
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cleans up on unmount', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        totalQueries: 100,
        blockedQueries: 10,
        blockedPercentage: 10,
        domainsOnBlocklist: 1000,
        status: 'enabled',
        blockedLastHour: 1,
        queriesLastHour: 5,
        clients: [],
      }),
    })

    const { unmount } = renderHook(() => usePihole())
    await flushEffects()
    unmount()

    act(() => {
      vi.advanceTimersByTime(60 * 1000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
