import { useEffect, useState } from 'react'
import { RadarData } from '../types/index.js'

const GRID = 3
const FRAME_INTERVAL_MS = 500
const PAUSE_MS = 1500

export function RadarTiles({ data, fill = false }: { data: RadarData; fill?: boolean }) {
  const { zoom, centerX, centerY, locX, locY, frameCount } = data
  const offset = Math.floor(GRID / 2)
  const totalFrames = Math.max(1, frameCount)

  const [frameIdx, setFrameIdx] = useState(totalFrames - 1)

  useEffect(() => {
    if (totalFrames < 2) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      setFrameIdx((prev) => {
        const next = prev + 1
        if (next >= totalFrames) {
          setTimeout(() => !cancelled && setFrameIdx(0), PAUSE_MS)
          return prev
        }
        return next
      })
    }
    const id = setInterval(tick, FRAME_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [totalFrames])

  const tiles: { x: number; y: number }[] = []
  for (let dy = -offset; dy <= offset; dy++) {
    for (let dx = -offset; dx <= offset; dx++) {
      tiles.push({ x: centerX + dx, y: centerY + dy })
    }
  }

  const frames = Array.from({ length: totalFrames }, (_, i) => i)
  const isLatest = frameIdx === totalFrames - 1

  return (
    <div
      className={`relative w-full overflow-hidden ${fill ? 'h-full' : ''}`}
      style={fill ? undefined : { aspectRatio: '16 / 9' }}
    >
      <div
        className="absolute left-0 w-full"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID}, 1fr)`,
          aspectRatio: '1',
        }}
      >
        {tiles.map(({ x, y }) => (
          <div key={`${x}-${y}`} className="relative" style={{ aspectRatio: '1' }}>
            <img
              src={`/api/weather/radar/base/${zoom}/${x}/${y}`}
              alt=""
              className="absolute inset-0 w-full h-full block"
            />
            {frames.map((f) => (
              <img
                key={f}
                src={`/api/weather/radar/overlay/${zoom}/${x}/${y}?frame=${f}`}
                alt=""
                className="absolute inset-0 w-full h-full block"
                style={{ opacity: f === frameIdx ? 0.75 : 0 }}
              />
            ))}
          </div>
        ))}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-2 h-2 rounded-full bg-blue-400/80 ring-2 ring-blue-400/40"
            style={{
              left: `${locX * 100}%`,
              top: `${locY * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      </div>
      {totalFrames > 1 && (
        <div className="absolute bottom-1 right-2 flex items-center gap-1 pointer-events-none">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-red-400/90' : 'bg-white/40'}`}
          />
          <span className="text-[9px] text-white/70 font-mono tabular-nums drop-shadow">
            {isLatest ? 'NOW' : `-${(totalFrames - 1 - frameIdx) * 10}m`}
          </span>
        </div>
      )}
    </div>
  )
}
