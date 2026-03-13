import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildForecast, fetchWeather, _resetCache } from '../src/services/weatherService.js'

const makeSlot = (
  dt_txt: string,
  temp_max: number,
  temp_min: number,
  icon = '01d',
  description = 'clear sky'
) => ({
  dt: Math.floor(Date.parse(dt_txt.replace(' ', 'T') + 'Z') / 1000),
  dt_txt,
  main: { temp_max, temp_min },
  weather: [{ icon, description }],
})

describe('buildForecast', () => {
  it('includes today and returns up to 4 days', () => {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const day2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    const day3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

    const slots = [
      makeSlot(`${today} 12:00:00`, 80, 60),
      makeSlot(`${tomorrow} 09:00:00`, 75, 55),
      makeSlot(`${tomorrow} 12:00:00`, 78, 57, '02d', 'partly cloudy'),
      makeSlot(`${day2} 12:00:00`, 85, 65),
      makeSlot(`${day3} 12:00:00`, 90, 70),
    ]

    const result = buildForecast(slots)
    expect(result).toHaveLength(4)
    expect(result[0].date).toBe(today)
    expect(result[1].date).toBe(tomorrow)
    expect(result[2].date).toBe(day2)
    expect(result[3].date).toBe(day3)
  })

  it('computes correct high and low from multiple slots', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const slots = [
      makeSlot(`${tomorrow} 06:00:00`, 70, 55),
      makeSlot(`${tomorrow} 12:00:00`, 80, 60),
      makeSlot(`${tomorrow} 18:00:00`, 75, 58),
    ]

    const result = buildForecast(slots)
    expect(result[0].high).toBe(80)
    expect(result[0].low).toBe(55)
  })

  it('prefers midday slot icon and description', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const slots = [
      makeSlot(`${tomorrow} 06:00:00`, 70, 55, '01n', 'clear night'),
      makeSlot(`${tomorrow} 12:00:00`, 78, 60, '10d', 'light rain'),
    ]

    const result = buildForecast(slots)
    expect(result[0].icon).toBe('10d')
    expect(result[0].description).toBe('light rain')
  })

  it('falls back to first slot when no midday slot', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const slots = [makeSlot(`${tomorrow} 06:00:00`, 70, 55, '01d', 'sunny')]

    const result = buildForecast(slots)
    expect(result[0].icon).toBe('01d')
  })

  it('returns today when only today slots exist', () => {
    const today = new Date().toISOString().slice(0, 10)
    const slots = [makeSlot(`${today} 12:00:00`, 75, 55)]
    const result = buildForecast(slots)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe(today)
  })

  it('uses forecast timezone for correct day grouping', () => {
    const pstOffset = -8 * 3600
    const slots = [
      makeSlot('2026-03-07 18:00:00', 64, 52, '01d', 'clear'), // Saturday local
      makeSlot('2026-03-08 18:00:00', 65, 53, '02d', 'few clouds'), // Sunday local
      makeSlot('2026-03-09 18:00:00', 66, 54, '03d', 'cloudy'), // Monday local
      makeSlot('2026-03-10 18:00:00', 67, 55, '04d', 'overcast'), // Tuesday local
    ]

    const result = buildForecast(slots, pstOffset)
    expect(result).toHaveLength(4)
    expect(result[0].date).toBe('2026-03-07')
    expect(result[1].date).toBe('2026-03-08')
    expect(result[2].date).toBe('2026-03-09')
    expect(result[3].date).toBe('2026-03-10')
  })
})

describe('fetchWeather', () => {
  beforeEach(() => {
    _resetCache()
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-api-key')
    vi.stubEnv('WEATHER_LAT', '33.44')
    vi.stubEnv('WEATHER_LON', '-94.04')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('throws when env vars are missing', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', '')
    await expect(fetchWeather()).rejects.toThrow(
      'Missing OPENWEATHER_API_KEY, WEATHER_LAT, or WEATHER_LON env vars'
    )
  })

  it('throws when WEATHER_LAT is missing', async () => {
    vi.stubEnv('WEATHER_LAT', '')
    await expect(fetchWeather()).rejects.toThrow(
      'Missing OPENWEATHER_API_KEY, WEATHER_LAT, or WEATHER_LON env vars'
    )
  })

  it('fetches weather and returns structured data', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const currentResponse = {
      main: { temp: 72.5, feels_like: 70.1, humidity: 45 },
      weather: [{ description: 'clear sky', icon: '01d' }],
      wind: { speed: 5.2 },
      sys: { sunrise: 1700000000, sunset: 1700040000 },
    }
    const forecastResponse = {
      list: [makeSlot(`${today} 12:00:00`, 75, 60, '01d', 'clear sky')],
      city: { timezone: -18000 },
    }

    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(currentResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(forecastResponse),
        })
    )

    const result = await fetchWeather()
    expect(result.current.temp).toBe(73)
    expect(result.current.description).toBe('clear sky')
    expect(result.current.icon).toBe('01d')
    expect(result.current.humidity).toBe(45)
    expect(result.current.windSpeed).toBe(5)
    expect(result.current.sunrise).toBe(1700000000)
    expect(result.current.sunset).toBe(1700040000)
    expect(result.forecast.length).toBeGreaterThanOrEqual(1)
  })

  it('returns cached data on subsequent calls within TTL', async () => {
    const currentResponse = {
      main: { temp: 72, feels_like: 70, humidity: 45 },
      weather: [{ description: 'clear', icon: '01d' }],
      wind: { speed: 5 },
      sys: { sunrise: 1700000000, sunset: 1700040000 },
    }
    const today = new Date().toISOString().slice(0, 10)
    const forecastResponse = {
      list: [makeSlot(`${today} 12:00:00`, 75, 60)],
      city: { timezone: 0 },
    }

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(currentResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(forecastResponse),
      })

    vi.stubGlobal('fetch', mockFetch)

    const first = await fetchWeather()
    const second = await fetchWeather()

    expect(first).toEqual(second)
    // fetch should only be called twice (once for current, once for forecast) — not 4 times
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws on non-ok current weather response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    )

    await expect(fetchWeather()).rejects.toThrow('OWM current weather error: 401')
  })

  it('throws on non-ok forecast response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              main: { temp: 72, feels_like: 70, humidity: 45 },
              weather: [{ description: 'clear', icon: '01d' }],
              wind: { speed: 5 },
              sys: { sunrise: 1700000000, sunset: 1700040000 },
            }),
        })
        .mockResolvedValueOnce({ ok: false, status: 500 })
    )

    await expect(fetchWeather()).rejects.toThrow('OWM forecast error: 500')
  })
})
