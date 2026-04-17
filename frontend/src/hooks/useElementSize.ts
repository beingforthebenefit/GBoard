import { RefObject, useEffect, useState } from 'react'

export interface ElementSize {
  width: number
  height: number
}

// Returns the element's CSS size multiplied by devicePixelRatio (for retina-sharp assets).
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize | null {
  const [size, setSize] = useState<ElementSize | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return
      const dpr = window.devicePixelRatio || 1
      setSize((prev) => {
        const next = { width: Math.ceil(w * dpr), height: Math.ceil(h * dpr) }
        if (prev && prev.width === next.width && prev.height === next.height) return prev
        return next
      })
    }

    update(el.clientWidth, el.clientHeight)

    if (typeof ResizeObserver === 'undefined') return

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      update(entry.contentRect.width, entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return size
}
