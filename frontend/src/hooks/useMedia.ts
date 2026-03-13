import { useState, useEffect } from 'react'
import { UpcomingItem } from '../types/index.js'

const REFRESH_MS = 30 * 60 * 1000 // 30 minutes

export function useMedia() {
  const [items, setItems] = useState<UpcomingItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/media')
        if (!res.ok) throw new Error(`Media API error: ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setItems(json.items)
          setTotalItems(json.totalItems ?? json.items?.length ?? 0)
        }
      } catch {
        // silent — widget just stays empty
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

  return { items, totalItems, loading }
}
