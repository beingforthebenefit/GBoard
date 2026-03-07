import { useEffect, useRef } from 'react'

const POLL_MS = 30 * 1000 // 30 seconds

export function useVersion() {
  const initialStartedAt = useRef<number | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/version')
        if (!res.ok) return
        const { startedAt } = (await res.json()) as { startedAt: number }

        if (initialStartedAt.current === null) {
          // First successful fetch — record the baseline
          initialStartedAt.current = startedAt
        } else if (startedAt !== initialStartedAt.current) {
          // Server restarted (new deploy) — reload the page
          window.location.reload()
        }
      } catch {
        // Network error — ignore, will retry on next poll
      }
    }

    check()
    const id = setInterval(check, POLL_MS)
    return () => clearInterval(id)
  }, [])
}
