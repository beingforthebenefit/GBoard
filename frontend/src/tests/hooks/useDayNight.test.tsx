import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDayNight } from '../../hooks/useDayNight.js'
import { WeatherData } from '../../types/index.js'

// Helper to build minimal WeatherData with specific sunrise/sunset unix timestamps
function makeWeather(sunrise: number, sunset: number): WeatherData {
  return {
    current: {
      temp: 70,
      feelsLike: 68,
      humidity: 50,
      description: 'clear sky',
      icon: '01d',
      windSpeed: 5,
      windDirection: 'N',
      windGust: null,
      sunrise,
      sunset,
      dewPoint: 50,
      pressure: 1013,
      visibility: 10,
    },
    forecast: [],
    hourly: [],
  }
}

// Helper to build an admin theme fetch response
function adminThemeResponse(theme: 'auto' | 'light' | 'dark') {
  return Promise.resolve({
    ok: true,
    json: async () => ({ theme }),
  } as Response)
}

describe('useDayNight', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
    // Default: admin endpoint returns 'auto' (no override)
    fetchMock.mockResolvedValue(adminThemeResponse('auto'))
    // Clean up html classes before each test
    document.documentElement.classList.remove('dark', 'light')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    fetchMock.mockReset()
    document.documentElement.classList.remove('dark', 'light')
  })

  // Flush pending microtasks (fetch + setState effects)
  async function flush() {
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('returns "day" during daytime hours when no weather data', async () => {
    // Set time to 10am (within 7am–7pm fallback day window)
    vi.setSystemTime(new Date('2025-01-01T10:00:00'))

    const { result } = renderHook(() => useDayNight(null))
    await flush()

    expect(result.current).toBe('day')
  })

  it('returns "night" during nighttime hours when no weather data', async () => {
    // Set time to 11pm (outside 7am–7pm fallback day window)
    vi.setSystemTime(new Date('2025-01-01T23:00:00'))

    const { result } = renderHook(() => useDayNight(null))
    await flush()

    expect(result.current).toBe('night')
  })

  it('returns "day" when admin theme is "light"', async () => {
    // Set time to nighttime so auto would return 'night'
    vi.setSystemTime(new Date('2025-01-01T23:00:00'))
    fetchMock.mockResolvedValue(adminThemeResponse('light'))

    const { result } = renderHook(() => useDayNight(null))
    await flush()

    expect(result.current).toBe('day')
  })

  it('returns "night" when admin theme is "dark"', async () => {
    // Set time to daytime so auto would return 'day'
    vi.setSystemTime(new Date('2025-01-01T10:00:00'))
    fetchMock.mockResolvedValue(adminThemeResponse('dark'))

    const { result } = renderHook(() => useDayNight(null))
    await flush()

    expect(result.current).toBe('night')
  })

  it('returns "day" when current time is between sunrise and sunset', async () => {
    // sunrise = 1700000000, sunset = 1700040000
    // midpoint between them is definitely daytime
    const sunrise = 1700000000
    const sunset = 1700040000
    const midpoint = Math.floor((sunrise + sunset) / 2)

    vi.setSystemTime(new Date(midpoint * 1000))
    const weather = makeWeather(sunrise, sunset)

    const { result } = renderHook(() => useDayNight(weather))
    await flush()

    expect(result.current).toBe('day')
  })

  it('returns "night" when current time is after sunset', async () => {
    const sunrise = 1700000000
    const sunset = 1700040000
    // Set time well after sunset
    vi.setSystemTime(new Date((sunset + 7200) * 1000))
    const weather = makeWeather(sunrise, sunset)

    const { result } = renderHook(() => useDayNight(weather))
    await flush()

    expect(result.current).toBe('night')
  })

  it('returns "night" when current time is before sunrise', async () => {
    const sunrise = 1700000000
    const sunset = 1700040000
    // Set time well before sunrise
    vi.setSystemTime(new Date((sunrise - 3600) * 1000))
    const weather = makeWeather(sunrise, sunset)

    const { result } = renderHook(() => useDayNight(weather))
    await flush()

    expect(result.current).toBe('night')
  })

  it('applies "dark" class to html element when theme is "night"', async () => {
    vi.setSystemTime(new Date('2025-01-01T23:00:00'))

    renderHook(() => useDayNight(null))
    await flush()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('applies "light" class to html element when theme is "day"', async () => {
    vi.setSystemTime(new Date('2025-01-01T10:00:00'))

    renderHook(() => useDayNight(null))
    await flush()

    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('removes "dark" class when switching from night to day via admin override', async () => {
    // Start at night with auto mode
    vi.setSystemTime(new Date('2025-01-01T23:00:00'))
    fetchMock.mockResolvedValue(adminThemeResponse('auto'))

    const { rerender } = renderHook(() => useDayNight(null))
    await flush()
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Now the admin endpoint returns 'light'
    fetchMock.mockResolvedValue(adminThemeResponse('light'))

    // Advance polling interval (10s) to trigger re-fetch
    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    rerender()
    await flush()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('polls the admin theme endpoint', async () => {
    vi.setSystemTime(new Date('2025-01-01T10:00:00'))

    renderHook(() => useDayNight(null))
    await flush()

    expect(fetchMock).toHaveBeenCalledWith('/admin/theme', { cache: 'no-store' })
  })

  it('handles admin endpoint failure gracefully (stays on guessed theme)', async () => {
    vi.setSystemTime(new Date('2025-01-01T10:00:00'))
    fetchMock.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useDayNight(null))
    await flush()

    // Falls back to guessTheme (10am = day)
    expect(result.current).toBe('day')
  })
})
