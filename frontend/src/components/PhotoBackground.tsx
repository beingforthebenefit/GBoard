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

function LayeredPhoto({
  src,
  opacity,
  transitionMs,
}: {
  src: string
  opacity: number
  transitionMs: number
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        opacity,
        transition: `opacity ${transitionMs}ms ease-in-out`,
      }}
    >
      {/* Back layer: fills the viewport, blurred and darkened */}
      <img src={src} className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl" alt="" />
      <div className="absolute inset-0 bg-black/60" />

      {/* Front layer: sharp image fit to screen width */}
      <img src={src} className="absolute inset-0 w-full h-full object-contain" alt="" />
    </div>
  )
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

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* Current photo group */}
      <LayeredPhoto
        src={shuffled[currentIndex]}
        opacity={isTransitioning ? 0 : 1}
        transitionMs={transitionMs}
      />
      {/* Next photo group */}
      <LayeredPhoto
        src={shuffled[nextIndex % shuffled.length]}
        opacity={isTransitioning ? 1 : 0}
        transitionMs={transitionMs}
      />
      {/* Global readability overlay */}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  )
}
