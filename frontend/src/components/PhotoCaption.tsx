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

function formatLocation(loc: { city?: string; state?: string }): string | null {
  if (loc.city && loc.state) return `${loc.city}, ${loc.state}`
  return loc.city || loc.state || null
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
