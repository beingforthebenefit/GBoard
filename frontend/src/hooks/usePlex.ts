import { useState, useEffect, useMemo } from 'react'
import { PlexSession } from '../types/index.js'

const REFRESH_MS = 30 * 1000 // 30 seconds
const PLAYBACK_TICK_MS = 1000 // smooth playback between polls

export function usePlex() {
  const [baseSessions, setBaseSessions] = useState<PlexSession[]>([])
  const [lastSyncAtMs, setLastSyncAtMs] = useState<number>(Date.now())
  const [nowMs, setNowMs] = useState<number>(Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/plex')
        if (!res.ok) throw new Error(`Plex API error: ${res.status}`)
        const json = (await res.json()) as {
          sessions?: PlexSession[]
          session?: PlexSession | null
        }
        if (!cancelled) {
          const sessions = Array.isArray(json.sessions)
            ? json.sessions
            : json.session
              ? [json.session]
              : []
          setBaseSessions(sessions)
          const syncTs = Date.now()
          setLastSyncAtMs(syncTs)
          setNowMs(syncTs)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const tickId = setInterval(() => setNowMs(Date.now()), PLAYBACK_TICK_MS)
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(tickId)
      clearInterval(id)
    }
  }, [])

  const sessions = useMemo(() => {
    const elapsedMs = Math.max(nowMs - lastSyncAtMs, 0)
    return baseSessions.map((session) => {
      if (session.playerState !== 'playing') return session
      return {
        ...session,
        viewOffset: Math.min(session.viewOffset + elapsedMs, session.duration),
      }
    })
  }, [baseSessions, nowMs, lastSyncAtMs])

  return { sessions, loading, error }
}
