import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { getImages } from 'icloud-shared-album'
import exifr from 'exifr'
import sharp from 'sharp'

const SYNC_INTERVAL_MS = 60 * 60 * 1000 // re-sync with iCloud every 60 min

function cacheDir(): string {
  return process.env.PHOTOS_CACHE_DIR || '/data/photos'
}

function manifestFile(): string {
  return path.join(cacheDir(), 'manifest.json')
}
const DOWNLOAD_CONCURRENCY = 5

export interface PhotoLocation {
  lat: number
  lon: number
  city?: string
  state?: string
}

export interface PhotoInfo {
  url: string
  dateTaken?: string
  location?: PhotoLocation
}

interface ManifestEntry {
  hash: string
  filename: string
  dateTaken?: string
  location?: PhotoLocation
  metadataExtracted?: boolean
  optimized?: boolean
  geocodeLang?: string
}

interface Manifest {
  photos: ManifestEntry[]
  syncedAt: number
}

// In-memory state
let cachedPhotos: PhotoInfo[] | null = null
let syncing: Promise<PhotoInfo[]> | null = null
let syncTimer: ReturnType<typeof setInterval> | null = null

/** Stable hash from iCloud CDN URL path (query params change on each API call) */
function urlHash(url: string): string {
  const parsed = new URL(url)
  return crypto.createHash('sha256').update(parsed.pathname).digest('hex').slice(0, 16)
}

function localUrl(filename: string): string {
  return `/api/photos/image/${filename}`
}

function entryToPhotoInfo(entry: ManifestEntry): PhotoInfo {
  return {
    url: localUrl(entry.filename),
    dateTaken: entry.dateTaken,
    location: entry.location,
  }
}

// --- EXIF extraction ---

async function extractMetadata(
  filepath: string
): Promise<{ dateTaken?: string; lat?: number; lon?: number }> {
  try {
    const data = await exifr.parse(filepath, {
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
      ],
      gps: true,
    })
    if (!data) return {}

    const date = data.DateTimeOriginal ?? data.CreateDate
    const dateTaken = date instanceof Date ? date.toISOString() : undefined

    const lat = typeof data.latitude === 'number' ? data.latitude : undefined
    const lon = typeof data.longitude === 'number' ? data.longitude : undefined

    return { dateTaken, lat, lon }
  } catch {
    return {}
  }
}

// --- Reverse geocoding (Nominatim / OpenStreetMap) ---

async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ city?: string; state?: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=en`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GBoard-Dashboard/1.0' },
    })
    if (!res.ok) return {}
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; state?: string; county?: string }
    }
    const addr = data.address
    if (!addr) return {}
    return {
      city: addr.city || addr.town || addr.village || undefined,
      state: addr.state || addr.county || undefined,
    }
  } catch {
    return {}
  }
}

/** Extract EXIF + geocode for a single manifest entry */
async function enrichEntry(entry: ManifestEntry): Promise<ManifestEntry> {
  if (entry.metadataExtracted && entry.geocodeLang === 'en') return entry

  // If EXIF already extracted, just re-geocode
  if (entry.metadataExtracted && entry.location) {
    const geo = await reverseGeocode(entry.location.lat, entry.location.lon)
    return {
      ...entry,
      location: { ...entry.location, ...geo },
      geocodeLang: 'en',
    }
  }

  const filepath = path.join(cacheDir(), entry.filename)
  const meta = await extractMetadata(filepath)

  let location: PhotoLocation | undefined
  if (meta.lat != null && meta.lon != null) {
    const geo = await reverseGeocode(meta.lat, meta.lon)
    location = { lat: meta.lat, lon: meta.lon, ...geo }
  }

  return {
    ...entry,
    dateTaken: meta.dateTaken,
    location,
    metadataExtracted: true,
    geocodeLang: 'en',
  }
}

/** Enrich all entries missing metadata (with rate limiting for geocoding) */
async function enrichManifest(entries: ManifestEntry[]): Promise<ManifestEntry[]> {
  const results: ManifestEntry[] = []
  for (const entry of entries) {
    if (entry.metadataExtracted) {
      results.push(entry)
    } else {
      const enriched = await enrichEntry(entry)
      results.push(enriched)
      // Rate limit Nominatim: 1 req/sec
      if (enriched.location) {
        await new Promise((r) => setTimeout(r, 1100))
      }
    }
  }
  return results
}

// --- Image optimization (sharp) ---

/** Convert image to high-quality WebP with sharpening */
async function optimizeImage(filepath: string): Promise<string> {
  const webpPath = filepath.replace(/\.[^.]+$/, '.webp')

  // If already converted (e.g. interrupted previous run), just return
  if (webpPath !== filepath) {
    try {
      await fs.access(webpPath)
      await fs.unlink(filepath).catch(() => {})
      return path.basename(webpPath)
    } catch {
      // .webp doesn't exist yet, proceed with conversion
    }
  }

  await sharp(filepath)
    .rotate() // auto-rotate based on EXIF orientation
    .sharpen({ sigma: 0.8, m1: 0.8, m2: 0.4 }) // mild sharpen to counteract upscale softness
    .webp({ quality: 90, effort: 4 })
    .toFile(webpPath)

  // Remove original if different from output
  if (webpPath !== filepath) {
    await fs.unlink(filepath).catch(() => {})
  }
  return path.basename(webpPath)
}

/** Optimize all entries that haven't been processed yet, saving progress periodically */
async function optimizeManifest(entries: ManifestEntry[]): Promise<ManifestEntry[]> {
  const results: ManifestEntry[] = [...entries]
  let count = 0
  for (let i = 0; i < results.length; i++) {
    if (results[i].optimized) continue
    try {
      const filepath = path.join(cacheDir(), results[i].filename)
      const newFilename = await optimizeImage(filepath)
      results[i] = { ...results[i], filename: newFilename, optimized: true }
      count++
      // Save progress every 20 photos to survive restarts
      if (count % 20 === 0) {
        await saveManifest({ photos: results, syncedAt: Date.now() })
      }
    } catch (err) {
      console.error(`[photos] optimize failed for ${results[i].filename}:`, err)
      results[i] = { ...results[i], optimized: true }
    }
  }
  if (count > 0) console.log(`[photos] optimized ${count} photos to WebP`)
  return results
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
  photos: { derivatives: Record<string, { height: number; width?: number; url?: string }> }[]
): string[] {
  const urls: string[] = []
  for (const photo of photos) {
    const derivatives = Object.values(photo.derivatives)
    let bestUrl: string | undefined
    let bestHeight = -1
    for (const d of derivatives) {
      if (d.url && d.height > bestHeight) {
        bestHeight = d.height
        bestUrl = d.url
      }
    }
    if (bestUrl) urls.push(bestUrl)
  }
  return urls
}

// --- Core logic ---

/** Load cached photos from disk (instant), fix filenames and optimize if needed */
export async function loadFromDisk(): Promise<PhotoInfo[]> {
  const manifest = await loadManifest()
  if (!manifest || manifest.photos.length === 0) return []

  // Fix manifest entries that reference .jpg but .webp exists on disk
  let manifestDirty = false
  for (let i = 0; i < manifest.photos.length; i++) {
    const entry = manifest.photos[i]
    if (entry.filename.endsWith('.webp')) continue
    const webpName = entry.filename.replace(/\.[^.]+$/, '.webp')
    try {
      await fs.access(path.join(cacheDir(), webpName))
      manifest.photos[i] = { ...entry, filename: webpName, optimized: true }
      manifestDirty = true
    } catch {
      // original file still exists, will be optimized later
    }
  }
  if (manifestDirty) {
    await saveManifest(manifest)
    console.log('[photos] fixed manifest filenames to match .webp files on disk')
  }

  // One-time migration: reset metadata for entries with wrong GPS (missing ref signs)
  const needsRegeocode = manifest.photos.some((e) => e.metadataExtracted && e.geocodeLang !== 'en')
  if (needsRegeocode) {
    console.log('[photos] resetting metadata for re-geocoding with English + fixed GPS...')
    for (let i = 0; i < manifest.photos.length; i++) {
      manifest.photos[i] = {
        ...manifest.photos[i],
        metadataExtracted: false,
        geocodeLang: undefined,
        location: undefined,
        dateTaken: undefined,
      }
    }
    manifestDirty = true
    await saveManifest(manifest)
  }

  // Serve immediately, optimize/enrich in background if needed
  const photos = manifest.photos.map(entryToPhotoInfo)
  cachedPhotos = photos

  const needsOptimize = manifest.photos.some((e) => !e.optimized)
  const needsEnrich = manifest.photos.some((e) => !e.metadataExtracted)
  if (needsOptimize || needsEnrich) {
    processInBackground(manifest).catch((err) =>
      console.error('[photos] background processing failed:', err)
    )
  }

  return photos
}

/** Enrich and optimize existing photos in background without blocking serving */
async function processInBackground(manifest: Manifest): Promise<void> {
  let entries = manifest.photos

  const needsEnrich = entries.some((e) => !e.metadataExtracted)
  if (needsEnrich) {
    console.log('[photos] enriching metadata in background...')
    entries = await enrichManifest(entries)
    await saveManifest({ photos: entries, syncedAt: manifest.syncedAt })
    cachedPhotos = entries.map(entryToPhotoInfo)
    console.log('[photos] background enrichment complete')
  }

  const needsOptimize = entries.some((e) => !e.optimized)
  if (needsOptimize) {
    console.log('[photos] optimizing images in background...')
    entries = await optimizeManifest(entries)
    await saveManifest({ photos: entries, syncedAt: manifest.syncedAt })
    cachedPhotos = entries.map(entryToPhotoInfo)
    console.log('[photos] background optimization complete')
  }
}

/** Sync with iCloud: download new photos, remove stale ones */
async function doSync(): Promise<PhotoInfo[]> {
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
  let allEntries = [...kept, ...newEntries]

  // Enrich entries missing metadata (EXIF + geocode) — must run BEFORE optimization
  // because sharp conversion strips EXIF data
  const needsEnrich = allEntries.some((e) => !e.metadataExtracted)
  if (needsEnrich) {
    console.log('[photos] extracting metadata...')
    allEntries = await enrichManifest(allEntries)
  }

  // Optimize images to WebP with sharpening
  const needsOptimize = allEntries.some((e) => !e.optimized)
  if (needsOptimize) {
    console.log('[photos] optimizing images...')
    allEntries = await optimizeManifest(allEntries)
  }

  const updatedManifest: Manifest = {
    photos: allEntries,
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

  const photos = updatedManifest.photos.map(entryToPhotoInfo)
  cachedPhotos = photos
  console.log(`[photos] sync complete: ${photos.length} photos cached`)
  return photos
}

/** Start a sync, deduplicating concurrent calls */
export function startSync(): Promise<PhotoInfo[]> {
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
export async function fetchPhotos(): Promise<PhotoInfo[]> {
  if (cachedPhotos && cachedPhotos.length > 0) return cachedPhotos
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
  cachedPhotos = null
}
