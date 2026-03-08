import { getImages } from 'icloud-shared-album'

interface CacheEntry {
  photos: string[]
  fetchedAt: number
}

let cache: CacheEntry | null = null
let inflight: Promise<string[]> | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 60 minutes

export async function fetchPhotos(): Promise<string[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.photos
  }

  // Deduplicate concurrent requests — only one iCloud API call at a time
  if (inflight) return inflight

  inflight = doFetch().finally(() => {
    inflight = null
  })
  return inflight
}

async function doFetch(): Promise<string[]> {
  const albumUrl = process.env.ICLOUD_ALBUM_URL
  if (!albumUrl) throw new Error('Missing ICLOUD_ALBUM_URL env var')

  // Extract token from URLs like:
  //   https://www.icloud.com/sharedalbum/#B2cJ0DiRHGKfEzI
  //   https://www.icloud.com/photos/share/abc123
  const match = albumUrl.match(/[/#]([A-Za-z0-9_-]{10,})$/)
  if (!match) throw new Error(`Cannot parse iCloud album token from URL: ${albumUrl}`)
  const token = match[1]

  const result = await getImages(token)
  const urls = result.photos.flatMap((photo) => {
    // Pick the largest derivative (highest height) that has a URL
    const derivatives = Object.values(
      photo.derivatives as Record<string, { height: number; url?: string }>
    )
    let bestUrl: string | undefined
    let bestHeight = -1
    for (const d of derivatives) {
      if (d.url && d.height > bestHeight) {
        bestHeight = d.height
        bestUrl = d.url
      }
    }
    return bestUrl ? [bestUrl] : []
  })

  cache = { photos: urls, fetchedAt: Date.now() }
  return urls
}

export function _resetCache() {
  cache = null
}
