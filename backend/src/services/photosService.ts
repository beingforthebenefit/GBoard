import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { getImages } from 'icloud-shared-album'

const SYNC_INTERVAL_MS = 60 * 60 * 1000 // re-sync with iCloud every 60 min

function cacheDir(): string {
  return process.env.PHOTOS_CACHE_DIR || '/data/photos'
}

function manifestFile(): string {
  return path.join(cacheDir(), 'manifest.json')
}
const DOWNLOAD_CONCURRENCY = 5

interface ManifestEntry {
  hash: string
  filename: string
}

interface Manifest {
  photos: ManifestEntry[]
  syncedAt: number
}

// In-memory state
let cachedUrls: string[] | null = null
let syncing: Promise<string[]> | null = null
let syncTimer: ReturnType<typeof setInterval> | null = null

/** Stable hash from iCloud CDN URL path (query params change on each API call) */
function urlHash(url: string): string {
  const parsed = new URL(url)
  return crypto.createHash('sha256').update(parsed.pathname).digest('hex').slice(0, 16)
}

function localUrl(filename: string): string {
  return `/api/photos/image/${filename}`
}

// --- Manifest I/O ---

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(cacheDir(), { recursive: true })
}

async function loadManifest(): Promise<Manifest | null> {
  try {
    const data = await fs.readFile(manifestFile(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function saveManifest(manifest: Manifest): Promise<void> {
  await fs.writeFile(manifestFile(), JSON.stringify(manifest, null, 2))
}

// --- Photo downloading ---

async function downloadPhoto(url: string, filepath: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    await fs.writeFile(filepath, buffer)
    return true
  } catch {
    return false
  }
}

/** Download photos in batches with limited concurrency */
async function downloadBatch(
  items: { url: string; hash: string; filename: string }[]
): Promise<ManifestEntry[]> {
  const results: ManifestEntry[] = []

  for (let i = 0; i < items.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = items.slice(i, i + DOWNLOAD_CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map(async (item) => {
        const filepath = path.join(cacheDir(), item.filename)
        const ok = await downloadPhoto(item.url, filepath)
        if (ok) results.push({ hash: item.hash, filename: item.filename })
      })
    )
    // Log any failures
    for (const r of settled) {
      if (r.status === 'rejected') {
        console.error('[photos] download failed:', r.reason)
      }
    }
  }

  return results
}

// --- iCloud API ---

function extractToken(): string {
  const albumUrl = process.env.ICLOUD_ALBUM_URL
  if (!albumUrl) throw new Error('Missing ICLOUD_ALBUM_URL env var')
  const match = albumUrl.match(/[/#]([A-Za-z0-9_-]{10,})$/)
  if (!match) throw new Error(`Cannot parse iCloud album token from URL: ${albumUrl}`)
  return match[1]
}

function extractCdnUrls(
  photos: { derivatives: Record<string, { height: number; url?: string }> }[]
): string[] {
  return photos.flatMap((photo) => {
    const derivatives = Object.values(photo.derivatives)
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
}

// --- Core logic ---

/** Load cached photos from disk (instant) */
export async function loadFromDisk(): Promise<string[]> {
  const manifest = await loadManifest()
  if (!manifest || manifest.photos.length === 0) return []
  const urls = manifest.photos.map((p) => localUrl(p.filename))
  cachedUrls = urls
  return urls
}

/** Sync with iCloud: download new photos, remove stale ones */
async function doSync(): Promise<string[]> {
  await ensureCacheDir()
  const token = extractToken()
  console.log('[photos] syncing with iCloud...')

  const result = await getImages(token)
  const cdnUrls = extractCdnUrls(result.photos as never[])
  console.log(`[photos] iCloud returned ${cdnUrls.length} photos`)

  // Load existing manifest to know what we already have
  const manifest = await loadManifest()
  const existingHashes = new Set(manifest?.photos.map((p) => p.hash) ?? [])

  // Figure out what's new
  const newItems: { url: string; hash: string; filename: string }[] = []
  const allHashes = new Set<string>()

  for (const url of cdnUrls) {
    const hash = urlHash(url)
    allHashes.add(hash)
    if (!existingHashes.has(hash)) {
      const ext = path.extname(new URL(url).pathname).toLowerCase() || '.jpg'
      newItems.push({ url, hash, filename: `${hash}${ext}` })
    }
  }

  // Download new photos
  let newEntries: ManifestEntry[] = []
  if (newItems.length > 0) {
    console.log(`[photos] downloading ${newItems.length} new photos...`)
    newEntries = await downloadBatch(newItems)
    console.log(`[photos] downloaded ${newEntries.length}/${newItems.length} photos`)
  }

  // Build updated manifest: keep existing that are still in album + add new
  const kept = manifest?.photos.filter((p) => allHashes.has(p.hash)) ?? []
  const updatedManifest: Manifest = {
    photos: [...kept, ...newEntries],
    syncedAt: Date.now(),
  }

  // Remove stale files from disk
  if (manifest) {
    const stale = manifest.photos.filter((p) => !allHashes.has(p.hash))
    for (const p of stale) {
      await fs.unlink(path.join(cacheDir(), p.filename)).catch(() => {})
    }
    if (stale.length > 0) console.log(`[photos] removed ${stale.length} stale photos`)
  }

  await saveManifest(updatedManifest)

  const urls = updatedManifest.photos.map((p) => localUrl(p.filename))
  cachedUrls = urls
  console.log(`[photos] sync complete: ${urls.length} photos cached`)
  return urls
}

/** Start a sync, deduplicating concurrent calls */
export function startSync(): Promise<string[]> {
  if (syncing) return syncing
  syncing = doSync().finally(() => {
    syncing = null
  })
  return syncing
}

/** Start periodic background sync */
export function startPeriodicSync(): void {
  if (syncTimer) return
  syncTimer = setInterval(() => {
    startSync().catch((err) => console.error('[photos] periodic sync failed:', err))
  }, SYNC_INTERVAL_MS)
}

/** Main entry point: return photos (from disk cache or iCloud) */
export async function fetchPhotos(): Promise<string[]> {
  if (cachedUrls && cachedUrls.length > 0) return cachedUrls
  // Nothing in memory — try disk
  const disk = await loadFromDisk()
  if (disk.length > 0) return disk
  // Nothing on disk — must do a full sync (first run)
  return startSync()
}

/** Get the cache directory path (for serving images) */
export function getCacheDir(): string {
  return cacheDir()
}

export function _resetCache() {
  cachedUrls = null
}
