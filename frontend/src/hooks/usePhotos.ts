import { useState, useEffect } from 'react'
import { PhotoInfo } from '../types/index.js'

const REFRESH_MS = 60 * 60 * 1000 // 60 minutes

export function usePhotos() {
  const [photos, setPhotos] = useState<PhotoInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/photos')
        if (!res.ok) throw new Error(`Photos API error: ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          // Support both old format (string[]) and new format (PhotoInfo[])
          const raw = json.photos ?? []
          const photos: PhotoInfo[] = raw.map((p: string | PhotoInfo) =>
            typeof p === 'string' ? { url: p } : p
          )
          setPhotos(photos)
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

  return { photos, loading, error }
}
