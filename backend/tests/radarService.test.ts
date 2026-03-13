import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRadarData, proxyTile, latLonToTile, _resetCache } from '../src/services/radarService.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  _resetCache()
})

const rainViewerResponse = {
  host: 'https://tilecache.rainviewer.com',
  radar: {
    past: [
      { time: 1710000000, path: '/v2/radar/1710000000' },
      { time: 1710000600, path: '/v2/radar/1710000600' },
    ],
    nowcast: [],
  },
}

describe('latLonToTile', () => {
  it('computes correct tile for Los Angeles at zoom 8', () => {
    // LA: ~34.05, -118.24
    const { x, y } = latLonToTile(34.05, -118.24, 8)
    expect(x).toBe(43)
    expect(y).toBe(102)
  })

  it('computes correct tile for London at zoom 8', () => {
    // London: ~51.5, -0.12
    const { x, y } = latLonToTile(51.5, -0.12, 8)
    expect(x).toBe(127)
    expect(y).toBe(85)
  })

  it('computes correct tile at zoom 0', () => {
    const { x, y } = latLonToTile(0, 0, 0)
    expect(x).toBe(0)
    expect(y).toBe(0)
  })
})

describe('getRadarData', () => {
  it('fetches RainViewer API and returns radar data', async () => {
    vi.stubEnv('WEATHER_LAT', '34.05')
    vi.stubEnv('WEATHER_LON', '-118.24')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => rainViewerResponse,
    })

    const data = await getRadarData()
    expect(data.zoom).toBe(6)
    expect(data.centerX).toBe(10)
    expect(data.centerY).toBe(25)
    expect(data.locX).toBeGreaterThan(0)
    expect(data.locX).toBeLessThan(1)
    expect(data.locY).toBeGreaterThan(0)
    expect(data.locY).toBeLessThan(1)
    expect(data.host).toBe('https://tilecache.rainviewer.com')
    expect(data.radarPath).toBe('/v2/radar/1710000600')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('uses cached data on subsequent calls', async () => {
    vi.stubEnv('WEATHER_LAT', '34.05')
    vi.stubEnv('WEATHER_LON', '-118.24')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => rainViewerResponse,
    })

    await getRadarData()
    const data2 = await getRadarData()
    expect(data2.radarPath).toBe('/v2/radar/1710000600')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws on RainViewer API error', async () => {
    vi.stubEnv('WEATHER_LAT', '34.05')
    vi.stubEnv('WEATHER_LON', '-118.24')

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    await expect(getRadarData()).rejects.toThrow('RainViewer API error: 500')
  })
})

describe('proxyTile', () => {
  it('fetches tile and returns buffer + content type', async () => {
    const fakePixels = new Uint8Array([137, 80, 78, 71]) // PNG header
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => fakePixels.buffer,
      headers: { get: (name: string) => (name === 'content-type' ? 'image/png' : null) },
    })

    const { buffer, contentType } = await proxyTile('https://example.com/tile.png')
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBe(4)
    expect(contentType).toBe('image/png')
  })

  it('defaults to image/png when content-type header is missing', async () => {
    const fakePixels = new Uint8Array([137, 80, 78, 71])
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => fakePixels.buffer,
      headers: { get: () => null },
    })

    const { buffer, contentType } = await proxyTile('https://example.com/tile.png')
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBe(4)
    expect(contentType).toBe('image/png')
  })

  it('throws on fetch error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(proxyTile('https://example.com/missing.png')).rejects.toThrow(
      'Tile fetch error: 404'
    )
  })
})
