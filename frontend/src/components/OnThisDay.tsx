import { useEffect, useMemo, useRef, useState } from 'react'
import { PhotoInfo } from '../types/index.js'
import { useElementSize } from '../hooks/useElementSize.js'
import { buildThumborUrl } from '../utils/thumbor.js'
import { findMemories } from '../utils/photoMemories.js'

interface OnThisDayProps {
  photos: PhotoInfo[]
  windowDays?: number
  className?: string
}

export function OnThisDay({ photos, windowDays = 3, className = '' }: OnThisDayProps) {
  const memories = useMemo(() => findMemories(photos, new Date(), windowDays), [photos, windowDays])
  const [idx, setIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(containerRef)

  useEffect(() => {
    if (memories.length < 2) return
    const id = setInterval(() => setIdx((i) => (i + 1) % memories.length), 300_000)
    return () => clearInterval(id)
  }, [memories.length])

  if (memories.length === 0) return null

  const { photo, taken, yearsAgo } = memories[idx % memories.length]
  const dateStr = taken.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const locationStr = photo.location?.city
    ? ` · ${photo.location.city}${photo.location.state ? `, ${photo.location.state}` : ''}`
    : ''
  const src = size ? buildThumborUrl(photo.filename, size.width, size.height, 'cover') : null

  return (
    <figure className={`flex flex-col h-full m-0 ${className}`}>
      <div ref={containerRef} className="flex-1 min-h-0 relative overflow-hidden">
        {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      </div>
      <figcaption className="text-xs mt-1 leading-tight opacity-70 flex-shrink-0">
        On this day — {dateStr}
        {locationStr} ({yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago)
      </figcaption>
    </figure>
  )
}
