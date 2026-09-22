import { useState, useEffect } from 'react'
import { FitnessSummary } from '../types/index.js'

// The phone pushes to the health service hourly at best, and the backend caches for
// five minutes — polling faster than that cannot surface anything newer
const REFRESH_MS = 5 * 60 * 1000

export function useFitness() {
  const [data, setData] = useState<FitnessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/fitness')
        if (!res.ok) throw new Error(`Fitness API error: ${res.status}`)
        const json = (await res.json()) as FitnessSummary
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error')
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

  return { data, loading, error }
}
