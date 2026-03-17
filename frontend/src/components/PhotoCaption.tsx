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

function formatLocation(loc: { city?: string; state?: string; country?: string }): string | null {
  const isUS = loc.country === 'United States'
  const parts: string[] = []
  if (loc.city) parts.push(loc.city)
  if (loc.state) parts.push(loc.state)
  if (!isUS && loc.country) parts.push(loc.country)
  return parts.length > 0 ? parts.join(', ') : null
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
