import { useState, useEffect, useMemo } from 'react'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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
  const shuffled = useMemo(() => shuffle(photos), [photos])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (shuffled.length < 2) return

    const timer = setInterval(() => {
      setIsTransitioning(true)
      const timeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % shuffled.length)
        setNextIndex((prev) => (prev + 1) % shuffled.length)
        setIsTransitioning(false)
      }, transitionMs)
      return () => clearTimeout(timeout)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [shuffled, intervalMs, transitionMs])

  if (shuffled.length === 0) {
    return <div className="fixed inset-0 -z-10 bg-gray-900" />
  }

  const imgBase = 'absolute inset-0 w-full h-full object-cover'

  return (
    <div className="fixed inset-0 -z-10">
      {/* Current photo — fades out during transition */}
      <img
        src={shuffled[currentIndex]}
        className={imgBase}
        style={{
          opacity: isTransitioning ? 0 : 1,
          transition: `opacity ${transitionMs}ms ease-in-out`,
        }}
        alt=""
      />
      {/* Next photo — fades in during transition */}
      <img
        src={shuffled[nextIndex % shuffled.length]}
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
