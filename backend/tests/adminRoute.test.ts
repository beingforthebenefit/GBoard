/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../src/index.js', () => ({
  bumpVersion: vi.fn(),
}))

import { readFile, writeFile } from 'fs/promises'
import { bumpVersion } from '../src/index.js'

function mockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  }
  return res
}

function mockReq(overrides = {}) {
  return { params: {}, query: {}, body: {}, ...overrides } as any
}

function getHandler(router: any, method: string, path: string) {
  const layer = router.stack.find((l: any) => l.route?.path === path && l.route?.methods[method])
  if (!layer) throw new Error(`No ${method} handler for ${path}`)
  return layer.route.stack[0].handle
}

let router: any

beforeEach(async () => {
  vi.clearAllMocks()
  // Default: prefs file doesn't exist (loadPrefs catches the error)
  vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'))
  vi.mocked(writeFile).mockResolvedValue(undefined)

  // Re-import router fresh so module-level prefs state resets
  vi.resetModules()
  const mod = await import('../src/routes/admin.js')
  router = mod.default
  // Give loadPrefs() a tick to complete
  await new Promise((r) => setTimeout(r, 10))
})

describe('admin routes', () => {
  // ── GET /theme ──

  describe('GET /theme', () => {
    it('returns default theme and layout when no prefs file exists', async () => {
      const res = mockRes()
      getHandler(router, 'get', '/theme')(mockReq(), res, vi.fn())
      expect(res.json).toHaveBeenCalledWith({ theme: 'auto', layout: 'zen' })
    })
  })

  // ── PUT /theme ──

  describe('PUT /theme', () => {
    it('updates theme and returns updated prefs', async () => {
      const res = mockRes()
      await getHandler(router, 'put', '/theme')(mockReq({ body: { theme: 'dark' } }), res, vi.fn())
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }))
    })

    it('updates layout and returns updated prefs', async () => {
      const res = mockRes()
      await getHandler(router, 'put', '/theme')(
        mockReq({ body: { layout: 'classic' } }),
        res,
        vi.fn()
      )
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ layout: 'classic' }))
    })

    it('ignores invalid theme values', async () => {
      const res = mockRes()
      await getHandler(router, 'put', '/theme')(
        mockReq({ body: { theme: 'rainbow' } }),
        res,
        vi.fn()
      )
      const result = res.json.mock.calls[0][0]
      expect(['auto', 'light', 'dark']).toContain(result.theme)
    })

    it('persists prefs to disk on update', async () => {
      const res = mockRes()
      await getHandler(router, 'put', '/theme')(mockReq({ body: { theme: 'light' } }), res, vi.fn())
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('admin-prefs.json'),
        expect.stringContaining('"theme"'),
        'utf-8'
      )
    })
  })

  // ── POST /refresh ──

  describe('POST /refresh', () => {
    it('calls bumpVersion and returns ok:true', () => {
      const res = mockRes()
      getHandler(router, 'post', '/refresh')(mockReq(), res, vi.fn())
      expect(bumpVersion).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
    })
  })

  // ── GET /env ──

  describe('GET /env', () => {
    it('returns grouped settings with values from .env', async () => {
      vi.mocked(readFile).mockResolvedValue(
        'OPENWEATHER_API_KEY=abc123\nWEATHER_LAT=40.71\n' as any
      )
      const res = mockRes()
      await getHandler(router, 'get', '/env')(mockReq(), res, vi.fn())

      const { groups } = res.json.mock.calls[0][0]
      expect(groups).toBeDefined()
      const weatherGroup = groups.find((g: any) => g.label === 'Weather')
      const apiKeyField = weatherGroup.fields.find((f: any) => f.key === 'OPENWEATHER_API_KEY')
      expect(apiKeyField.value).toBe('abc123')
    })

    it('returns empty string for missing env keys', async () => {
      vi.mocked(readFile).mockResolvedValue('' as any)
      const res = mockRes()
      await getHandler(router, 'get', '/env')(mockReq(), res, vi.fn())

      const { groups } = res.json.mock.calls[0][0]
      const weatherGroup = groups.find((g: any) => g.label === 'Weather')
      const apiKeyField = weatherGroup.fields.find((f: any) => f.key === 'OPENWEATHER_API_KEY')
      expect(apiKeyField.value).toBe('')
    })

    it('strips surrounding quotes from .env values', async () => {
      vi.mocked(readFile).mockResolvedValue('PLEX_URL="http://plex:32400"\n' as any)
      const res = mockRes()
      await getHandler(router, 'get', '/env')(mockReq(), res, vi.fn())

      const { groups } = res.json.mock.calls[0][0]
      const plexGroup = groups.find((g: any) => g.label === 'Plex')
      const plexUrlField = plexGroup.fields.find((f: any) => f.key === 'PLEX_URL')
      expect(plexUrlField.value).toBe('http://plex:32400')
    })

    it('includes calendarLabels on the ICAL_URLS field', async () => {
      vi.mocked(readFile).mockResolvedValue('ICAL_URLS=https://cal.example.com/feed.ics\n' as any)

      // First set labels via PUT /env
      await getHandler(router, 'put', '/env')(
        mockReq({
          body: {
            settings: {},
            calendarLabels: { 'https://cal.example.com/feed.ics': 'Work' },
          },
        }),
        mockRes(),
        vi.fn()
      )

      const res = mockRes()
      await getHandler(router, 'get', '/env')(mockReq(), res, vi.fn())

      const { groups } = res.json.mock.calls[0][0]
      const calGroup = groups.find((g: any) => g.label === 'Calendar')
      const icalField = calGroup.fields.find((f: any) => f.key === 'ICAL_URLS')
      expect(icalField.labels).toEqual({ 'https://cal.example.com/feed.ics': 'Work' })
    })
  })

  // ── PUT /env ──

  describe('PUT /env', () => {
    it('writes updated settings to .env file', async () => {
      vi.mocked(readFile).mockResolvedValue('WEATHER_LAT=0\nWEATHER_LON=0\n' as any)
      const res = mockRes()
      await getHandler(router, 'put', '/env')(
        mockReq({ body: { settings: { WEATHER_LAT: '51.51', WEATHER_LON: '-0.12' } } }),
        res,
        vi.fn()
      )

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.env'),
        expect.stringContaining('WEATHER_LAT=51.51'),
        'utf-8'
      )
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
    })

    it('returns 400 when settings is missing', async () => {
      const res = mockRes()
      await getHandler(router, 'put', '/env')(mockReq({ body: {} }), res, vi.fn())
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('saves calendarLabels to prefs file', async () => {
      vi.mocked(readFile).mockResolvedValue('' as any)
      const res = mockRes()
      await getHandler(router, 'put', '/env')(
        mockReq({
          body: {
            settings: {},
            calendarLabels: { 'https://example.com/cal.ics': 'Personal' },
          },
        }),
        res,
        vi.fn()
      )

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('admin-prefs.json'),
        expect.stringContaining('"calendarLabels"'),
        'utf-8'
      )
    })

    it('does not write prefs when calendarLabels is not provided', async () => {
      vi.mocked(readFile).mockResolvedValue('PORT=3000\n' as any)
      const res = mockRes()
      await getHandler(router, 'put', '/env')(
        mockReq({ body: { settings: { PORT: '3000' } } }),
        res,
        vi.fn()
      )

      const prefsWrite = vi
        .mocked(writeFile)
        .mock.calls.find((c) => String(c[0]).includes('admin-prefs.json'))
      expect(prefsWrite).toBeUndefined()
    })

    it('quotes values containing commas in .env output', async () => {
      vi.mocked(readFile).mockResolvedValue('ICAL_URLS=old\n' as any)
      const res = mockRes()
      await getHandler(router, 'put', '/env')(
        mockReq({
          body: { settings: { ICAL_URLS: 'https://a.com,https://b.com' } },
        }),
        res,
        vi.fn()
      )

      const envWrite = vi.mocked(writeFile).mock.calls.find((c) => String(c[0]).includes('.env'))
      expect(envWrite?.[1]).toContain('"https://a.com,https://b.com"')
    })
  })

  // ── GET / ──

  describe('GET /', () => {
    it('returns HTML with Content-Type text/html', () => {
      const res = mockRes()
      getHandler(router, 'get', '/')(mockReq(), res, vi.fn())

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html')
      expect(res.send).toHaveBeenCalled()
      const html = res.send.mock.calls[0][0] as string
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('GBoard Admin')
    })

    it('includes the admin API reference in the HTML', () => {
      const res = mockRes()
      getHandler(router, 'get', '/')(mockReq(), res, vi.fn())
      const html = res.send.mock.calls[0][0] as string
      expect(html).toContain('/api/admin')
    })
  })
})
