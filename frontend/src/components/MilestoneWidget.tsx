import { useClock } from '../hooks/useClock.js'
import { computeMilestoneProgress } from '../utils/milestones.js'

interface MilestoneWidgetProps {
  sobrietyDate: string
  className?: string
}

const RING_R = 26
const CIRCUMFERENCE = 2 * Math.PI * RING_R

/** Countdown to the next sobriety milestone with a progress ring */
export function MilestoneWidget({ sobrietyDate, className = '' }: MilestoneWidgetProps) {
  const now = useClock()
  const { next, daysRemaining, totalDays, progress } = computeMilestoneProgress(
    new Date(sobrietyDate),
    now
  )

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 64 64" className="w-16 h-16 flex-shrink-0">
        <circle
          cx="32"
          cy="32"
          r={RING_R}
          fill="none"
          stroke="var(--progress-bg, rgba(128, 128, 128, 0.25))"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={RING_R}
          fill="none"
          stroke="var(--milestone-ring, var(--sober-text, #b8553a))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${progress * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform="rotate(-90 32 32)"
        />
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="var(--milestone-ring, var(--sober-text, #b8553a))"
          className="tabular-nums"
        >
          {daysRemaining}
        </text>
      </svg>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-snug" style={{ color: 'var(--text, inherit)' }}>
          {daysRemaining === 0
            ? `${next.label} — today! 🎉`
            : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} to ${next.label}`}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-3, inherit)' }}>
          {totalDays.toLocaleString()} days strong
        </div>
      </div>
    </div>
  )
}
