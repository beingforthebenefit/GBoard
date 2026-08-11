import { useState, useEffect } from 'react'
import { HomeAssistantSummary } from '../types/index.js'

const REFRESH_MS = 30 * 1000

export function useHomeAssistant() {
  const [data, setData] = useState<HomeAssistantSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/homeassistant')
        if (!res.ok) throw new Error(`Home Assistant API error: ${res.status}`)
        const json = (await res.json()) as HomeAssistantSummary
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
