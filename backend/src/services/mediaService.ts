const SONARR_URL = () => process.env.SONARR_URL || ''
const SONARR_API_KEY = () => process.env.SONARR_API_KEY || ''
const RADARR_URL = () => process.env.RADARR_URL || ''
const RADARR_API_KEY = () => process.env.RADARR_API_KEY || ''

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export interface UpcomingItem {
  title: string
  type: 'episode' | 'movie'
  date: string // ISO date string (date only, no time)
  subtitle: string // e.g. "S02E05" or year
}

interface SonarrEpisode {
  seriesTitle?: string
  series?: { title?: string }
  title?: string
  seasonNumber?: number
  episodeNumber?: number
  airDateUtc?: string
  airDate?: string
}

interface RadarrMovie {
  title?: string
  year?: number
  digitalRelease?: string
  physicalRelease?: string
  inCinemas?: string
}

let cache: { items: UpcomingItem[]; fetchedAt: number } | null = null

export function _resetCache() {
  cache = null
}

function toDateString(iso: string): string {
  return iso.slice(0, 10)
}

async function fetchSonarr(startDate: string, endDate: string): Promise<UpcomingItem[]> {
  const url = SONARR_URL()
  const key = SONARR_API_KEY()
  if (!url || !key) return []

  const res = await fetch(
    `${url}/api/v3/calendar?start=${startDate}&end=${endDate}&includeSeries=true`,
    { headers: { 'X-Api-Key': key } }
  )
  if (!res.ok) throw new Error(`Sonarr API error: ${res.status}`)
  const episodes = (await res.json()) as SonarrEpisode[]

  return episodes.map((ep) => {
    const seriesTitle = ep.seriesTitle || ep.series?.title || 'Unknown Series'
    const season = ep.seasonNumber ?? 0
    const episode = ep.episodeNumber ?? 0
    const code = `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
    const date = ep.airDate || (ep.airDateUtc ? toDateString(ep.airDateUtc) : '')

    return {
      title: seriesTitle,
      type: 'episode' as const,
      date,
      subtitle: code,
    }
  })
}

async function fetchRadarr(startDate: string, endDate: string): Promise<UpcomingItem[]> {
  const url = RADARR_URL()
  const key = RADARR_API_KEY()
  if (!url || !key) return []

  const res = await fetch(`${url}/api/v3/calendar?start=${startDate}&end=${endDate}`, {
    headers: { 'X-Api-Key': key },
  })
  if (!res.ok) throw new Error(`Radarr API error: ${res.status}`)
  const movies = (await res.json()) as RadarrMovie[]

  return movies.map((movie) => {
    const releaseDate = movie.digitalRelease || movie.physicalRelease || movie.inCinemas || ''
    const date = releaseDate ? toDateString(releaseDate) : ''

    return {
      title: movie.title || 'Unknown Movie',
      type: 'movie' as const,
      date,
      subtitle: movie.year ? String(movie.year) : '',
    }
  })
}

export async function fetchUpcomingMedia(): Promise<UpcomingItem[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.items
  }

  const now = new Date()
  const startDate = now.toISOString().slice(0, 10)
  const end = new Date(now)
  end.setDate(end.getDate() + 3)
  const endDate = end.toISOString().slice(0, 10)

  const [episodes, movies] = await Promise.all([
    fetchSonarr(startDate, endDate).catch((err) => {
      console.error('[media] Sonarr fetch failed:', err.message)
      return [] as UpcomingItem[]
    }),
    fetchRadarr(startDate, endDate).catch((err) => {
      console.error('[media] Radarr fetch failed:', err.message)
      return [] as UpcomingItem[]
    }),
  ])

  const items = [...episodes, ...movies]
    .filter((item) => item.date >= startDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  cache = { items, fetchedAt: Date.now() }
  return items
}
