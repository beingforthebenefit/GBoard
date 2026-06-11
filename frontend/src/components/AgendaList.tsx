import { useMemo } from 'react'
import { CalendarEvent } from '../types/index.js'

interface AgendaListProps {
  events: CalendarEvent[]
  loading: boolean
  maxItems?: number
  className?: string
  /** When provided, items render as rotated sticky notes cycling through these colors */
  noteColors?: string[]
}

const NOTE_ROTATIONS = [-1.5, 1.2, -0.8, 1.6, -1.1, 0.9]

function dayLabel(d: Date, now: Date): string {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function timeLabel(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  const d = new Date(event.start)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h % 12 || 12}:${m}${h >= 12 ? 'pm' : 'am'}`
}

/** Glanceable "next things" list — the agenda view CalendarGrid doesn't give you */
export function AgendaList({
  events,
  loading,
  maxItems = 5,
  className = '',
  noteColors,
}: AgendaListProps) {
  const now = new Date()
  const upcoming = useMemo(() => {
    const cutoff = new Date()
    return events
      .filter((e) => new Date(e.end) >= cutoff)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, maxItems)
  }, [events, maxItems])

  if (loading) {
    return (
      <div className={`text-xs ${className}`} style={{ color: 'var(--text-3, inherit)' }}>
        Loading…
      </div>
    )
  }

  if (upcoming.length === 0) {
    return (
      <div className={`text-xs italic ${className}`} style={{ color: 'var(--text-3, inherit)' }}>
        Nothing scheduled
      </div>
    )
  }

  if (noteColors && noteColors.length > 0) {
    return (
      <div className={`flex flex-col gap-2.5 ${className}`}>
        {upcoming.map((event, i) => (
          <div
            key={event.id}
            className="px-3.5 py-2.5 shadow-md text-[#3a3530]"
            style={{
              background: noteColors[i % noteColors.length],
              transform: `rotate(${NOTE_ROTATIONS[i % NOTE_ROTATIONS.length]}deg)`,
            }}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-60">
              {dayLabel(new Date(event.start), now)} · {timeLabel(event)}
            </div>
            <div className="text-sm font-medium leading-snug truncate">{event.title}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {upcoming.map((event) => (
        <div key={event.id} className="flex items-baseline gap-2 text-sm leading-snug">
          <span
            className="text-[11px] w-24 flex-shrink-0 tabular-nums"
            style={{ color: 'var(--text-3, inherit)' }}
          >
            {dayLabel(new Date(event.start), now)}
          </span>
          <span className="truncate flex-1" style={{ color: 'var(--text, inherit)' }}>
            {event.title}
          </span>
          <span
            className="text-[11px] flex-shrink-0 tabular-nums"
            style={{ color: 'var(--text-3, inherit)' }}
          >
            {timeLabel(event)}
          </span>
        </div>
      ))}
    </div>
  )
}
