import { computeMoonPhase, litPath } from '../utils/moonPhase.js'

interface MoonPhaseProps {
  date?: Date
  showLabel?: boolean
  className?: string
}

export function MoonPhase({ date, showLabel = true, className = '' }: MoonPhaseProps) {
  const { phase, illumination, name } = computeMoonPhase(date ?? new Date())

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg viewBox="0 0 80 80" className="w-full max-w-[88px]" role="img" aria-label={name}>
        <circle
          cx="40"
          cy="40"
          r="30"
          fill="var(--moon-dark, #1c2236)"
          stroke="var(--moon-ring, rgba(255, 255, 255, 0.15))"
          strokeWidth="1"
        />
        <path d={litPath(phase)} fill="var(--moon-lit, #e8e4d4)" />
      </svg>
      {showLabel && (
        <div className="text-center mt-1">
          <div className="text-xs" style={{ color: 'var(--text-2, inherit)' }}>
            {name}
          </div>
          <div className="text-[10px] tabular-nums" style={{ color: 'var(--text-3, inherit)' }}>
            {Math.round(illumination * 100)}% lit
          </div>
        </div>
      )}
    </div>
  )
}
