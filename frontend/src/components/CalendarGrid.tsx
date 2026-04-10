import { CSSProperties } from 'react'
import { CalendarEvent } from '../types/index.js'

const DEFAULT_COLORS = ['#60a5fa', '#6366f1', '#a78bfa', '#f472b6', '#fb923c', '#94a3b8']
const HOUR_START = 9
const HOUR_END = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const GUTTER_W = 44

interface CalendarGridProps {
  events: CalendarEvent[]
  loading: boolean
  numDays?: number
  hourHeight?: number
  eventColors?: string[]
  className?: string
  style?: CSSProperties
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDays(n: number): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatDayHeader(d: Date, isToday: boolean): string {
  if (isToday) return 'Today'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
}

function formatHour(h: number): string {
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function formatTime(d: Date): string {
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${m}${ampm}`
}

function eventLayout(
  start: Date,
  end: Date,
  hourPx: number
): { top: number; height: number } | null {
  const startH = start.getHours() + start.getMinutes() / 60
  // Events crossing midnight have endH=0 from getHours(), which incorrectly fails
  // the HOUR_START guard. Use 24 for any end that falls on a different calendar day.
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  const endH = sameDay ? end.getHours() + end.getMinutes() / 60 : 24
  if (endH <= HOUR_START || startH >= HOUR_END) return null
  const clampedStart = Math.max(startH, HOUR_START)
  const clampedEnd = Math.min(endH, HOUR_END)
  return {
    top: (clampedStart - HOUR_START) * hourPx,
    height: Math.max((clampedEnd - clampedStart) * hourPx, 20),
  }
}

export function CalendarGrid({
  events,
  loading,
  numDays = 5,
  hourHeight = 32,
  eventColors = DEFAULT_COLORS,
  className = '',
  style,
}: CalendarGridProps) {
  if (loading) return null

  const days = getDays(numDays)
  const todayStr = dayKey(days[0])
  const now = new Date()
  const nowH = now.getHours() + now.getMinutes() / 60
  const nowPct =
    nowH >= HOUR_START && nowH < HOUR_END ? ((nowH - HOUR_START) / TOTAL_HOURS) * 100 : null
  const gridHeight = TOTAL_HOURS * hourHeight

  return (
    <div className={`flex flex-col overflow-hidden ${className}`} style={style}>
      {/* Day headers */}
      <div className="flex flex-shrink-0 mb-1" style={{ paddingLeft: GUTTER_W }}>
        {days.map((d) => {
          const key = dayKey(d)
          return (
            <div
              key={key}
              className="flex-1 text-center text-sm font-semibold truncate px-0.5"
              style={{
                color:
                  key === todayStr ? 'var(--cal-accent, #fde047)' : 'var(--cal-day, var(--text-3))',
              }}
            >
              {formatDayHeader(d, key === todayStr)}
            </div>
          )
        })}
      </div>

      {/* All-day events */}
      <div className="flex flex-shrink-0 mb-1" style={{ paddingLeft: GUTTER_W }}>
        {days.map((d) => {
          const key = dayKey(d)
          // Include multi-day all-day events on every day they span.
          // iCal DTEND is exclusive, so a 1-day event on Apr 10 has end=Apr 11.
          const allDay = events.filter((e) => {
            if (!e.allDay) return false
            const startKey = dayKey(new Date(e.start))
            const endKey = dayKey(new Date(e.end))
            return startKey <= key && key < endKey
          })
          return (
            <div key={key} className="flex-1 px-0.5 min-h-[16px]">
              {allDay.map((e) => (
                <div
                  key={e.id}
                  className="rounded-md px-1 text-xs truncate mb-0.5"
                  style={{
                    backgroundColor: eventColors[(e.calendarIndex ?? 0) % eventColors.length],
                    color: 'var(--cal-event-text, #fff)',
                  }}
                >
                  {e.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: gridHeight }}>
          {/* Hour gutter */}
          <div className="flex-shrink-0 relative" style={{ width: GUTTER_W }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-1 text-sm leading-none"
                style={{ top: i * hourHeight - 6, color: 'var(--cal-gutter, var(--text-4))' }}
              >
                {formatHour(HOUR_START + i)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const key = dayKey(d)
            const isToday = key === todayStr
            // Include events that overlap this day, not just those that start on it.
            // d is already midnight of this day; dayEnd is midnight of the next.
            const dayEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000)
            const timed = events.filter(
              (e) => !e.allDay && new Date(e.start) < dayEnd && new Date(e.end) > d
            )
            return (
              <div
                key={key}
                className="flex-1 relative border-l"
                style={{
                  borderColor: 'var(--cal-grid, var(--cal-border, rgba(255,255,255,0.1)))',
                  backgroundColor: isToday
                    ? 'var(--cal-today-bg, rgba(255,255,255,0.03))'
                    : undefined,
                }}
              >
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-t"
                    style={{
                      top: i * hourHeight,
                      borderColor:
                        i === 0
                          ? 'var(--cal-grid-strong, var(--cal-border, rgba(255,255,255,0.15)))'
                          : 'var(--cal-grid, var(--cal-border, rgba(255,255,255,0.06)))',
                    }}
                  />
                ))}

                {/* Now indicator */}
                {isToday && nowPct !== null && (
                  <div
                    className="absolute w-full z-10"
                    style={{
                      top: `${nowPct}%`,
                      height: 2,
                      backgroundColor: 'var(--cal-accent, #fbbf24)',
                    }}
                  />
                )}

                {/* Event blocks */}
                {timed.map((e) => {
                  const eventStart = new Date(e.start)
                  // For events that started before this day, use midnight of this day as
                  // the layout start so the block appears at the top of the visible grid.
                  const layoutStart = eventStart < d ? d : eventStart
                  const layout = eventLayout(layoutStart, new Date(e.end), hourHeight)
                  if (!layout) return null
                  const color = eventColors[(e.calendarIndex ?? 0) % eventColors.length]
                  return (
                    <div
                      key={e.id}
                      className="absolute left-0.5 right-0.5 rounded-xl px-1.5 py-0.5 overflow-hidden z-20"
                      style={{
                        top: layout.top + 1,
                        height: layout.height - 2,
                        backgroundColor: color + 'b3',
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div
                        className="text-sm leading-tight font-medium truncate"
                        style={{ color: 'var(--cal-event-text, #fff)' }}
                      >
                        {e.title}
                      </div>
                      {layout.height > 28 && (
                        <div
                          className="text-xs leading-tight truncate"
                          style={{ color: 'var(--cal-event-time, rgba(255,255,255,0.6))' }}
                        >
                          {formatTime(new Date(e.start))} &ndash; {formatTime(new Date(e.end))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
