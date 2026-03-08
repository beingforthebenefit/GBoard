import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPhotos, _resetCache } from '../src/services/photosService.js'

// Mock icloud-shared-album
vi.mock('icloud-shared-album', () => ({
  getImages: vi.fn(),
}))

import { getImages } from 'icloud-shared-album'
const mockGetImages = vi.mocked(getImages)

const ALBUM_URL = 'https://www.icloud.com/sharedalbum/#B2cJ0DiRHGKfEzI'

const makePhoto = (url: string, height: number) => ({
  derivatives: {
    small: { height: 100, url: `${url}-small` },
    large: { height, url },
  },
})

beforeEach(() => {
  _resetCache()
  vi.stubEnv('ICLOUD_ALBUM_URL', ALBUM_URL)
  mockGetImages.mockReset()
})

describe('fetchPhotos', () => {
  it('extracts token from album URL and calls getImages', async () => {
    mockGetImages.mockResolvedValue({ photos: [] })
    await fetchPhotos()
    expect(mockGetImages).toHaveBeenCalledWith('B2cJ0DiRHGKfEzI')
  })

  it('returns URLs of the largest derivatives', async () => {
    mockGetImages.mockResolvedValue({
      photos: [
        makePhoto('https://cdn.example.com/photo1.jpg', 1080),
        makePhoto('https://cdn.example.com/photo2.jpg', 720),
      ],
    })

    const result = await fetchPhotos()
    expect(result).toEqual([
      'https://cdn.example.com/photo1.jpg',
      'https://cdn.example.com/photo2.jpg',
    ])
  })

  it('skips photos with no URL on any derivative', async () => {
    mockGetImages.mockResolvedValue({
      photos: [
        { derivatives: { small: { height: 100 } } }, // no url field
        makePhoto('https://cdn.example.com/ok.jpg', 500),
      ],
    })

    const result = await fetchPhotos()
    expect(result).toEqual(['https://cdn.example.com/ok.jpg'])
  })

  it('returns cached result on subsequent calls', async () => {
    mockGetImages.mockResolvedValue({
      photos: [makePhoto('https://cdn.example.com/a.jpg', 500)],
    })

    const first = await fetchPhotos()
    const second = await fetchPhotos()
    expect(first).toEqual(second)
    expect(mockGetImages).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent requests', async () => {
    let resolvePromise: (val: { photos: ReturnType<typeof makePhoto>[] }) => void
    mockGetImages.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve
        })
    )

    const p1 = fetchPhotos()
    const p2 = fetchPhotos()

    resolvePromise!({ photos: [makePhoto('https://cdn.example.com/b.jpg', 800)] })

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toEqual(r2)
    expect(mockGetImages).toHaveBeenCalledTimes(1)
  })

  it('throws when ICLOUD_ALBUM_URL is not set', async () => {
    vi.stubEnv('ICLOUD_ALBUM_URL', '')
    await expect(fetchPhotos()).rejects.toThrow('Missing ICLOUD_ALBUM_URL')
  })

  it('throws when URL format is invalid', async () => {
    vi.stubEnv('ICLOUD_ALBUM_URL', 'https://www.icloud.com/short')
    await expect(fetchPhotos()).rejects.toThrow('Cannot parse iCloud album token')
  })
})
