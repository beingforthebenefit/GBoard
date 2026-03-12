import { useState, useEffect } from 'react'
import { RadarData } from '../types/index.js'

const REFRESH_MS = 5 * 60 * 1000 // 5 minutes

export function useRadar() {
  const [data, setData] = useState<RadarData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/weather/radar')
        if (!res.ok) throw new Error(`Radar API error: ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setData(json)
        }
      } catch {
        // Silently fail — radar is non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { data, loading }
}
