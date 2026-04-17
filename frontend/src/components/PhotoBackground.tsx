import { useState, useEffect, useMemo, useRef, ReactNode } from 'react'
import { PhotoInfo } from '../types/index.js'
import { PhotoCaption } from './PhotoCaption.js'
import { useElementSize } from '../hooks/useElementSize.js'
import { buildThumborUrl } from '../utils/thumbor.js'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface PhotoBackgroundProps {
  photos: PhotoInfo[]
  intervalMs?: number
  transitionMs?: number
  renderCaption?: (photo: PhotoInfo) => ReactNode
  onPhotoChange?: (photo: PhotoInfo) => void
}

const IMAGE_RETRY_MS = 5 * 1000
const MAX_RETRIES = 2

function withRetryParam(src: string, retryCount: number): string {
  const sep = src.includes('?') ? '&' : '?'
  return `${src}${sep}bgRetry=${retryCount}`
}

function PhotoImage({
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
    <img
      src={retrySrc}
      onError={onError}
      onLoad={onLoad}
      className="absolute inset-0 w-full h-full object-cover"
      alt=""
      style={{
        opacity,
        transition: `opacity ${transitionMs}ms ease-in-out`,
        objectPosition: 'center center',
      }}
    />
  )
}

export function PhotoBackground({
  photos,
  intervalMs = 5 * 60 * 1000,
  transitionMs = 2000,
  renderCaption,
  onPhotoChange,
}: PhotoBackgroundProps) {
  const shuffled = useMemo(() => shuffle(photos), [photos])
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(containerRef)

  const [state, setState] = useState({
    a: 0,
    b: 1 % Math.max(shuffled.length, 1),
    bVisible: false,
    nextIndex: 2,
  })

  useEffect(() => {
    if (shuffled.length < 2) return
    let timeoutId: ReturnType<typeof setTimeout>

    const timer = setInterval(() => {
      setState((prev) => ({ ...prev, bVisible: !prev.bVisible }))
      timeoutId = setTimeout(() => {
        setState((prev) => {
          const next = prev.nextIndex % shuffled.length
          if (prev.bVisible) {
            return { ...prev, a: next, nextIndex: prev.nextIndex + 1 }
          } else {
            return { ...prev, b: next, nextIndex: prev.nextIndex + 1 }
          }
        })
      }, transitionMs)
    }, intervalMs)

    return () => {
      clearInterval(timer)
      clearTimeout(timeoutId)
    }
  }, [shuffled, intervalMs, transitionMs])

  const currentPhoto =
    shuffled.length > 0
      ? shuffled[state.bVisible ? state.b % shuffled.length : state.a % shuffled.length]
      : null

  useEffect(() => {
    if (currentPhoto && onPhotoChange) onPhotoChange(currentPhoto)
  }, [currentPhoto, onPhotoChange])

  if (shuffled.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full rounded-2xl"
        style={{ backgroundColor: 'var(--photo-bg)' }}
      />
    )
  }

  const caption = renderCaption ? (
    renderCaption(currentPhoto!)
  ) : (
    <PhotoCaption
      photo={currentPhoto}
      className="absolute bottom-2 left-3 right-3 text-xs font-light z-10 pointer-events-none"
      style={{ color: 'var(--text-3)' }}
    />
  )

  const photoA = shuffled[state.a % shuffled.length]
  const photoB = shuffled[state.b % shuffled.length]
  const srcA = size ? buildThumborUrl(photoA.filename, size.width, size.height, 'cover') : null
  const srcB = size ? buildThumborUrl(photoB.filename, size.width, size.height, 'cover') : null

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden relative"
      style={{ backgroundColor: 'var(--photo-bg)' }}
    >
      {srcA && (
        <PhotoImage
          src={srcA}
          opacity={1}
          transitionMs={0}
          onFailed={() =>
            setState((prev) => ({
              ...prev,
              a: prev.nextIndex % shuffled.length,
              nextIndex: prev.nextIndex + 1,
            }))
          }
        />
      )}
      {srcB && (
        <PhotoImage
          src={srcB}
          opacity={state.bVisible ? 1 : 0}
          transitionMs={transitionMs}
          onFailed={() =>
            setState((prev) => ({
              ...prev,
              b: prev.nextIndex % shuffled.length,
              nextIndex: prev.nextIndex + 1,
            }))
          }
        />
      )}
      {caption}
    </div>
  )
}
