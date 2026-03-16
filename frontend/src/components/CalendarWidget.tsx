import { CalendarEvent } from '../types/index.js'

interface CalendarWidgetProps {
  events: CalendarEvent[]
  loading: boolean
  className?: string
}

const EVENT_COLORS = [
  '#60a5fa', // blue-400
  '#6366f1', // indigo-500
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#94a3b8', // slate-400
]

const NUM_DAYS = 5

function dayKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDays(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: NUM_DAYS }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatDayLabel(d: Date, isToday: boolean): string {
  if (isToday) return 'Today'
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'p' : 'a'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

export function CalendarWidget({ events, loading, className = '' }: CalendarWidgetProps) {
  if (loading) return null

  const days = getDays()
  const todayStr = dayKey(days[0])

  return (
    <div className={className}>
      <div
        className="text-[11px] font-medium uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-3)' }}
      >
        This Week
      </div>
      <div className="space-y-1.5">
        {days.map((d) => {
          const key = dayKey(d)
          const isToday = key === todayStr
          const dayEvents = events.filter((e) => {
            const eKey = e.start.slice(0, 10)
            return eKey === key
          })

          return (
            <div key={key} className="flex gap-2.5 items-baseline text-sm">
              <div
                className="w-10 flex-shrink-0 font-medium text-xs"
                style={{ color: isToday ? 'var(--cal-accent)' : 'var(--text-3)' }}
              >
                {formatDayLabel(d, isToday)}
              </div>
              <div className="flex-1 min-w-0">
                {dayEvents.length === 0 ? (
                  <span style={{ color: 'var(--text-4)' }}>—</span>
                ) : (
                  dayEvents.map((e) => {
                    const color = EVENT_COLORS[(e.calendarIndex ?? 0) % EVENT_COLORS.length]
                    return (
                      <div key={e.id} className="truncate" style={{ color: 'var(--text-2)' }}>
                        {!e.allDay && (
                          <span style={{ color: 'var(--text-4)' }} className="text-xs">
                            {formatTime(e.start)}–{formatTime(e.end)}{' '}
                          </span>
                        )}
                        <span
                          style={{
                            borderLeft: `2px solid ${color}`,
                            paddingLeft: 5,
                          }}
                        >
                          {e.title}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
