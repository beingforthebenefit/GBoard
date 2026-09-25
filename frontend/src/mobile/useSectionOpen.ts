import { useState } from 'react'
import { SectionId } from './status.js'

/** A section's open/closed state, remembered on this device */
function readOpen(id: SectionId, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(`gbm-open-${id}`)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

export function useSectionOpen(id: SectionId, defaultOpen: boolean) {
  const [open, setOpenState] = useState(() => readOpen(id, defaultOpen))
  const setOpen = (v: boolean) => {
    setOpenState(v)
    try {
      localStorage.setItem(`gbm-open-${id}`, v ? '1' : '0')
    } catch {
      // Private browsing: the section just won't remember
    }
  }
  return [open, setOpen] as const
}
