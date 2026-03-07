import { useState, useEffect } from 'react'

interface PhotoBackgroundProps {
  photos: string[]
  intervalMs?: number
  transitionMs?: number
}

export function PhotoBackground({
  photos,
  intervalMs = 5 * 60 * 1000,
  transitionMs = 2000,
}: PhotoBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (photos.length < 2) return

    const timer = setInterval(() => {
      setIsTransitioning(true)
      const timeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length)
        setNextIndex((prev) => (prev + 1) % photos.length)
        setIsTransitioning(false)
      }, transitionMs)
      return () => clearTimeout(timeout)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [photos, intervalMs, transitionMs])

  if (photos.length === 0) {
    return <div className="fixed inset-0 -z-10 bg-gray-900" />
  }

  const imgBase = 'absolute inset-0 w-full h-full object-cover'

  return (
    <div className="fixed inset-0 -z-10">
      {/* Current photo — fades out during transition */}
      <img
        src={photos[currentIndex]}
        className={imgBase}
        style={{
          opacity: isTransitioning ? 0 : 1,
          transition: `opacity ${transitionMs}ms ease-in-out`,
        }}
        alt=""
      />
      {/* Next photo — fades in during transition */}
      <img
        src={photos[nextIndex % photos.length]}
        className={imgBase}
        style={{
          opacity: isTransitioning ? 1 : 0,
          transition: `opacity ${transitionMs}ms ease-in-out`,
        }}
        alt=""
      />
      {/* Subtle dark overlay for readability */}
      <div className="absolute inset-0 bg-black/25" />
    </div>
  )
}
