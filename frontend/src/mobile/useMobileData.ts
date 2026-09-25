import { useCallback, useEffect, useRef, useState } from 'react'
import { MobileData, MobileErrors } from './status.js'

/**
 * The mobile view's data, fetched on demand rather than on the kiosk's timers.
 *
 * A phone is opened for a minute and put away, so polling every endpoint on an interval
 * (as the wall display does) would spend battery on answers nobody sees. Instead:
 *   - fetch everything once on open,
 *   - again on pull-to-refresh or the refresh button,
 *   - again when the page comes back to the foreground after REFOCUS_MS,
 *   - and every BACKGROUND_MS while it stays visible — an iPad left open on a stand
 *     should not quietly go stale.
 *
 * Each endpoint fails on its own: one error marks that key, keeps its last good value
 * where the UI wants one, and never blanks the others.
 */
const REFOCUS_MS = 60 * 1000
const BACKGROUND_MS = 5 * 60 * 1000

type Key = keyof MobileData

const ENDPOINTS: Record<Key, { url: string; pick: (json: unknown) => unknown }> = {
  fitness: { url: '/api/fitness', pick: (j) => j },
  weather: { url: '/api/weather', pick: (j) => j },
  events: { url: '/api/calendar', pick: (j) => (j as { events: unknown[] }).events ?? [] },
  media: { url: '/api/media', pick: (j) => (j as { items: unknown[] }).items ?? [] },
  word: { url: '/api/word', pick: (j) => j },
  ha: { url: '/api/homeassistant', pick: (j) => j },
  pihole: { url: '/api/pihole', pick: (j) => j },
  plex: { url: '/api/plex', pick: (j) => (j as { sessions: unknown[] }).sessions ?? [] },
}

const EMPTY: MobileData = {
  fitness: null,
  weather: null,
  events: null,
  media: null,
  word: null,
  ha: null,
  pihole: null,
  plex: null,
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.json()
}

export function useMobileData() {
  const [data, setData] = useState<MobileData>(EMPTY)
  const [errors, setErrors] = useState<MobileErrors>({})
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const lastRun = useRef(0)
  const startedAt = useRef<number | null>(null)

  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current
    setLoading(true)
    const run = (async () => {
      // A deploy restarts the backend. Code-split chunks from the old build are gone
      // by then, so reload rather than let the explorer fail to load later.
      try {
        const v = (await getJson('/api/version')) as { startedAt: number }
        if (startedAt.current === null) startedAt.current = v.startedAt
        else if (v.startedAt !== startedAt.current) {
          window.location.reload()
          return
        }
      } catch {
        // Version is advisory; the data calls below report real failures
      }

      const keys = Object.keys(ENDPOINTS) as Key[]
      const results = await Promise.allSettled(keys.map((k) => getJson(ENDPOINTS[k].url)))
      const nextErrors: MobileErrors = {}
      const fresh: Partial<MobileData> = {}
      results.forEach((r, i) => {
        const k = keys[i]
        if (r.status === 'fulfilled') {
          const target = fresh as Record<Key, unknown>
          target[k] = ENDPOINTS[k].pick(r.value)
          nextErrors[k] = null
        } else {
          nextErrors[k] = r.reason instanceof Error ? r.reason.message : 'failed'
        }
      })
      setData((prev) => ({ ...prev, ...fresh }))
      setErrors(nextErrors)
      setUpdatedAt(new Date())
      lastRun.current = Date.now()
    })().finally(() => {
      setLoading(false)
      inFlight.current = null
    })
    inFlight.current = run
    return run
  }, [])

  useEffect(() => {
    refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRun.current > REFOCUS_MS) {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, BACKGROUND_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [refresh])

  return { data, errors, loading, updatedAt, refresh }
}
