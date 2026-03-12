interface RainViewerResponse {
  host: string
  radar: {
    past: { time: number; path: string }[]
    nowcast: { time: number; path: string }[]
  }
}

export interface RadarData {
  zoom: number
  centerX: number
  centerY: number
  host: string
  radarPath: string
}

let rvCache: { data: RainViewerResponse; fetchedAt: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

export async function getRadarData(): Promise<RadarData> {
  if (!rvCache || Date.now() - rvCache.fetchedAt > CACHE_TTL) {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
    if (!res.ok) throw new Error(`RainViewer API error: ${res.status}`)
    rvCache = { data: (await res.json()) as RainViewerResponse, fetchedAt: Date.now() }
  }

  const { host, radar } = rvCache.data
  const latest = radar.past[radar.past.length - 1]

  const lat = parseFloat(process.env.WEATHER_LAT || '0')
  const lon = parseFloat(process.env.WEATHER_LON || '0')
  const zoom = 8
  const { x, y } = latLonToTile(lat, lon, zoom)

  return { zoom, centerX: x, centerY: y, host, radarPath: latest.path }
}

export async function proxyTile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Tile fetch error: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, contentType: res.headers.get('content-type') || 'image/png' }
}

// Export for testing
export function _resetCache() {
  rvCache = null
}
