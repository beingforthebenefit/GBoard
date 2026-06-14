import { windDirToDegrees } from '../utils/wind.js'

interface WindCompassProps {
  speed: number
  direction: string
  gust?: number | null
  className?: string
}

/** Compass dial with a needle pointing the way the wind is blowing */
export function WindCompass({ speed, direction, gust, className = '' }: WindCompassProps) {
  const fromDeg = windDirToDegrees(direction)
  // Weather reports the direction wind comes FROM; the needle points where it blows
  const toDeg = fromDeg != null ? (fromDeg + 180) % 360 : null

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 80 80" className="w-full max-w-[88px]" role="img" aria-label="Wind">
        <circle
          cx="40"
          cy="40"
          r="30"
          fill="none"
          stroke="var(--compass-ring, rgba(255, 255, 255, 0.2))"
          strokeWidth="1.5"
        />
        {(
          [
            ['N', 40, 13],
            ['E', 68, 43],
            ['S', 40, 73],
            ['W', 12, 43],
          ] as const
        ).map(([label, x, y]) => (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="7"
            fill="var(--text-3, rgba(255, 255, 255, 0.5))"
          >
            {label}
          </text>
        ))}
        {toDeg != null && (
          <g transform={`rotate(${toDeg} 40 40)`}>
            <polygon points="40,18 44,42 36,42" fill="var(--compass-needle, #e8a87c)" />
            <polygon points="40,58 44,42 36,42" fill="var(--compass-tail, rgba(255,255,255,0.3))" />
          </g>
        )}
        <circle cx="40" cy="40" r="3" fill="var(--compass-needle, #e8a87c)" />
      </svg>
      <div className="text-xs tabular-nums mt-1" style={{ color: 'var(--text-2, inherit)' }}>
        {speed} mph {direction}
        {gust != null && (
          <span style={{ color: 'var(--text-3, inherit)' }}> · G {Math.round(gust)}</span>
        )}
      </div>
    </div>
  )
}
