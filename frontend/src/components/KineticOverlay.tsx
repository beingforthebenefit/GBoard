import { ReactNode } from 'react'
import { useClock } from '../hooks/useClock.js'
import { useSoberCounter } from '../hooks/useSoberCounter.js'
import { computeMilestoneProgress } from '../utils/milestones.js'
import { PlexSession } from '../types/index.js'

// Shared floating widgets for the kinetic backdrop themes (Flux, Mosaic).
// Translucent scrims keep text legible over the moving canvas without
// backdrop-blur, which would force the browser to re-blur every frame.

export const TEXT_SHADOW = '0 1px 12px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.4)'

export function Glass({
  children,
  dark,
  className = '',
}: {
  children: ReactNode
  dark: boolean
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{
        background: dark ? 'rgba(8, 10, 20, 0.4)' : 'rgba(255, 255, 255, 0.55)',
        borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }}
    >
      {children}
    </div>
  )
}

export function KineticClock() {
  const now = useClock()
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(now)
  const ampm = parts.find((p) => p.type === 'dayPeriod')?.value ?? ''
  const time = parts
    .filter((p) => p.type !== 'dayPeriod')
    .map((p) => p.value)
    .join('')
    .replace(/\s+/g, '')
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div style={{ textShadow: TEXT_SHADOW }}>
      <div
        className="text-[clamp(3.5rem,9vw,5.5rem)] leading-none font-extralight tabular-nums whitespace-nowrap"
        style={{ color: 'var(--text)' }}
      >
        {time}
        <span className="text-lg font-light ml-2" style={{ color: 'var(--text-2)' }}>
          {ampm}
        </span>
      </div>
      <div className="text-sm font-light mt-1.5 tracking-wide" style={{ color: 'var(--text-2)' }}>
        {dateStr}
      </div>
    </div>
  )
}

// Small, unobtrusive sober line for under the clock — present but not the focus
export function SoberChip({ sobrietyDate }: { sobrietyDate: string }) {
  const { years, months, days } = useSoberCounter(sobrietyDate)
  const { next, daysRemaining } = computeMilestoneProgress(new Date(sobrietyDate), new Date())
  const parts = [years && `${years}y`, months && `${months}m`, `${days}d`].filter(Boolean).join(' ')
  return (
    <div
      className="text-xs font-light mt-2 tracking-wide"
      style={{ color: 'var(--text-2)', textShadow: TEXT_SHADOW }}
    >
      <span style={{ color: 'var(--sober-text)' }}>●</span> Sober {parts}
      <span style={{ color: 'var(--text-3)' }}>
        {' '}
        · {daysRemaining === 0 ? `${next.label} today` : `${daysRemaining}d to ${next.label}`}
      </span>
    </div>
  )
}

export function NowPlaying({ sessions, dark }: { sessions: PlexSession[]; dark: boolean }) {
  if (sessions.length === 0) return null
  const s = sessions[0]
  return (
    <Glass dark={dark} className="px-4 py-2.5 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 pulse-dot" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent-2)' }}>
          Now Playing
        </div>
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {s.title}
          {s.subtitle && (
            <span className="font-light" style={{ color: 'var(--text-3)' }}>
              {' '}
              · {s.subtitle}
            </span>
          )}
        </div>
      </div>
    </Glass>
  )
}
