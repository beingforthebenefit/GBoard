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
  it('returns empty result when no URLs configured', async () => {
    vi.stubEnv('SONARR_URL', '')
    vi.stubEnv('SONARR_API_KEY', '')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    const result = await fetchUpcomingMedia()
    expect(result.items).toEqual([])
    expect(result.totalItems).toBe(0)
    expect(result.lastDayRemaining).toBe(0)
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

    const result = await fetchUpcomingMedia()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual({
      title: 'Breaking Bad',
      type: 'episode',
      date: today,
      subtitle: 'S02E05',
    })
    expect(result.totalItems).toBe(1)
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

    const result = await fetchUpcomingMedia()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual({
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

    const result = await fetchUpcomingMedia()
    expect(result.items).toHaveLength(2)
    expect(result.items[0].title).toBe('Movie A')
    expect(result.items[1].title).toBe('Show B')
    expect(result.totalItems).toBe(2)
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

    const result = await fetchUpcomingMedia()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Movie')
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

    const result = await fetchUpcomingMedia()
    expect(result.items[0].title).toBe('Nested Title')
  })

  it('truncates to MAX_ITEMS and reports totalItems', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'key')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    const episodes = Array.from({ length: 15 }, (_, i) => ({
      seriesTitle: `Show ${i}`,
      seasonNumber: 1,
      episodeNumber: i + 1,
      airDate: dateOffset(i),
    }))

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(episodes),
    })

    const result = await fetchUpcomingMedia()
    expect(result.items).toHaveLength(10)
    expect(result.totalItems).toBe(14) // 14 days window
    expect(result.items[0].title).toBe('Show 0')
    expect(result.items[9].title).toBe('Show 9')
    // Each show is on a different day, so the last day has no truncated items
    expect(result.lastDayRemaining).toBe(0)
  })

  it('reports lastDayRemaining when last displayed day is truncated', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'key')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    // 3 shows today, 12 shows tomorrow — only 7 of tomorrow's fit in MAX_ITEMS (10)
    const episodes = [
      ...Array.from({ length: 3 }, (_, i) => ({
        seriesTitle: `Today ${i}`,
        seasonNumber: 1,
        episodeNumber: i + 1,
        airDate: today,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        seriesTitle: `Tomorrow ${i}`,
        seasonNumber: 1,
        episodeNumber: i + 1,
        airDate: tomorrow,
      })),
    ]

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(episodes),
    })

    const result = await fetchUpcomingMedia()
    expect(result.items).toHaveLength(10)
    expect(result.totalItems).toBe(15)
    // 12 tomorrow items total, 7 shown (10 - 3 today) = 5 remaining
    expect(result.lastDayRemaining).toBe(5)
  })

  it('filters out items beyond the date window', async () => {
    vi.stubEnv('SONARR_URL', 'http://sonarr.test')
    vi.stubEnv('SONARR_API_KEY', 'key')
    vi.stubEnv('RADARR_URL', '')
    vi.stubEnv('RADARR_API_KEY', '')

    const beyondWindow = dateOffset(15)

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { seriesTitle: 'In Range', seasonNumber: 1, episodeNumber: 1, airDate: today },
          {
            seriesTitle: 'Out of Range',
            seasonNumber: 1,
            episodeNumber: 2,
            airDate: beyondWindow,
          },
        ]),
    })

    const result = await fetchUpcomingMedia()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('In Range')
  })
})
