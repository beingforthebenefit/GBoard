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
    forecast: buildForecast(forecast.list),
  }

  cache = { data, fetchedAt: Date.now() }
  return data
}

export function buildForecast(items: OWMForecastItem[]): WeatherForecastDay[] {
  // Group 3-hour slots by date, pick high/low, pick icon from midday slot
  const byDate = new Map<string, OWMForecastItem[]>()

  for (const item of items) {
    const date = item.dt_txt.slice(0, 10) // "YYYY-MM-DD"
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(item)
  }

  const today = new Date().toISOString().slice(0, 10)
  const days: WeatherForecastDay[] = []

  for (const [date, slots] of byDate) {
    if (date === today) continue // skip today
    if (days.length >= 3) break

    const high = Math.round(Math.max(...slots.map((s) => s.main.temp_max)))
    const low = Math.round(Math.min(...slots.map((s) => s.main.temp_min)))

    // Prefer the midday slot (12:00) for icon/description; fallback to first
    const midday = slots.find((s) => s.dt_txt.includes('12:00')) ?? slots[0]

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
