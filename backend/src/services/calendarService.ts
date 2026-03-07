import IcalExpander from 'ical-expander'
import { CalendarEvent } from '../types/index.js'

interface CacheEntry {
  events: CalendarEvent[]
  fetchedAt: number
}

let cache: CacheEntry | null = null
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const WINDOW_DAYS = 5

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.events
  }

  const urlsEnv = process.env.ICAL_URLS
  if (!urlsEnv) return []

  const urls = urlsEnv
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)

  const results = await Promise.allSettled(urls.map((url, i) => fetchAndParseIcs(url, i)))

  const allEvents: CalendarEvent[] = []
  const seen = new Set<string>()

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const event of result.value) {
        if (!seen.has(event.id)) {
          seen.add(event.id)
          allEvents.push(event)
        }
      }
    } else {
      console.warn('[calendar] Failed to fetch a calendar:', result.reason)
    }
  }

  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  cache = { events: allEvents, fetchedAt: Date.now() }
  return allEvents
}

export async function fetchAndParseIcs(url: string, calendarIndex = 0): Promise<CalendarEvent[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ICS fetch failed for ${url}: ${res.status}`)
  const icsText = await res.text()
  return parseIcs(icsText, calendarIndex)
}

export function parseIcs(icsText: string, calendarIndex = 0): CalendarEvent[] {
  if (!icsText.trim()) return []

  const windowStart = startOfDay(new Date())
  const windowEnd = new Date(windowStart.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000)

  let expander: IcalExpander
  try {
    expander = new IcalExpander({ ics: icsText, maxIterations: 200 })
  } catch {
    console.warn('[calendar] Failed to parse ICS text')
    return []
  }

  let expanded: ReturnType<IcalExpander['between']>
  try {
    expanded = expander.between(windowStart, windowEnd)
  } catch {
    console.warn('[calendar] Failed to expand ICS events')
    return []
  }

  const events: CalendarEvent[] = []

  for (const e of expanded.events) {
    try {
      const start = e.startDate.toJSDate()
      const end = e.endDate.toJSDate()
      const allDay = e.startDate.isDate
      events.push({
        id: `${calendarIndex}-${e.uid ?? Math.random()}`,
        title: e.summary ?? '(No title)',
        start: start.toISOString(),
        end: end.toISOString(),
        allDay,
        calendarIndex,
      })
    } catch {
      // skip malformed events
    }
  }

  for (const o of expanded.occurrences) {
    try {
      const start = o.startDate.toJSDate()
      const end = o.endDate.toJSDate()
      const allDay = o.startDate.isDate
      events.push({
        id: `${calendarIndex}-${o.item.uid ?? Math.random()}-${start.toISOString()}`,
        title: o.item.summary ?? '(No title)',
        start: start.toISOString(),
        end: end.toISOString(),
        allDay,
        calendarIndex,
      })
    } catch {
      // skip malformed occurrences
    }
  }

  return events
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function _resetCache() {
  cache = null
}
