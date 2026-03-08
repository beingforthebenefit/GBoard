import { WeatherResponse, WeatherForecastDay } from '../types/index.js'

const OWM_BASE = 'https://api.openweathermap.org/data/2.5'

interface OWMCurrentResponse {
  main: { temp: number; feels_like: number; humidity: number }
  weather: { description: string; icon: string }[]
  wind: { speed: number }
  sys: { sunrise: number; sunset: number }
}

interface OWMForecastItem {
  dt: number
  dt_txt: string
  main: { temp_max: number; temp_min: number }
  weather: { icon: string; description: string }[]
}

interface OWMForecastResponse {
  list: OWMForecastItem[]
  city?: { timezone?: number }
}

interface CacheEntry {
  data: WeatherResponse
  fetchedAt: number
}

let cache: CacheEntry | null = null
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function fetchWeather(): Promise<WeatherResponse> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data
  }

  const key = process.env.OPENWEATHER_API_KEY
  const lat = process.env.WEATHER_LAT
  const lon = process.env.WEATHER_LON

  if (!key || !lat || !lon) {
    throw new Error('Missing OPENWEATHER_API_KEY, WEATHER_LAT, or WEATHER_LON env vars')
  }

  const params = `lat=${lat}&lon=${lon}&units=imperial&appid=${key}`

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${OWM_BASE}/weather?${params}`),
    fetch(`${OWM_BASE}/forecast?${params}`),
  ])

  if (!currentRes.ok) throw new Error(`OWM current weather error: ${currentRes.status}`)
  if (!forecastRes.ok) throw new Error(`OWM forecast error: ${forecastRes.status}`)

  const current = (await currentRes.json()) as OWMCurrentResponse
  const forecast = (await forecastRes.json()) as OWMForecastResponse

  const data: WeatherResponse = {
    current: {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      description: current.weather[0]?.description ?? '',
      icon: current.weather[0]?.icon ?? '',
      humidity: current.main.humidity,
      windSpeed: Math.round(current.wind.speed),
      sunrise: current.sys.sunrise,
      sunset: current.sys.sunset,
    },
    forecast: buildForecast(forecast.list, forecast.city?.timezone ?? 0),
  }

  cache = { data, fetchedAt: Date.now() }
  return data
}

function formatDateKey(unixSeconds: number, timezoneOffsetSeconds: number): string {
  const d = new Date((unixSeconds + timezoneOffsetSeconds) * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localHour(unixSeconds: number, timezoneOffsetSeconds: number): number {
  return new Date((unixSeconds + timezoneOffsetSeconds) * 1000).getUTCHours()
}

export function buildForecast(
  items: OWMForecastItem[],
  timezoneOffsetSeconds = 0,
  nowMs = Date.now()
): WeatherForecastDay[] {
  // Group 3-hour slots by local forecast date (location timezone)
  const byDate = new Map<string, OWMForecastItem[]>()

  for (const item of items) {
    const date = formatDateKey(item.dt, timezoneOffsetSeconds)
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(item)
  }

  const today = formatDateKey(Math.floor(nowMs / 1000), timezoneOffsetSeconds)
  const days: WeatherForecastDay[] = []

  for (const date of [...byDate.keys()].sort()) {
    const slots = byDate.get(date)!
    if (date === today) continue // skip today
    if (days.length >= 3) break

    const high = Math.round(Math.max(...slots.map((s) => s.main.temp_max)))
    const low = Math.round(Math.min(...slots.map((s) => s.main.temp_min)))

    // Prefer the local midday slot (12:00) for icon/description; fallback to nearest to noon.
    const midday =
      slots.find((s) => localHour(s.dt, timezoneOffsetSeconds) === 12) ??
      [...slots].sort(
        (a, b) =>
          Math.abs(localHour(a.dt, timezoneOffsetSeconds) - 12) -
          Math.abs(localHour(b.dt, timezoneOffsetSeconds) - 12)
      )[0]

    days.push({
      date,
      high,
      low,
      icon: midday.weather[0]?.icon ?? '',
      description: midday.weather[0]?.description ?? '',
    })
  }

  return days
}

// Export for testing
export function _resetCache() {
  cache = null
}
