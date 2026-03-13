/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/services/weatherService.js', () => ({
  fetchWeather: vi.fn(),
}))
vi.mock('../src/services/radarService.js', () => ({
  getRadarData: vi.fn(),
  proxyTile: vi.fn(),
}))
vi.mock('../src/services/calendarService.js', () => ({
  fetchCalendarEvents: vi.fn(),
}))
vi.mock('../src/services/mediaService.js', () => ({
  fetchUpcomingMedia: vi.fn(),
}))
vi.mock('../src/services/photosService.js', () => ({
  fetchPhotos: vi.fn(),
  getCacheDir: vi.fn(),
}))
vi.mock('../src/services/piholeService.js', () => ({
  fetchPiholeStats: vi.fn(),
}))
vi.mock('../src/services/plexService.js', () => ({
  fetchPlexSessions: vi.fn(),
}))

import { fetchWeather } from '../src/services/weatherService.js'
import { getRadarData, proxyTile } from '../src/services/radarService.js'
import { fetchCalendarEvents } from '../src/services/calendarService.js'
import { fetchUpcomingMedia } from '../src/services/mediaService.js'
import { fetchPhotos, getCacheDir } from '../src/services/photosService.js'
import { fetchPiholeStats } from '../src/services/piholeService.js'
import { fetchPlexSessions } from '../src/services/plexService.js'

function mockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    sendFile: vi.fn(),
  }
  return res
}

function mockReq(overrides = {}) {
  return { params: {}, query: {}, ...overrides } as any
}

// Helper to extract the route handler from an Express router
function getHandler(router: any, method: string, path: string) {
  const layer = router.stack.find((l: any) => l.route?.path === path && l.route?.methods[method])
  if (!layer) throw new Error(`No ${method} handler for ${path}`)
  return layer.route.stack[0].handle
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Weather routes ──────────────────────────────────────────────────────

describe('weather routes', () => {
  let router: any

  beforeEach(async () => {
    const mod = await import('../src/routes/weather.js')
    router = mod.default
  })

  describe('GET /', () => {
    it('returns weather data on success', async () => {
      const weatherData = { temp: 72, description: 'sunny' }
      vi.mocked(fetchWeather).mockResolvedValue(weatherData as any)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/')(req, res, next)

      expect(fetchWeather).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(weatherData)
      expect(next).not.toHaveBeenCalled()
    })

    it('calls next with error on failure', async () => {
      const err = new Error('API down')
      vi.mocked(fetchWeather).mockRejectedValue(err)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/')(req, res, next)

      expect(next).toHaveBeenCalledWith(err)
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('GET /radar', () => {
    it('returns radar data on success', async () => {
      const radarData = { host: 'https://tilecache.rainviewer.com', radarPath: '/v2/radar/123' }
      vi.mocked(getRadarData).mockResolvedValue(radarData as any)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/radar')(req, res, next)

      expect(getRadarData).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(radarData)
      expect(next).not.toHaveBeenCalled()
    })

    it('calls next with error on failure', async () => {
      const err = new Error('radar fail')
      vi.mocked(getRadarData).mockRejectedValue(err)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/radar')(req, res, next)

      expect(next).toHaveBeenCalledWith(err)
    })
  })

  describe('GET /radar/base/:z/:x/:y', () => {
    it('proxies base tile with correct headers', async () => {
      const tileResult = { buffer: Buffer.from('tile'), contentType: 'image/png' }
      vi.mocked(proxyTile).mockResolvedValue(tileResult)

      const req = mockReq({ params: { z: '5', x: '10', y: '15' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/radar/base/:z/:x/:y')(req, res, next)

      expect(proxyTile).toHaveBeenCalledWith('https://basemaps.cartocdn.com/dark_all/5/10/15.png')
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png')
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600')
      expect(res.send).toHaveBeenCalledWith(tileResult.buffer)
      expect(next).not.toHaveBeenCalled()
    })

    it('calls next with error on failure', async () => {
      const err = new Error('tile fetch fail')
      vi.mocked(proxyTile).mockRejectedValue(err)

      const req = mockReq({ params: { z: '5', x: '10', y: '15' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/radar/base/:z/:x/:y')(req, res, next)

      expect(next).toHaveBeenCalledWith(err)
    })
  })

  describe('GET /radar/overlay/:z/:x/:y', () => {
    it('proxies overlay tile using radar data', async () => {
      const radarData = {
        host: 'https://tilecache.rainviewer.com',
        radarPath: '/v2/radar/1234567890',
      }
      vi.mocked(getRadarData).mockResolvedValue(radarData as any)

      const tileResult = { buffer: Buffer.from('overlay'), contentType: 'image/png' }
      vi.mocked(proxyTile).mockResolvedValue(tileResult)

      const req = mockReq({ params: { z: '5', x: '10', y: '15' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/radar/overlay/:z/:x/:y')(req, res, next)

      expect(getRadarData).toHaveBeenCalled()
      expect(proxyTile).toHaveBeenCalledWith(
        'https://tilecache.rainviewer.com/v2/radar/1234567890/256/5/10/15/6/0_1.png'
      )
      expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png')
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300')
      expect(res.send).toHaveBeenCalledWith(tileResult.buffer)
    })

    it('calls next with error on failure', async () => {
      const err = new Error('overlay fail')
      vi.mocked(getRadarData).mockRejectedValue(err)

      const req = mockReq({ params: { z: '5', x: '10', y: '15' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/radar/overlay/:z/:x/:y')(req, res, next)

      expect(next).toHaveBeenCalledWith(err)
    })
  })
})

// ── Calendar routes ─────────────────────────────────────────────────────

describe('calendar routes', () => {
  let router: any

  beforeEach(async () => {
    const mod = await import('../src/routes/calendar.js')
    router = mod.default
  })

  it('returns events wrapped in { events }', async () => {
    const events = [{ title: 'Meeting', start: '2026-03-12T10:00:00' }]
    vi.mocked(fetchCalendarEvents).mockResolvedValue(events as any)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getHandler(router, 'get', '/')(req, res, next)

    expect(fetchCalendarEvents).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ events })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next with error on failure', async () => {
    const err = new Error('calendar fail')
    vi.mocked(fetchCalendarEvents).mockRejectedValue(err)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getHandler(router, 'get', '/')(req, res, next)

    expect(next).toHaveBeenCalledWith(err)
  })
})

// ── Media routes ────────────────────────────────────────────────────────

describe('media routes', () => {
  let router: any

  beforeEach(async () => {
    const mod = await import('../src/routes/media.js')
    router = mod.default
  })

  it('returns media result with items and totalItems', async () => {
    const result = { items: [{ title: 'Breaking Bad' }], totalItems: 1 }
    vi.mocked(fetchUpcomingMedia).mockResolvedValue(result as any)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getHandler(router, 'get', '/')(req, res, next)

    expect(fetchUpcomingMedia).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(result)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next with error on failure', async () => {
    const err = new Error('media fail')
    vi.mocked(fetchUpcomingMedia).mockRejectedValue(err)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getHandler(router, 'get', '/')(req, res, next)

    expect(next).toHaveBeenCalledWith(err)
  })
})

// ── Photos routes ───────────────────────────────────────────────────────

describe('photos routes', () => {
  let router: any

  beforeEach(async () => {
    const mod = await import('../src/routes/photos.js')
    router = mod.default
  })

  describe('GET /', () => {
    it('returns photos wrapped in { photos }', async () => {
      const photos = ['photo1.jpg', 'photo2.jpg']
      vi.mocked(fetchPhotos).mockResolvedValue(photos)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/')(req, res, next)

      expect(fetchPhotos).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({ photos })
      expect(next).not.toHaveBeenCalled()
    })

    it('calls next with error on failure', async () => {
      const err = new Error('photos fail')
      vi.mocked(fetchPhotos).mockRejectedValue(err)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/')(req, res, next)

      expect(next).toHaveBeenCalledWith(err)
    })
  })

  describe('GET /image/:filename', () => {
    it('serves the file from the cache directory', () => {
      vi.mocked(getCacheDir).mockReturnValue('/data/photos')

      const req = mockReq({ params: { filename: 'sunset.jpg' } })
      const res = mockRes()

      const handler = getHandler(router, 'get', '/image/:filename')
      handler(req, res)

      expect(res.sendFile).toHaveBeenCalledWith('/data/photos/sunset.jpg', expect.any(Function))
    })

    it('strips path traversal from filename', () => {
      vi.mocked(getCacheDir).mockReturnValue('/data/photos')

      const req = mockReq({ params: { filename: '../../etc/passwd' } })
      const res = mockRes()

      const handler = getHandler(router, 'get', '/image/:filename')
      handler(req, res)

      // path.basename('../../etc/passwd') => 'passwd'
      expect(res.sendFile).toHaveBeenCalledWith('/data/photos/passwd', expect.any(Function))
    })

    it('returns 404 when sendFile fails', () => {
      vi.mocked(getCacheDir).mockReturnValue('/data/photos')

      const req = mockReq({ params: { filename: 'missing.jpg' } })
      const res = mockRes()

      const handler = getHandler(router, 'get', '/image/:filename')
      handler(req, res)

      // Invoke the sendFile callback with an error
      const sendFileCallback = res.sendFile.mock.calls[0][1]
      sendFileCallback(new Error('ENOENT'))

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.end).toHaveBeenCalled()
    })

    it('does not return 404 when sendFile succeeds', () => {
      vi.mocked(getCacheDir).mockReturnValue('/data/photos')

      const req = mockReq({ params: { filename: 'photo.jpg' } })
      const res = mockRes()

      const handler = getHandler(router, 'get', '/image/:filename')
      handler(req, res)

      // Invoke the sendFile callback with no error (success)
      const sendFileCallback = res.sendFile.mock.calls[0][1]
      sendFileCallback(null)

      expect(res.status).not.toHaveBeenCalled()
    })
  })
})

// ── Pi-hole routes ──────────────────────────────────────────────────────

describe('pihole routes', () => {
  let router: any

  beforeEach(async () => {
    const mod = await import('../src/routes/pihole.js')
    router = mod.default
  })

  it('returns pihole stats', async () => {
    const stats = { totalQueries: 1000, blockedQueries: 200, percentBlocked: 20 }
    vi.mocked(fetchPiholeStats).mockResolvedValue(stats as any)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getHandler(router, 'get', '/')(req, res, next)

    expect(fetchPiholeStats).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(stats)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next with error on failure', async () => {
    const err = new Error('pihole fail')
    vi.mocked(fetchPiholeStats).mockRejectedValue(err)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getHandler(router, 'get', '/')(req, res, next)

    expect(next).toHaveBeenCalledWith(err)
  })
})

// ── Plex routes ─────────────────────────────────────────────────────────

describe('plex routes', () => {
  let router: any

  beforeEach(async () => {
    const mod = await import('../src/routes/plex.js')
    router = mod.default
  })

  describe('GET /', () => {
    it('returns first session and all sessions', async () => {
      const sessions = [
        { title: 'Movie A', user: 'alice' },
        { title: 'Movie B', user: 'bob' },
      ]
      vi.mocked(fetchPlexSessions).mockResolvedValue(sessions as any)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/')(req, res, next)

      expect(fetchPlexSessions).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({
        session: sessions[0],
        sessions,
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('returns null session when no active sessions', async () => {
      vi.mocked(fetchPlexSessions).mockResolvedValue([])

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/')(req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        session: null,
        sessions: [],
      })
    })

    it('calls next with error on failure', async () => {
      const err = new Error('plex fail')
      vi.mocked(fetchPlexSessions).mockRejectedValue(err)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/')(req, res, next)

      expect(next).toHaveBeenCalledWith(err)
    })
  })

  describe('GET /thumb', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
      vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
      process.env = originalEnv
      vi.unstubAllGlobals()
    })

    it('returns 500 when PLEX_URL is not set', async () => {
      delete process.env.PLEX_URL
      delete process.env.PLEX_TOKEN

      const req = mockReq({ query: { path: '/library/metadata/123/thumb' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/thumb')(req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Plex not configured' })
      expect(next).not.toHaveBeenCalled()
    })

    it('returns 500 when PLEX_TOKEN is not set', async () => {
      process.env.PLEX_URL = 'http://plex:32400'
      delete process.env.PLEX_TOKEN

      const req = mockReq({ query: { path: '/library/metadata/123/thumb' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/thumb')(req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Plex not configured' })
    })

    it('returns 400 when path query is missing', async () => {
      process.env.PLEX_URL = 'http://plex:32400'
      process.env.PLEX_TOKEN = 'abc123'

      const req = mockReq({ query: {} })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/thumb')(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid path' })
    })

    it('returns 400 when path does not start with /', async () => {
      process.env.PLEX_URL = 'http://plex:32400'
      process.env.PLEX_TOKEN = 'abc123'

      const req = mockReq({ query: { path: 'not-a-valid-path' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/thumb')(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid path' })
    })

    it('proxies thumbnail with correct headers on success', async () => {
      process.env.PLEX_URL = 'http://plex:32400'
      process.env.PLEX_TOKEN = 'abc123'

      const imageBuffer = new ArrayBuffer(8)
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'image/jpeg']]) as any,
        arrayBuffer: vi.fn().mockResolvedValue(imageBuffer),
      })
      // The route uses upstream.headers.get(), so we need a proper Headers-like
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: vi.fn().mockReturnValue('image/jpeg') },
        arrayBuffer: vi.fn().mockResolvedValue(imageBuffer),
      })
      vi.stubGlobal('fetch', mockFetch)

      const req = mockReq({ query: { path: '/library/metadata/123/thumb/456' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/thumb')(req, res, next)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://plex:32400/library/metadata/123/thumb/456?X-Plex-Token=abc123',
        { signal: expect.any(AbortSignal) }
      )
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg')
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600')
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer))
      expect(next).not.toHaveBeenCalled()
    })

    it('defaults content-type to image/jpeg when not provided', async () => {
      process.env.PLEX_URL = 'http://plex:32400'
      process.env.PLEX_TOKEN = 'abc123'

      const imageBuffer = new ArrayBuffer(8)
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          headers: { get: vi.fn().mockReturnValue(null) },
          arrayBuffer: vi.fn().mockResolvedValue(imageBuffer),
        })
      )

      const req = mockReq({ query: { path: '/thumb/123' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/thumb')(req, res, next)

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg')
    })

    it('returns upstream status when upstream is not ok', async () => {
      process.env.PLEX_URL = 'http://plex:32400'
      process.env.PLEX_TOKEN = 'abc123'

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        })
      )

      const req = mockReq({ query: { path: '/thumb/123' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/thumb')(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.end).toHaveBeenCalled()
    })

    it('calls next with error when fetch throws', async () => {
      process.env.PLEX_URL = 'http://plex:32400'
      process.env.PLEX_TOKEN = 'abc123'

      const err = new Error('network error')
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err))

      const req = mockReq({ query: { path: '/thumb/123' } })
      const res = mockRes()
      const next = vi.fn()

      await getHandler(router, 'get', '/thumb')(req, res, next)

      expect(next).toHaveBeenCalledWith(err)
    })
  })
})
