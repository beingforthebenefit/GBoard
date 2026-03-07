import { useState, useEffect } from 'react'
import { CalendarEvent } from '../types/index.js'

const REFRESH_MS = 15 * 60 * 1000 // 15 minutes

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/calendar')
        if (!res.ok) throw new Error(`Calendar API error: ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setEvents(json.events ?? [])
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

  return { events, loading, error }
}
