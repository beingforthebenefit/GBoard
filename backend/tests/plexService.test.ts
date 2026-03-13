import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  mapMetadata,
  mapMetadataList,
  fetchPlexSessions,
  fetchPlexSession,
} from '../src/services/plexService.js'

const baseUser = { title: 'Gerald', thumb: 'https://plex.tv/avatar.jpg' }
const basePlayer = { state: 'playing' }

describe('mapMetadata', () => {
  it('returns null-equivalent session when size is 0', () => {
    // fetchPlexSession returns null when size === 0; mapMetadata is called per-item
    // so we just verify the mapper doesn't crash on minimal data
    const result = mapMetadata({
      type: 'movie',
      title: 'Test',
      duration: 0,
      viewOffset: 0,
      Player: basePlayer,
      User: baseUser,
    })
    expect(result).not.toBeNull()
  })

  it('maps episode metadata correctly', () => {
    const result = mapMetadata({
      type: 'episode',
      title: 'Seven Thirty-Seven',
      grandparentTitle: 'Breaking Bad',
      parentIndex: 2,
      index: 3,
      thumb: '/library/metadata/123/thumb',
      duration: 2700000,
      viewOffset: 600000,
      Player: basePlayer,
      User: baseUser,
    })

    expect(result.type).toBe('episode')
    expect(result.title).toBe('Breaking Bad')
    expect(result.subtitle).toBe('S02E03 – Seven Thirty-Seven')
    expect(result.thumbPath).toBe('/library/metadata/123/thumb')
    expect(result.userName).toBe('Gerald')
    expect(result.duration).toBe(2700000)
    expect(result.viewOffset).toBe(600000)
    expect(result.playerState).toBe('playing')
  })

  it('maps movie metadata correctly', () => {
    const result = mapMetadata({
      type: 'movie',
      title: 'Inception',
      parentTitle: '2010',
      duration: 8880000,
      viewOffset: 1000000,
      Player: { state: 'paused' },
      User: baseUser,
    })

    expect(result.type).toBe('movie')
    expect(result.title).toBe('Inception')
    expect(result.subtitle).toBe('2010')
    expect(result.playerState).toBe('paused')
  })

  it('maps track metadata correctly', () => {
    const result = mapMetadata({
      type: 'track',
      title: 'Bohemian Rhapsody',
      grandparentTitle: 'Queen',
      parentTitle: 'A Night at the Opera',
      duration: 354000,
      viewOffset: 60000,
      Player: { state: 'playing' },
      User: baseUser,
    })

    expect(result.type).toBe('track')
    expect(result.title).toBe('Bohemian Rhapsody')
    expect(result.subtitle).toBe('Queen – A Night at the Opera')
  })

  it('handles missing optional fields gracefully', () => {
    const result = mapMetadata({
      type: 'episode',
      title: 'Pilot',
    })

    expect(result.title).toBe('Pilot') // falls back to episode title when no grandparentTitle
    expect(result.userName).toBe('Unknown')
    expect(result.thumbPath).toBeNull()
    expect(result.playerState).toBe('playing')
  })

  it('handles buffering player state', () => {
    const result = mapMetadata({
      type: 'movie',
      title: 'Test',
      Player: { state: 'buffering' },
      User: baseUser,
    })
    expect(result.playerState).toBe('buffering')
  })

  it('pads single-digit season and episode numbers', () => {
    const result = mapMetadata({
      type: 'episode',
      title: 'Pilot',
      grandparentTitle: 'Lost',
      parentIndex: 1,
      index: 1,
    })
    expect(result.subtitle).toBe('S01E01 – Pilot')
  })

  it('maps multiple active sessions in order', () => {
    const sessions = mapMetadataList([
      {
        type: 'movie',
        title: 'Movie One',
        Player: { state: 'playing' },
        User: { title: 'A' },
      },
      {
        type: 'episode',
        title: 'Pilot',
        grandparentTitle: 'Lost',
        parentIndex: 1,
        index: 1,
        Player: { state: 'paused' },
        User: { title: 'B' },
      },
    ])

    expect(sessions).toHaveLength(2)
    expect(sessions[0].title).toBe('Movie One')
    expect(sessions[0].userName).toBe('A')
    expect(sessions[1].title).toBe('Lost')
    expect(sessions[1].playerState).toBe('paused')
  })
})

describe('fetchPlexSessions', () => {
  beforeEach(() => {
    vi.stubEnv('PLEX_URL', 'http://plex.local:32400')
    vi.stubEnv('PLEX_TOKEN', 'test-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('throws when PLEX_URL is missing', async () => {
    vi.stubEnv('PLEX_URL', '')
    await expect(fetchPlexSessions()).rejects.toThrow('Missing PLEX_URL or PLEX_TOKEN env vars')
  })

  it('throws when PLEX_TOKEN is missing', async () => {
    vi.stubEnv('PLEX_TOKEN', '')
    await expect(fetchPlexSessions()).rejects.toThrow('Missing PLEX_URL or PLEX_TOKEN env vars')
  })

  it('returns sessions on successful fetch', async () => {
    const mockResponse = {
      MediaContainer: {
        size: 1,
        Metadata: [
          {
            type: 'movie',
            title: 'Inception',
            duration: 8880000,
            viewOffset: 1000000,
            Player: { state: 'playing' },
            User: { title: 'Gerald', thumb: 'https://plex.tv/avatar.jpg' },
          },
        ],
      },
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    )

    const sessions = await fetchPlexSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].title).toBe('Inception')
    expect(sessions[0].type).toBe('movie')
    expect(sessions[0].userName).toBe('Gerald')
  })

  it('returns empty array when size is 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ MediaContainer: { size: 0 } }),
      })
    )

    const sessions = await fetchPlexSessions()
    expect(sessions).toEqual([])
  })

  it('returns empty array on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error'))
    )

    const sessions = await fetchPlexSessions()
    expect(sessions).toEqual([])
  })

  it('returns empty array on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    )

    const sessions = await fetchPlexSessions()
    expect(sessions).toEqual([])
  })
})

describe('fetchPlexSession', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns the first session or null', async () => {
    vi.stubEnv('PLEX_URL', 'http://plex.local:32400')
    vi.stubEnv('PLEX_TOKEN', 'test-token')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            MediaContainer: {
              size: 1,
              Metadata: [
                {
                  type: 'movie',
                  title: 'Test Movie',
                  Player: { state: 'playing' },
                  User: { title: 'User1' },
                },
              ],
            },
          }),
      })
    )

    const session = await fetchPlexSession()
    expect(session).not.toBeNull()
    expect(session!.title).toBe('Test Movie')
  })

  it('returns null when no sessions', async () => {
    vi.stubEnv('PLEX_URL', 'http://plex.local:32400')
    vi.stubEnv('PLEX_TOKEN', 'test-token')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ MediaContainer: { size: 0 } }),
      })
    )

    const session = await fetchPlexSession()
    expect(session).toBeNull()
  })
})
