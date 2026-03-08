import { CalendarEvent } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface CalendarWidgetProps {
  events: CalendarEvent[]
  loading: boolean
}

const EVENT_COLORS = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#2dd4bf', // teal-400
]

const HOUR_START = 9
const HOUR_END = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const HOUR_PX = 38 // pixels per hour
const GUTTER_W = 40 // px width of time gutter
const NUM_DAYS = 7

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

function formatDayHeader(d: Date, isToday: boolean): string {
  if (isToday) return 'Today'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
}

function formatHour(h: number): string {
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

/** Clamp event into visible range and return top/height in px, or null if outside range */
function eventLayout(start: Date, end: Date): { top: number; height: number } | null {
  const startH = start.getHours() + start.getMinutes() / 60
  const endH = end.getHours() + end.getMinutes() / 60
  if (endH <= HOUR_START || startH >= HOUR_END) return null
  const clampedStart = Math.max(startH, HOUR_START)
  const clampedEnd = Math.min(endH, HOUR_END)
  return {
    top: (clampedStart - HOUR_START) * HOUR_PX,
    height: Math.max((clampedEnd - clampedStart) * HOUR_PX, 18),
  }
}

export function CalendarWidget({ events, loading }: CalendarWidgetProps) {
  if (loading) {
    return (
      <GlassPanel className="p-4 animate-pulse">
        <div className="h-40 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  const days = getDays()
  const todayKey = dayKey(days[0])
  const now = new Date()
  const nowPct =
    now.getHours() + now.getMinutes() / 60 >= HOUR_START &&
    now.getHours() + now.getMinutes() / 60 < HOUR_END
      ? ((now.getHours() + now.getMinutes() / 60 - HOUR_START) / TOTAL_HOURS) * 100
      : null

  const gridHeight = TOTAL_HOURS * HOUR_PX

  return (
    <GlassPanel className="flex flex-col h-full p-2 overflow-hidden">
      {/* Day headers */}
      <div className="flex flex-shrink-0 mb-1" style={{ paddingLeft: GUTTER_W }}>
        {days.map((d) => {
          const key = dayKey(d)
          const isToday = key === todayKey
          return (
            <div
              key={key}
              className="flex-1 text-center text-sm font-semibold truncate px-0.5"
              style={{ color: isToday ? '#fde047' : 'rgba(255,255,255,0.6)' }}
            >
              {formatDayHeader(d, isToday)}
            </div>
          )
        })}
      </div>

      {/* All-day events row */}
      <div className="flex flex-shrink-0 mb-1" style={{ paddingLeft: GUTTER_W }}>
        {days.map((d) => {
          const key = dayKey(d)
          const allDayEvents = events.filter((e) => e.allDay && dayKey(new Date(e.start)) === key)
          return (
            <div key={key} className="flex-1 px-0.5 min-h-[16px]">
              {allDayEvents.map((e) => (
                <div
                  key={e.id}
                  className="text-white rounded px-1 text-xs truncate mb-0.5"
                  style={{
                    backgroundColor: EVENT_COLORS[(e.calendarIndex ?? 0) % EVENT_COLORS.length],
                  }}
                >
                  {e.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Time grid — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: gridHeight }}>
          {/* Time gutter */}
          <div className="flex-shrink-0 relative" style={{ width: GUTTER_W }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-1 text-xs leading-none"
                style={{ top: i * HOUR_PX - 5, color: 'rgba(255,255,255,0.4)' }}
              >
                {formatHour(HOUR_START + i)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const key = dayKey(d)
            const isToday = key === todayKey
            const timedEvents = events.filter((e) => !e.allDay && dayKey(new Date(e.start)) === key)

            return (
              <div
                key={key}
                className="flex-1 relative border-l"
                style={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  backgroundColor: isToday ? 'rgba(255,255,255,0.03)' : undefined,
                }}
              >
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-t"
                    style={{
                      top: i * HOUR_PX,
                      borderColor: i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                    }}
                  />
                ))}

                {/* Current time indicator (today column only) */}
                {isToday && nowPct !== null && (
                  <div
                    className="absolute w-full z-10"
                    style={{ top: `${nowPct}%`, height: 2, backgroundColor: '#fbbf24' }}
                  />
                )}

                {/* Timed events */}
                {timedEvents.map((e) => {
                  const layout = eventLayout(new Date(e.start), new Date(e.end))
                  if (!layout) return null
                  const color = EVENT_COLORS[(e.calendarIndex ?? 0) % EVENT_COLORS.length]
                  return (
                    <div
                      key={e.id}
                      className="absolute left-0.5 right-0.5 rounded px-1 overflow-hidden z-20"
                      style={{
                        top: layout.top + 1,
                        height: layout.height - 2,
                        backgroundColor: color + 'cc',
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div className="text-white text-xs leading-tight font-medium truncate">
                        {e.title}
                      </div>
                      <div className="text-white/60 text-[10px] leading-tight">
                        {new Date(e.start).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                        {' – '}
                        {new Date(e.end).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </GlassPanel>
  )
}
