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
  /** Location position within the 3x3 grid as 0–1 fractions */
  locX: number
  locY: number
  host: string
  radarPath: string
  hasPrecipitation: boolean
  /** Number of past frames available for animation (index 0 = oldest, frameCount-1 = latest) */
  frameCount: number
}

interface RadarCache {
  data: RadarData
  framePaths: string[]
  fetchedAt: number
}

let radarCache: RadarCache | null = null
const CACHE_TTL = 5 * 60 * 1000
const FRAME_COUNT = 6

export function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

export async function getRadarData(): Promise<RadarData> {
  if (radarCache && Date.now() - radarCache.fetchedAt < CACHE_TTL) {
    return radarCache.data
  }

  const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
  if (!res.ok) throw new Error(`RainViewer API error: ${res.status}`)
  const rv = (await res.json()) as RainViewerResponse

  const { host, radar } = rv
  const pastFrames = radar.past.slice(-FRAME_COUNT)
  const latest = pastFrames[pastFrames.length - 1]

  const lat = parseFloat(process.env.WEATHER_LAT || '0')
  const lon = parseFloat(process.env.WEATHER_LON || '0')
  const zoom = 6
  const GRID = 3
  const offset = Math.floor(GRID / 2)
  const { x, y } = latLonToTile(lat, lon, zoom)

  // Fractional tile position for accurate marker placement
  const n = Math.pow(2, zoom)
  const fracTileX = ((lon + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const fracTileY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  const locX = (fracTileX - (x - offset)) / GRID
  const locY = (fracTileY - (y - offset)) / GRID

  // Check all 9 overlay tiles for precipitation, not just center — a storm
  // passing nearby may be on a neighboring tile. Fully transparent 256x256 PNGs
  // compress to ~200-400 bytes; tiles with even light precipitation exceed 600.
  const PRECIP_THRESHOLD = 600
  let hasPrecipitation = false
  try {
    const tileCoords: { tx: number; ty: number }[] = []
    for (let dy = -offset; dy <= offset; dy++) {
      for (let dx = -offset; dx <= offset; dx++) {
        tileCoords.push({ tx: x + dx, ty: y + dy })
      }
    }
    const sizes = await Promise.all(
      tileCoords.map(async ({ tx, ty }) => {
        try {
          const url = `${host}${latest.path}/256/${zoom}/${tx}/${ty}/6/0_1.png`
          const { buffer } = await proxyTile(url)
          return buffer.length
        } catch {
          return 0
        }
      })
    )
    hasPrecipitation = sizes.some((size) => size > PRECIP_THRESHOLD)
  } catch {
    // If tile fetch fails, assume precipitation (show radar as fallback)
    hasPrecipitation = true
  }

  const data: RadarData = {
    zoom,
    centerX: x,
    centerY: y,
    locX,
    locY,
    host,
    radarPath: latest.path,
    hasPrecipitation,
    frameCount: pastFrames.length,
  }

  radarCache = { data, framePaths: pastFrames.map((f) => f.path), fetchedAt: Date.now() }
  return data
}

export function getFramePath(frameIdx: number): string | null {
  if (!radarCache) return null
  const { framePaths } = radarCache
  if (frameIdx < 0 || frameIdx >= framePaths.length) return null
  return framePaths[frameIdx]
}

export async function proxyTile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Tile fetch error: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, contentType: res.headers.get('content-type') || 'image/png' }
}

// Export for testing
export function _resetCache() {
  radarCache = null
}
