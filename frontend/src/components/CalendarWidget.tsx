import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
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

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
})

interface RbcEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  calendarIndex: number
}

export function CalendarWidget({ events, loading }: CalendarWidgetProps) {
  if (loading) {
    return (
      <GlassPanel className="p-4 animate-pulse">
        <div className="h-40 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  const rbcEvents: RbcEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.start),
    end: new Date(e.end),
    allDay: e.allDay,
    calendarIndex: e.calendarIndex ?? 0,
  }))

  const view: View = 'week'
  const minTime = new Date()
  minTime.setHours(9, 0, 0, 0)
  const maxTime = new Date()
  maxTime.setHours(22, 0, 0, 0)

  return (
    <GlassPanel className="p-2 h-full">
      <style>{`
        .rbc-calendar { background: transparent; color: white; font-size: 11px; height: 100%; }
        .rbc-header { border-color: rgba(255,255,255,0.15) !important; color: rgba(255,255,255,0.7); padding: 4px 0; font-size: 11px; }
        .rbc-time-view, .rbc-time-header, .rbc-time-content { border-color: rgba(255,255,255,0.15) !important; }
        .rbc-time-slot { border-color: rgba(255,255,255,0.05) !important; }
        .rbc-timeslot-group { border-color: rgba(255,255,255,0.1) !important; min-height: 36px; }
        .rbc-time-gutter .rbc-timeslot-group { border: none; }
        .rbc-label { color: rgba(255,255,255,0.5); font-size: 10px; padding-right: 4px; }
        .rbc-day-slot .rbc-time-slot { border-color: rgba(255,255,255,0.05) !important; }
        .rbc-current-time-indicator { background: #fbbf24; }
        .rbc-today { background: rgba(255,255,255,0.05) !important; }
        .rbc-off-range-bg { background: transparent; }
        .rbc-event { border-radius: 3px; border: none !important; font-size: 10px; padding: 1px 3px; }
        .rbc-event-label { font-size: 9px; }
        .rbc-allday-cell { max-height: 48px; overflow-y: auto; }
        .rbc-show-more { color: rgba(255,255,255,0.6); font-size: 10px; }
        .rbc-toolbar { display: none; }
        .rbc-time-header-gutter { background: transparent !important; }
        .rbc-time-header-content { border-color: rgba(255,255,255,0.15) !important; }
        .rbc-header + .rbc-header { border-color: rgba(255,255,255,0.15) !important; }
        .rbc-day-slot .rbc-events-container { margin-right: 0; }
      `}</style>
      <Calendar
        localizer={localizer}
        events={rbcEvents}
        defaultView={view}
        view={view}
        onView={() => {}}
        date={new Date()}
        onNavigate={() => {}}
        min={minTime}
        max={maxTime}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: EVENT_COLORS[(event as RbcEvent).calendarIndex % EVENT_COLORS.length],
            color: 'white',
          },
        })}
        formats={{
          dayFormat: (date) =>
            date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
          timeGutterFormat: (date) =>
            date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        }}
        style={{ height: '100%' }}
      />
    </GlassPanel>
  )
}
