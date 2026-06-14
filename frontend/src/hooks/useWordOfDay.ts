import { useState, useEffect } from 'react'
import { WordOfDay } from '../types/index.js'

// The word only changes once per day; poll hourly so the board picks up the rollover.
const REFRESH_MS = 60 * 60 * 1000

export function useWordOfDay() {
  const [word, setWord] = useState<WordOfDay | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/word')
        if (!res.ok) throw new Error(`Word API error: ${res.status}`)
        const json = (await res.json()) as WordOfDay
        if (!cancelled) setWord(json)
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

  return { word, loading }
}
