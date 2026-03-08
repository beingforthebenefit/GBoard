import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlex } from '../../hooks/usePlex.js'
import { PlexSession } from '../../types/index.js'

function makeSession(overrides: Partial<PlexSession> = {}): PlexSession {
  return {
    title: 'Test Show',
    type: 'episode',
    subtitle: 'S01E01',
    thumbPath: null,
    userName: 'Gerald',
    userAvatar: null,
    viewOffset: 10000,
    duration: 60000,
    playerState: 'playing',
    ...overrides,
  }
}

function okResponse(session: PlexSession | null): Response {
  return {
    ok: true,
    json: async () => ({ session }),
  } as Response
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('usePlex', () => {
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

  it('increments playback progress between polls while playing', async () => {
    fetchMock.mockResolvedValue(okResponse(makeSession({ viewOffset: 10000, duration: 60000 })))

    const { result } = renderHook(() => usePlex())

    await flushEffects()
    expect(result.current.loading).toBe(false)
    expect(result.current.session?.viewOffset).toBe(10000)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.session?.viewOffset).toBe(15000)
  })

  it('does not increment progress when paused', async () => {
    fetchMock.mockResolvedValue(okResponse(makeSession({ playerState: 'paused', viewOffset: 22000 })))

    const { result } = renderHook(() => usePlex())

    await flushEffects()
    expect(result.current.loading).toBe(false)
    expect(result.current.session?.viewOffset).toBe(22000)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.session?.viewOffset).toBe(22000)
  })

  it('re-synchronizes on the next poll and stops incrementing when state changes to paused', async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse(makeSession({ playerState: 'playing', viewOffset: 12000 })))
      .mockResolvedValueOnce(okResponse(makeSession({ playerState: 'paused', viewOffset: 18000 })))

    const { result } = renderHook(() => usePlex())

    await flushEffects()
    expect(result.current.loading).toBe(false)

    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(result.current.session?.viewOffset).toBe(22000)

    act(() => {
      vi.advanceTimersByTime(20000)
    })
    await flushEffects()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.session?.playerState).toBe('paused')
    expect(result.current.session?.viewOffset).toBe(18000)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.session?.viewOffset).toBe(18000)
  })
})
