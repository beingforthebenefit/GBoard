import { CSSProperties } from 'react'
import { PhotoInfo } from '../types/index.js'

interface PhotoCaptionProps {
  photo: PhotoInfo | null
  className?: string
  style?: CSSProperties
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Check if a string is mostly Latin/common characters (not CJK, Arabic, etc.) */
function isLatinText(str: string): boolean {
  // Match Latin letters, digits, spaces, punctuation, accented chars
  const latin = str.replace(/[\p{Script=Latin}\p{N}\s.,'''\-()]/gu, '')
  return latin.length < str.length * 0.3
}

function formatLocation(loc: { city?: string; state?: string }): string | null {
  const city = loc.city && isLatinText(loc.city) ? loc.city : undefined
  const state = loc.state && isLatinText(loc.state) ? loc.state : undefined
  if (city && state) return `${city}, ${state}`
  return city || state || null
}

export function PhotoCaption({ photo, className = '', style }: PhotoCaptionProps) {
  if (!photo) return null

  const location = photo.location ? formatLocation(photo.location) : null
  const date = photo.dateTaken ? formatDate(photo.dateTaken) : null

  if (!location && !date) return null

  const parts = [location, date].filter(Boolean).join(' — ')

  return (
    <div className={className} style={style}>
      {parts}
    </div>
  )
}
