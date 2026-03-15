import { useEffect, useRef, useState } from 'react'

/**
 * Returns the current pixel height of the referenced element,
 * updating whenever it resizes. Useful for widgets that need to
 * calculate how many items fit without scrolling.
 */
export function useAvailableHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const ro = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, height }
}
