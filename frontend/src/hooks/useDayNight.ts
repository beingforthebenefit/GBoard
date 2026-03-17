import { useEffect, useState } from 'react'
import { WeatherData } from '../types/index.js'

export type Theme = 'day' | 'night'

type AdminTheme = 'auto' | 'light' | 'dark'

export function useDayNight(weather: WeatherData | null): Theme {
  const [adminTheme, setAdminTheme] = useState<AdminTheme>('auto')
  const [theme, setTheme] = useState<Theme>(() => guessTheme(weather))

  // Poll admin theme preference every 10s
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const res = await fetch('/admin/theme', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { theme: AdminTheme }
        if (['auto', 'light', 'dark'].includes(data.theme)) {
          setAdminTheme(data.theme)
        }
      } catch {
        // Ignore — will retry
      }
    }
    fetchTheme()
    const id = setInterval(fetchTheme, 10_000)
    return () => clearInterval(id)
  }, [])

  // Resolve theme from admin preference + weather data
  useEffect(() => {
    if (adminTheme === 'light') {
      setTheme('day')
    } else if (adminTheme === 'dark') {
      setTheme('night')
    } else {
      setTheme(guessTheme(weather))
    }
  }, [adminTheme, weather])

  // Re-evaluate auto mode every minute
  useEffect(() => {
    if (adminTheme !== 'auto') return
    const id = setInterval(() => setTheme(guessTheme(weather)), 60_000)
    return () => clearInterval(id)
  }, [weather, adminTheme])

  // Apply class to <html> so CSS variables kick in
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'night')
    root.classList.toggle('light', theme === 'day')
  }, [theme])

  return theme
}

function guessTheme(weather: WeatherData | null): Theme {
  const nowUnix = Math.floor(Date.now() / 1000)
  if (weather) {
    const { sunrise, sunset } = weather.current
    return nowUnix >= sunrise && nowUnix < sunset ? 'day' : 'night'
  }
  // Fallback: 7am–7pm = day
  const hour = new Date().getHours()
  return hour >= 7 && hour < 19 ? 'day' : 'night'
}
