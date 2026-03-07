import { CalendarEvent } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface CalendarWidgetProps {
  events: CalendarEvent[]
  loading: boolean
}

const CALENDAR_COLORS = [
  'bg-blue-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-orange-400',
  'bg-teal-400',
]

function getDayColumns(): { date: Date; label: string; key: string }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(today.getTime() + i * 86400000)
    const label =
      i === 0
        ? 'Today'
        : date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
    return { date, label, key: date.toISOString().slice(0, 10) }
  })
}

function formatEventTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function CalendarWidget({ events, loading }: CalendarWidgetProps) {
  const columns = getDayColumns()

  if (loading) {
    return (
      <GlassPanel className="p-4 animate-pulse">
        <div className="h-40 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  return (
    <GlassPanel className="p-4">
      <div className="grid grid-cols-5 gap-2 h-full">
        {columns.map(({ date, label, key }) => {
          const dayEvents = events.filter((e) => {
            const eventDate = new Date(e.start)
            return eventDate.toISOString().slice(0, 10) === key
          })

          const allDay = dayEvents.filter((e) => e.allDay)
          const timed = dayEvents.filter((e) => !e.allDay)

          return (
            <div key={key} className="flex flex-col min-h-0">
              {/* Day header */}
              <div className="text-center mb-2">
                <div
                  className={`text-xs font-semibold tracking-wide ${date.toDateString() === new Date().toDateString() ? 'text-yellow-300' : 'text-white/60'}`}
                >
                  {label}
                </div>
              </div>

              {/* All-day events */}
              {allDay.map((event) => (
                <div
                  key={event.id}
                  className={`${CALENDAR_COLORS[event.calendarIndex ?? 0]} text-white text-xs rounded px-1 py-0.5 mb-1 truncate`}
                >
                  {event.title}
                </div>
              ))}

              {/* Timed events */}
              <div className="flex flex-col gap-1 overflow-y-auto">
                {timed.map((event) => (
                  <div
                    key={event.id}
                    className={`${CALENDAR_COLORS[event.calendarIndex ?? 0]}/20 border-l-2 ${CALENDAR_COLORS[event.calendarIndex ?? 0].replace('bg-', 'border-')} text-white text-xs rounded-r px-1 py-1`}
                  >
                    <div className="text-white/60 text-[10px]">{formatEventTime(event.start)}</div>
                    <div className="truncate">{event.title}</div>
                  </div>
                ))}
                {dayEvents.length === 0 && (
                  <div className="text-white/20 text-xs text-center mt-2">—</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}
