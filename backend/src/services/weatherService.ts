import { WeatherResponse, WeatherForecastDay, WeatherForecastHour } from '../types/index.js'

const OWM_BASE = 'https://api.openweathermap.org/data/2.5'

interface OWMCurrentResponse {
  main: { temp: number; feels_like: number; humidity: number; pressure: number }
  weather: { description: string; icon: string }[]
  wind: { speed: number; deg?: number; gust?: number }
  sys: { sunrise: number; sunset: number }
  visibility?: number
}

interface OWMForecastItem {
  dt: number
  dt_txt: string
  main: { temp_max: number; temp_min: number }
  weather: { icon: string; description: string }[]
  pop?: number
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

  const tz = forecast.city?.timezone ?? 0

  const tempC = (current.main.temp - 32) * (5 / 9)
  const dewC = tempC - (100 - current.main.humidity) / 5
  const dewPointF = Math.round(dewC * (9 / 5) + 32)

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const windDirection = current.wind.deg != null ? dirs[Math.round(current.wind.deg / 45) % 8] : ''

  const data: WeatherResponse = {
    current: {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      description: current.weather[0]?.description ?? '',
      icon: current.weather[0]?.icon ?? '',
      humidity: current.main.humidity,
      windSpeed: Math.round(current.wind.speed),
      windDirection,
      windGust: current.wind.gust != null ? Math.round(current.wind.gust) : null,
      pressure: current.main.pressure,
      visibility: Math.round((current.visibility ?? 10000) / 1609.34),
      dewPoint: dewPointF,
      sunrise: current.sys.sunrise,
      sunset: current.sys.sunset,
    },
    forecast: buildForecast(forecast.list, tz, {
      temp: Math.round(current.main.temp),
      icon: current.weather[0]?.icon ?? '',
      description: current.weather[0]?.description ?? '',
    }),
    hourly: buildHourlyForecast(forecast.list, tz),
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
  currentConditions?: { temp: number; icon: string; description: string }
): WeatherForecastDay[] {
  // Group 3-hour slots by local forecast date (location timezone)
  const byDate = new Map<string, OWMForecastItem[]>()

  for (const item of items) {
    const date = formatDateKey(item.dt, timezoneOffsetSeconds)
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(item)
  }

  const days: WeatherForecastDay[] = []

  // Ensure today is always the first entry, even if OWM has no forecast slots
  // left for today (e.g. late at night)
  const todayKey = formatDateKey(Date.now() / 1000, timezoneOffsetSeconds)

  if (!byDate.has(todayKey) && currentConditions) {
    days.push({
      date: todayKey,
      high: currentConditions.temp,
      low: currentConditions.temp,
      icon: currentConditions.icon,
      description: currentConditions.description,
    })
  }

  for (const date of [...byDate.keys()].sort()) {
    const slots = byDate.get(date)!
    if (days.length >= 6) break

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

export function buildHourlyForecast(
  items: OWMForecastItem[],
  timezoneOffsetSeconds = 0
): WeatherForecastHour[] {
  const now = Date.now() / 1000
  return items
    .filter((item) => item.dt > now)
    .slice(0, 8)
    .map((item) => ({
      time: item.dt + timezoneOffsetSeconds,
      temp: Math.round(item.main.temp_max),
      icon: item.weather[0]?.icon ?? '',
      pop: Math.round((item.pop ?? 0) * 100),
    }))
}

// Export for testing
export function _resetCache() {
  cache = null
}
