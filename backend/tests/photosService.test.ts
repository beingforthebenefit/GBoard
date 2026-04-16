import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import {
  fetchPhotos,
  loadFromDisk,
  startSync,
  startPeriodicSync,
  getCacheDir,
  _resetCache,
} from '../src/services/photosService.js'

// Mock icloud-shared-album
vi.mock('icloud-shared-album', () => ({
  getImages: vi.fn(),
}))

// Mock exifr so it doesn't try to parse fake image data
vi.mock('exifr', () => ({
  default: { parse: vi.fn().mockResolvedValue(null) },
}))

import { getImages } from 'icloud-shared-album'
const mockGetImages = vi.mocked(getImages)

const ALBUM_URL = 'https://www.icloud.com/sharedalbum/#B2cJ0DiRHGKfEzI'

let tmpDir: string

const makePhoto = (url: string, height: number) => ({
  derivatives: {
    small: { height: 100, url: `${url}-small` },
    large: { height, url },
  },
})

// Mock global fetch for image downloads
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gboard-photos-test-'))
  vi.stubEnv('PHOTOS_CACHE_DIR', tmpDir)
  vi.stubEnv('ICLOUD_ALBUM_URL', ALBUM_URL)
  _resetCache()
  mockGetImages.mockReset()
  mockFetch.mockReset()

  // Default: mock fetch to return a fake image
  mockFetch.mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('photosService', () => {
  it('extracts token from album URL and calls getImages on sync', async () => {
    mockGetImages.mockResolvedValue({ photos: [] })
    await startSync()
    expect(mockGetImages).toHaveBeenCalledWith('B2cJ0DiRHGKfEzI')
  })

  it('downloads photos and returns Thumbor URLs', async () => {
    mockGetImages.mockResolvedValue({
      photos: [
        makePhoto('https://cdn.example.com/S/abc123/photo1.JPG', 1080),
        makePhoto('https://cdn.example.com/S/def456/photo2.JPG', 720),
      ],
    })

    const result = await startSync()
    expect(result).toHaveLength(2)
    expect(result[0].url).toMatch(/^\/thumbor\/unsafe\/1920x1080\/smart\//)
    expect(result[1].url).toMatch(/^\/thumbor\/unsafe\/1920x1080\/smart\//)
  })

  it('writes a manifest file to disk', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    await startSync()
    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, 'manifest.json'), 'utf-8'))
    expect(manifest.photos).toHaveLength(1)
    expect(manifest.syncedAt).toBeGreaterThan(0)
  })

  it('loads from disk without calling iCloud', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    await startSync()
    _resetCache()
    mockGetImages.mockReset()

    const urls = await loadFromDisk()
    expect(urls).toHaveLength(1)
    expect(urls[0].url).toMatch(/^\/thumbor\/unsafe\/1920x1080\/smart\//)
    expect(mockGetImages).not.toHaveBeenCalled()
  })

  it('does not re-download existing photos on re-sync', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    await startSync()
    const downloadCount1 = mockFetch.mock.calls.length

    _resetCache()
    // Same URL path → same hash → should skip download
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG?newtoken=xyz', 500)],
    })

    await startSync()
    expect(mockFetch.mock.calls.length).toBe(downloadCount1)
  })

  it('removes stale photos from disk on re-sync', async () => {
    mockGetImages.mockResolvedValue({
      photos: [
        makePhoto('https://cdn.example.com/S/abc/old.JPG', 500),
        makePhoto('https://cdn.example.com/S/def/keep.JPG', 500),
      ],
    })

    await startSync()
    const imageFiles = (f: string) => f !== 'manifest.json'
    const files1 = (await fs.readdir(tmpDir)).filter(imageFiles)
    expect(files1).toHaveLength(2)

    _resetCache()
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/def/keep.JPG', 500)],
    })

    await startSync()
    const files2 = (await fs.readdir(tmpDir)).filter(imageFiles)
    expect(files2).toHaveLength(1)
  })

  it('deduplicates concurrent sync calls', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    const [r1, r2] = await Promise.all([startSync(), startSync()])
    expect(r1).toEqual(r2)
    expect(mockGetImages).toHaveBeenCalledTimes(1)
  })

  it('returns from memory cache when available', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    await startSync()
    mockGetImages.mockReset()

    const result = await fetchPhotos()
    expect(result).toHaveLength(1)
    expect(mockGetImages).not.toHaveBeenCalled()
  })

  it('throws when ICLOUD_ALBUM_URL is not set', async () => {
    vi.stubEnv('ICLOUD_ALBUM_URL', '')
    await expect(startSync()).rejects.toThrow('Missing ICLOUD_ALBUM_URL')
  })

  it('throws when URL format is invalid', async () => {
    vi.stubEnv('ICLOUD_ALBUM_URL', 'https://www.icloud.com/short')
    await expect(startSync()).rejects.toThrow('Cannot parse iCloud album token')
  })

  it('returns cache dir path', () => {
    expect(getCacheDir()).toBe(tmpDir)
  })

  it('handles download failures gracefully', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/fail.JPG', 500)],
    })

    const result = await startSync()
    expect(result).toHaveLength(0)
  })

  it('loadFromDisk returns empty when no manifest exists', async () => {
    const result = await loadFromDisk()
    expect(result).toEqual([])
  })

  it('fetchPhotos falls back to disk when memory cache is empty', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/disk-photo.JPG', 500)],
    })

    await startSync()

    // Clear memory cache but leave disk intact
    _resetCache()
    mockGetImages.mockReset()

    const result = await fetchPhotos()
    expect(result).toHaveLength(1)
    expect(result[0].url).toMatch(/^\/thumbor\/unsafe\/1920x1080\/smart\//)
    expect(mockGetImages).not.toHaveBeenCalled()
  })

  it('fetchPhotos falls back to sync when both memory and disk are empty', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/fresh.JPG', 500)],
    })

    const result = await fetchPhotos()
    expect(result).toHaveLength(1)
    expect(result[0].url).toMatch(/^\/thumbor\/unsafe\/1920x1080\/smart\//)
    expect(mockGetImages).toHaveBeenCalledTimes(1)
  })

  it('startPeriodicSync can be called without error', () => {
    expect(() => startPeriodicSync()).not.toThrow()
  })
})

describe('photosService Thumbor URL generation', () => {
  it('builds URLs with /thumbor/unsafe/1920x1080/smart/ prefix', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc123/photo.JPG', 500)],
    })

    const result = await startSync()
    expect(result[0].url).toMatch(/^\/thumbor\/unsafe\/1920x1080\/smart\/[a-f0-9]+\.jpg$/)
  })

  it('preserves the file extension in the URL', async () => {
    mockGetImages.mockResolvedValue({
      photos: [
        makePhoto('https://cdn.example.com/S/aaa/a.JPG', 500),
        makePhoto('https://cdn.example.com/S/bbb/b.PNG', 500),
        makePhoto('https://cdn.example.com/S/ccc/c.HEIC', 500),
      ],
    })

    const result = await startSync()
    const urls = result.map((p) => p.url)
    expect(urls.some((u) => u.endsWith('.jpg'))).toBe(true)
    expect(urls.some((u) => u.endsWith('.png'))).toBe(true)
    expect(urls.some((u) => u.endsWith('.heic'))).toBe(true)
  })

  it('falls back to .jpg extension when source URL has none', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/no-extension', 500)],
    })

    const result = await startSync()
    expect(result[0].url).toMatch(/\.jpg$/)
  })

  it('produces stable URLs for the same photo across syncs', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    const first = await startSync()
    _resetCache()

    // Same path, different query params (iCloud rotates tokens)
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG?token=different', 500)],
    })
    const second = await startSync()

    expect(first[0].url).toBe(second[0].url)
  })

  it('produces distinct URLs for distinct photos', async () => {
    mockGetImages.mockResolvedValue({
      photos: [
        makePhoto('https://cdn.example.com/S/aaa/one.JPG', 500),
        makePhoto('https://cdn.example.com/S/bbb/two.JPG', 500),
      ],
    })

    const result = await startSync()
    expect(result[0].url).not.toBe(result[1].url)
  })

  it('uses the same URL format when loading from disk as when syncing', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    const fromSync = await startSync()
    _resetCache()
    const fromDisk = await loadFromDisk()

    expect(fromDisk[0].url).toBe(fromSync[0].url)
  })

  it('URL filename matches the manifest filename exactly', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    await startSync()
    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, 'manifest.json'), 'utf-8'))
    const entry = manifest.photos[0]

    _resetCache()
    const photos = await loadFromDisk()
    expect(photos[0].url).toBe(`/thumbor/unsafe/1920x1080/smart/${entry.filename}`)
  })

  it('URL filename uses a 16-char hex hash', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    const result = await startSync()
    const filename = result[0].url.split('/').pop() ?? ''
    expect(filename).toMatch(/^[a-f0-9]{16}\.[a-z]+$/)
  })

  it('URL does not contain query strings or fragments', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG?token=secret#frag', 500)],
    })

    const result = await startSync()
    expect(result[0].url).not.toContain('?')
    expect(result[0].url).not.toContain('#')
    expect(result[0].url).not.toContain('token=')
  })

  it('URL includes the smart flag for face detection', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    const result = await startSync()
    expect(result[0].url).toContain('/smart/')
  })

  it('URL includes 1920x1080 dimensions for widescreen smart crop', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    const result = await startSync()
    expect(result[0].url).toContain('/1920x1080/')
  })

  it('URL is relative (no host) so it routes through the same nginx as the app', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/photo.JPG', 500)],
    })

    const result = await startSync()
    expect(result[0].url.startsWith('/')).toBe(true)
    expect(result[0].url).not.toMatch(/^https?:/)
  })

  it('URL filename does not leak directory traversal chars', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/S/abc/../../etc/passwd', 500)],
    })

    const result = await startSync()
    expect(result[0].url).not.toContain('..')
    expect(result[0].url).not.toContain('/etc/')
  })

  it('all returned photos have well-formed Thumbor URLs', async () => {
    mockGetImages.mockResolvedValue({
      photos: [
        makePhoto('https://cdn.example.com/S/a/one.JPG', 500),
        makePhoto('https://cdn.example.com/S/b/two.JPG', 500),
        makePhoto('https://cdn.example.com/S/c/three.JPG', 500),
      ],
    })

    const result = await startSync()
    expect(result).toHaveLength(3)
    for (const p of result) {
      expect(p.url).toMatch(/^\/thumbor\/unsafe\/1920x1080\/smart\/[a-f0-9]{16}\.[a-z]+$/)
    }
  })
})
