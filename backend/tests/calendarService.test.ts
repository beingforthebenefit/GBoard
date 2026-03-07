import { describe, it, expect } from 'vitest'
import { parseIcs } from '../src/services/calendarService.js'

const today = new Date()
const tomorrow = new Date(today.getTime() + 86400000)
const fmtDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

const makeIcs = (events: string[]) => `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
${events.join('\n')}
END:VCALENDAR`

const makeEvent = (uid: string, summary: string, dtstart: string, dtend: string) => `BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
DTSTART:${dtstart}
DTEND:${dtend}
END:VEVENT`

const todayStr = fmtDate(today)
const tomorrowStr = fmtDate(tomorrow)

describe('parseIcs', () => {
  it('returns empty array for empty string', () => {
    expect(parseIcs('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(parseIcs('   ')).toEqual([])
  })

  it('parses a minimal valid ICS and returns one event', () => {
    const ics = makeIcs([
      makeEvent('uid1@test', 'Team Meeting', `${todayStr}T140000Z`, `${todayStr}T150000Z`),
    ])
    const events = parseIcs(ics)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Team Meeting')
    expect(events[0].allDay).toBe(false)
  })

  it('parses an all-day event correctly', () => {
    const ics = makeIcs([
      `BEGIN:VEVENT\nUID:allday@test\nSUMMARY:Birthday\nDTSTART;VALUE=DATE:${todayStr}\nDTEND;VALUE=DATE:${tomorrowStr}\nEND:VEVENT`,
    ])
    const events = parseIcs(ics)
    expect(events).toHaveLength(1)
    expect(events[0].allDay).toBe(true)
    expect(events[0].title).toBe('Birthday')
  })

  it('filters out events outside the 5-day window', () => {
    const pastDate = new Date(today.getTime() - 10 * 86400000)
    const pastStr = fmtDate(pastDate)
    const ics = makeIcs([
      makeEvent('past@test', 'Old Event', `${pastStr}T100000Z`, `${pastStr}T110000Z`),
    ])
    const events = parseIcs(ics)
    expect(events).toHaveLength(0)
  })

  it('does not throw on malformed ICS (graceful degradation)', () => {
    expect(() => parseIcs('this is not valid ics')).not.toThrow()
    expect(parseIcs('this is not valid ics')).toEqual([])
  })

  it('returns event with calendarIndex', () => {
    const ics = makeIcs([
      makeEvent('uid2@test', 'My Event', `${todayStr}T100000Z`, `${todayStr}T110000Z`),
    ])
    const events = parseIcs(ics, 2)
    expect(events[0].calendarIndex).toBe(2)
  })

  it('expands a weekly recurring event into multiple occurrences within window', () => {
    // Create a recurring event starting today that repeats daily for 10 days
    const ics = makeIcs([
      `BEGIN:VEVENT\nUID:recurring@test\nSUMMARY:Daily Standup\nDTSTART:${todayStr}T090000Z\nDTEND:${todayStr}T093000Z\nRRULE:FREQ=DAILY;COUNT=10\nEND:VEVENT`,
    ])
    const events = parseIcs(ics)
    // Should get at least 2 occurrences within the 5-day window
    expect(events.length).toBeGreaterThanOrEqual(2)
    for (const event of events) {
      expect(event.title).toBe('Daily Standup')
    }
  })
})
