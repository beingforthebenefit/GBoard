interface CacheEntry {
  photos: string[]
  fetchedAt: number
}

let cache: CacheEntry | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 60 minutes

interface PhotoDerivative {
  url?: string
  fileSize?: number
}

interface PhotoEntry {
  derivatives?: Record<string, PhotoDerivative>
}

interface SharedStreamResponse {
  photos?: PhotoEntry[]
}

export async function fetchPhotos(): Promise<string[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.photos
  }

  const albumUrl = process.env.ICLOUD_ALBUM_URL
  if (!albumUrl) throw new Error('Missing ICLOUD_ALBUM_URL env var')

  // Extract token from URLs like:
  //   https://www.icloud.com/sharedalbum/#B2cJ0DiRHGKfEzI
  //   https://www.icloud.com/photos/share/abc123
  const match = albumUrl.match(/[/#]([A-Za-z0-9_-]{10,})$/)
  if (!match) throw new Error(`Cannot parse iCloud album token from URL: ${albumUrl}`)
  const token = match[1]

  const photos = await fetchFromSharedStreams(token)

  cache = { photos, fetchedAt: Date.now() }
  return photos
}

async function fetchFromSharedStreams(token: string): Promise<string[]> {
  // Initial request — Apple may redirect via 330 to the right server
  const initialHost = 'p01-sharedstreams.icloud.com'
  const body = JSON.stringify({ streamCtag: null })
  const headers = { 'Content-Type': 'application/json' }

  let host = initialHost
  let data: SharedStreamResponse

  for (let attempt = 0; attempt < 2; attempt++) {
    const url = `https://${host}/${token}/sharedstreams/webstream`
    const res = await fetch(url, { method: 'POST', body, headers })

    if (res.status === 330) {
      // Apple redirects to a different server
      const redirectHost = res.headers.get('X-Apple-MMe-Host')
      if (!redirectHost) throw new Error('iCloud 330 redirect without X-Apple-MMe-Host header')
      host = redirectHost
      continue
    }

    if (!res.ok) throw new Error(`iCloud shared stream error: ${res.status}`)
    data = (await res.json()) as SharedStreamResponse
    return extractPhotoUrls(data)
  }

  throw new Error('Too many iCloud redirects')
}

function extractPhotoUrls(data: SharedStreamResponse): string[] {
  if (!data.photos) return []

  const urls: string[] = []
  for (const photo of data.photos) {
    if (!photo.derivatives) continue

    // Pick the largest derivative by numeric key value
    let bestUrl: string | null = null
    let bestSize = -1

    for (const [key, deriv] of Object.entries(photo.derivatives)) {
      const size = parseInt(key, 10)
      if (!isNaN(size) && size > bestSize && deriv.url) {
        bestSize = size
        bestUrl = deriv.url
      }
    }

    if (bestUrl) urls.push(bestUrl)
  }

  return urls
}

export function _resetCache() {
  cache = null
}
