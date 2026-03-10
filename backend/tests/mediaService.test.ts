import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchUpcomingMedia, _resetCache } from '../src/services/mediaService.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const today = dateOffset(0)
const tomorrow = dateOffset(1)

beforeEach(() => {
  mockFetch.mockReset()
  _resetCache()
})

describe('fetchUpcomingMedia', () => {
  it('returns empty array when no URLs configured', async () => {
    vi.stubEnv('SONARR_URL', '')
    vi.stubEnv('SONARR_API_KEY', '')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    const items = await fetchUpcomingMedia()
    expect(items).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches episodes from Sonarr', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'test-key')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            seriesTitle: 'Breaking Bad',
            seasonNumber: 2,
            episodeNumber: 5,
            airDate: today,
          },
        ]),
    })

    const items = await fetchUpcomingMedia()
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      title: 'Breaking Bad',
      type: 'episode',
      date: today,
      subtitle: 'S02E05',
    })
  })

  it('fetches movies from Radarr', async () => {
    vi.stubEnv('SONARR_URL', '')
    vi.stubEnv('SONARR_API_KEY', '')
    vi.stubEnv('RADARR_URL', 'http://radarr.test')
    vi.stubEnv('RADARR_API_KEY', 'test-key')

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            title: 'Dune 3',
            year: 2026,
            digitalRelease: `${tomorrow}T00:00:00Z`,
          },
        ]),
    })

    const items = await fetchUpcomingMedia()
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      title: 'Dune 3',
      type: 'movie',
      date: tomorrow,
      subtitle: '2026',
    })
  })

  it('merges and sorts results by date', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'key')
    vi.stubEnv('RADARR_URL', 'http://radarr.test')
    vi.stubEnv('RADARR_API_KEY', 'key')

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('sonarr')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { seriesTitle: 'Show B', seasonNumber: 1, episodeNumber: 3, airDate: tomorrow },
            ]),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([{ title: 'Movie A', year: 2026, digitalRelease: `${today}T00:00:00Z` }]),
      })
    })

    const items = await fetchUpcomingMedia()
    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('Movie A')
    expect(items[1].title).toBe('Show B')
  })

  it('uses cache on subsequent calls', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'key')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await fetchUpcomingMedia()
    await fetchUpcomingMedia()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('handles Sonarr failure gracefully', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'key')
    vi.stubEnv('RADARR_URL', 'http://radarr.test')
    vi.stubEnv('RADARR_API_KEY', 'key')

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('sonarr')) {
        return Promise.resolve({ ok: false, status: 500 })
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([{ title: 'Movie', year: 2026, digitalRelease: `${today}T00:00:00Z` }]),
      })
    })

    const items = await fetchUpcomingMedia()
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Movie')
  })

  it('prefers series.title over seriesTitle', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'key')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            series: { title: 'Nested Title' },
            seasonNumber: 1,
            episodeNumber: 1,
            airDate: today,
          },
        ]),
    })

    const items = await fetchUpcomingMedia()
    expect(items[0].title).toBe('Nested Title')
  })

  it('filters out items beyond the date window', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'key')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    const dayAfterTomorrow = dateOffset(2)

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { seriesTitle: 'In Range', seasonNumber: 1, episodeNumber: 1, airDate: today },
          {
            seriesTitle: 'Out of Range',
            seasonNumber: 1,
            episodeNumber: 2,
            airDate: dayAfterTomorrow,
          },
        ]),
    })

    const items = await fetchUpcomingMedia()
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('In Range')
  })
})
