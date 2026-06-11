import { BoardRow, flapText } from '../../components/SplitFlapBoard.js'
import { CalendarEvent, PlexSession, UpcomingItem } from '../../types/index.js'

const BOARDING_WINDOW_MS = 45 * 60 * 1000

/** Emoji-only titles sanitize to nothing; give those rows a placeholder */
function flapTitle(title: string): string {
  return flapText(title) || '- - -'
}

function daysFromNow(d: Date, now: Date): number {
  const a = new Date(d)
  a.setHours(0, 0, 0, 0)
  const b = new Date(now)
  b.setHours(0, 0, 0, 0)
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

function fmtBoardTime(d: Date, now: Date): string {
  const sameDay = d.toDateString() === now.toDateString()
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const time = `${h % 12 || 12}:${m}${h >= 12 ? 'P' : 'A'}`
  if (sameDay) return time
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  return `${day} ${h % 12 || 12}${h >= 12 ? 'P' : 'A'}`
}

/** Merges Plex sessions, calendar events, and upcoming media into one departure board */
export function buildBoardRows(
  events: CalendarEvent[],
  mediaItems: UpcomingItem[],
  sessions: PlexSession[],
  now: Date
): BoardRow[] {
  const rows: { sort: number; row: BoardRow }[] = []

  for (const s of sessions) {
    const pct = s.duration > 0 ? Math.round((s.viewOffset / s.duration) * 100) : 0
    rows.push({
      sort: -1,
      row: {
        time: 'NOW',
        title: flapTitle(s.title),
        detail: [s.subtitle, s.userName, `${pct}%`].filter(Boolean).join(' · '),
        status: 'IN FLIGHT',
        statusKind: 'active',
      },
    })
  }

  for (const e of events) {
    const start = new Date(e.start)
    const end = new Date(e.end)
    if (end < now) continue
    let status = 'ON TIME'
    let statusKind: BoardRow['statusKind'] = 'ok'
    if (start <= now) {
      status = 'DEPARTED'
      statusKind = 'dim'
    } else if (start.getTime() - now.getTime() <= BOARDING_WINDOW_MS) {
      status = 'BOARDING'
      statusKind = 'active'
    }
    rows.push({
      sort: start.getTime(),
      row: {
        time: e.allDay ? 'ALL DAY' : fmtBoardTime(start, now),
        title: flapTitle(e.title),
        status,
        statusKind,
      },
    })
  }

  for (const item of mediaItems) {
    const d = new Date(item.date + 'T00:00:00')
    const ahead = daysFromNow(d, now)
    // Match the weekday style of event rows inside the next week
    let time: string
    if (ahead === 0) {
      time = 'TODAY'
    } else if (ahead > 0 && ahead <= 6) {
      time = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    } else {
      time = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    }
    rows.push({
      sort: d.getTime(),
      row: {
        time,
        title: flapTitle(item.title),
        detail: item.subtitle,
        status: ahead === 0 ? 'ARRIVING' : 'SCHEDULED',
        statusKind: ahead === 0 ? 'active' : 'ok',
      },
    })
  }

  return rows.sort((a, b) => a.sort - b.sort).map((r) => r.row)
}
