import { useState, useEffect } from 'react'
import { PlexSession } from '../types/index.js'

const REFRESH_MS = 30 * 1000 // 30 seconds

export function usePlex() {
  const [session, setSession] = useState<PlexSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/plex')
        if (!res.ok) throw new Error(`Plex API error: ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setSession(json.session ?? null)
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

  return { session, loading, error }
}
