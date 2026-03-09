import { useState, useEffect, useMemo, useCallback } from 'react'

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

const IMAGE_RETRY_MS = 5 * 1000
const MAX_RETRIES = 2

function withRetryParam(src: string, retryCount: number): string {
  const sep = src.includes('?') ? '&' : '?'
  return `${src}${sep}bgRetry=${retryCount}`
}

function LayeredPhoto({
  src,
  opacity,
  transitionMs,
  onFailed,
}: {
  src: string
  opacity: number
  transitionMs: number
  onFailed?: () => void
}) {
  const [retryCount, setRetryCount] = useState(0)
  const [needsRetry, setNeedsRetry] = useState(false)

  useEffect(() => {
    setRetryCount(0)
    setNeedsRetry(false)
  }, [src])

  useEffect(() => {
    if (!needsRetry) return
    if (retryCount >= MAX_RETRIES) {
      onFailed?.()
      return
    }
    const id = setTimeout(() => {
      setRetryCount((prev) => prev + 1)
      setNeedsRetry(false)
    }, IMAGE_RETRY_MS)
    return () => clearTimeout(id)
  }, [needsRetry, retryCount, onFailed])

  const retrySrc = withRetryParam(src, retryCount)

  const onError = () => setNeedsRetry(true)
  const onLoad = () => setNeedsRetry(false)

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        opacity,
        transition: `opacity ${transitionMs}ms ease-in-out`,
      }}
    >
      {/* Back layer: fills height, blurred, and only lightly darkened */}
      <img
        src={retrySrc}
        onError={onError}
        onLoad={onLoad}
        className="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-xl"
        alt=""
      />
      <div className="absolute inset-0 bg-black/25" />

      {/* Front layer: sharp image fit to screen width */}
      <img
        src={retrySrc}
        onError={onError}
        onLoad={onLoad}
        className="absolute inset-0 w-full h-full object-contain"
        alt=""
      />
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

  const advance = useCallback(() => {
    if (shuffled.length < 2) return
    setCurrentIndex((prev) => (prev + 1) % shuffled.length)
    setNextIndex((prev) => (prev + 1) % shuffled.length)
    setIsTransitioning(false)
  }, [shuffled.length])

  useEffect(() => {
    if (shuffled.length < 2) return

    const timer = setInterval(() => {
      setIsTransitioning(true)
      const timeout = setTimeout(advance, transitionMs)
      return () => clearTimeout(timeout)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [shuffled, intervalMs, transitionMs, advance])

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
        onFailed={advance}
      />
      {/* Next photo group */}
      <LayeredPhoto
        src={shuffled[nextIndex % shuffled.length]}
        opacity={isTransitioning ? 1 : 0}
        transitionMs={transitionMs}
        onFailed={advance}
      />
      {/* Global readability overlay */}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  )
}
