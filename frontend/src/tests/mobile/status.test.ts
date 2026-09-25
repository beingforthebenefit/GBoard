import { describe, it, expect } from 'vitest'
import {
  attention,
  bpClass,
  clock12,
  glance,
  healthState,
  shortDefinition,
  sleepScoreParts,
  summary,
  workoutReason,
} from '../../mobile/status.js'
import { NOW, fitness, mobileData, workout } from './fixtures.js'

const rowsOf = (data = mobileData(), errors = {}) =>
  Object.fromEntries(glance(data, errors, NOW).flatMap((g) => g.rows.map((r) => [r.key, r])))

describe('healthState', () => {
  it('separates never-configured, never-synced, stale and fine', () => {
    expect(healthState(null)).toBe('loading')
    expect(healthState(fitness({ configured: false }))).toBe('unconfigured')
    expect(healthState(fitness({ ingestAgeHours: null }))).toBe('nodata')
    expect(healthState(fitness({ ingestAgeHours: 31 }))).toBe('stale')
    expect(healthState(fitness({ ingestAgeHours: 25.9 }))).toBe('ok')
  })
})

describe('attention', () => {
  it('asks for a ride when the rolling window needs one, and says why', () => {
    const items = attention(mobileData(), {}, NOW)
    expect(items.map((a) => a.title)).toEqual(['Ride 60 minutes today'])
    expect(items[0].status).toBe('warn')
    expect(items[0].detail).toMatch(
      /3 of 5 in the last 7 days, and \w+day's session leaves the window tomorrow/
    )
  })

  it('says "today" rather than a length when any session counts', () => {
    const lift = workout({ label: 'Lifting', verb: 'Lift', targetMinutes: 0 })
    const items = attention(mobileData({ fitness: fitness({ workouts: [lift] }) }), {}, NOW)
    expect(items[0].title).toBe('Lift today')
  })

  it('stops nagging about workouts once a session is logged today', () => {
    const done = workout({ doneToday: true })
    expect(attention(mobileData({ fitness: fitness({ workouts: [done] }) }), {}, NOW)).toEqual([])
  })

  it('reports a stale phone as the problem, and nothing derived from old figures', () => {
    const items = attention(mobileData({ fitness: fitness({ ingestAgeHours: 31 }) }), {}, NOW)
    expect(items.map((a) => [a.status, a.title])).toEqual([
      ['bad', 'Phone last synced 31 hours ago'],
    ])
  })

  it('flags meds only once they are past due', () => {
    const med = { ...fitness().medication!, takenToday: false, takenAt: null }
    const f = fitness({ medication: med })
    expect(
      attention(mobileData({ fitness: f }), {}, new Date('2026-09-25T08:45:00')).some(
        (a) => a.row === 'meds'
      )
    ).toBe(false)
    const due = attention(mobileData({ fitness: f }), {}, new Date('2026-09-25T09:05:00')).find(
      (a) => a.row === 'meds'
    )
    expect(due?.title).toBe('BP Meds not logged yet')
    expect(due?.detail).toBe('Due at 9:00 AM.')
  })

  it('lists every held metric by its plain name', () => {
    const items = attention(
      mobileData({ fitness: fitness({ heldMetrics: ['weight_body_mass'] }) }),
      {},
      NOW
    )
    expect(items.find((a) => a.title === 'Weight is held')?.row).toBe('weight')
  })

  it('puts problems ahead of warnings', () => {
    const items = attention(mobileData(), { pihole: 'down' }, NOW)
    expect(items[0]).toMatchObject({ status: 'bad', title: "Pi-hole isn't answering" })
    expect(items[1].status).toBe('warn')
  })

  it('treats a stage 2 reading taken today as a problem', () => {
    const bp = { ...fitness().bp, latest: { date: '2026-09-25', systolic: 144, diastolic: 92 } }
    const items = attention(mobileData({ fitness: fitness({ bp }) }), {}, NOW)
    expect(items[0]).toMatchObject({ status: 'bad', title: 'Blood pressure high: 144/92' })
  })

  it('warns when the health service is unreachable but GBoard still has figures', () => {
    const items = attention(mobileData({ fitness: fitness({ reachable: false }) }), {}, NOW)
    expect(items.some((a) => a.title === "The health service isn't answering")).toBe(true)
  })

  it('flags Pi-hole with blocking turned off', () => {
    const pihole = { ...mobileData().pihole!, status: 'disabled' }
    expect(
      attention(mobileData({ pihole }), {}, NOW).some((a) => a.title === 'Pi-hole blocking is off')
    ).toBe(true)
  })
})

describe('glance', () => {
  it('orders groups health, today, home, infra', () => {
    expect(glance(mobileData(), {}, NOW).map((g) => g.section)).toEqual([
      'health',
      'today',
      'home',
      'infra',
    ])
  })

  it('omits the health group entirely when Apple Health is not connected', () => {
    const groups = glance(mobileData({ fitness: fitness({ configured: false }) }), {}, NOW)
    expect(groups.map((g) => g.section)).not.toContain('health')
  })

  it('marks every health row out of date when the phone has stopped syncing', () => {
    const rows = glance(mobileData({ fitness: fitness({ ingestAgeHours: 40 }) }), {}, NOW)[0].rows
    expect(rows.every((r) => r.status === 'stale')).toBe(true)
    expect(rows.find((r) => r.key === 'meds')?.aside).toBe('out of date')
  })

  it('shows a held weight as Held, never as a number', () => {
    const f = fitness({ weight: { ...fitness().weight, held: true } })
    const row = rowsOf(mobileData({ fitness: f })).weight
    expect(row).toMatchObject({ status: 'stale', value: 'Held' })
  })

  it('reads weight change as good news when it falls', () => {
    expect(rowsOf().weight).toMatchObject({ status: 'good', aside: '▼ 8.9 in 42 d' })
  })

  it('classifies blood pressure by the worse number', () => {
    expect(rowsOf().bp).toMatchObject({ status: 'good', value: '116/72', aside: 'normal' })
  })

  it('shows the workout strip with today marked due', () => {
    const cyc = rowsOf().cycling
    expect(cyc.value).toBe('3 of 5')
    expect(cyc.cells?.map((c) => (c.on ? 1 : c.due ? 'd' : 0))).toEqual([1, 0, 1, 0, 1, 0, 'd'])
    expect(cyc.aside).toBe('ride today')
  })

  it('shows calories over budget as a warning', () => {
    const f = fitness({
      calories: { budget: 1900, consumed: 2100, remaining: -200, burnedActive: 0, held: false },
    })
    expect(rowsOf(mobileData({ fitness: f })).calories).toMatchObject({
      status: 'warn',
      value: '200',
      note: 'over',
    })
  })

  it('says there is no sleep when last night is missing, rather than showing an old night', () => {
    const f = fitness({
      sleep: {
        nights: [{ date: '2026-09-23', hours: 7, deep: 1, rem: 1, core: 5, awake: 0, score: 90 }],
        score: 90,
        avgHours: 7,
      },
    })
    expect(rowsOf(mobileData({ fitness: f })).sleep.value).toBe('No data')
  })

  it('shows the next calendar event that has not ended', () => {
    expect(rowsOf().next).toMatchObject({ value: 'Grocery pickup', aside: '4:30 PM' })
  })

  it('shows Pi-hole as unreachable, with no numbers, when it fails', () => {
    expect(rowsOf(mobileData(), { pihole: 'down' }).pihole).toMatchObject({
      status: 'bad',
      value: 'No answer',
    })
  })

  it('reads indoor temperature and humidity from Home Assistant', () => {
    expect(rowsOf().inside).toMatchObject({
      status: 'good',
      value: '72°',
      note: '48% RH',
      aside: 'HA connected',
    })
  })
})

describe('summary', () => {
  it('summarises each section in a line', () => {
    const d = mobileData()
    expect(summary('health', d, {}, NOW)).toBe('Meds taken, cycling 3 of 5, sleep 89')
    expect(summary('today', d, {}, NOW)).toBe('2 events today, word of the day: saber')
    expect(summary('home', d, {}, NOW)).toBe('69° outside, 72° inside')
    expect(summary('infra', d, { pihole: 'x' }, NOW)).toBe('Pi-hole unreachable, Plex idle')
  })
})

describe('helpers', () => {
  it('formats clock times', () => {
    expect(clock12('08:29')).toBe('8:29 AM')
    expect(clock12('00:05')).toBe('12:05 AM')
    expect(clock12('13:00')).toBe('1:00 PM')
  })

  it('classifies blood pressure', () => {
    expect(bpClass(119, 79)).toBe('normal')
    expect(bpClass(125, 79)).toBe('elevated')
    expect(bpClass(118, 82)).toBe('stage 1')
    expect(bpClass(141, 70)).toBe('stage 2')
  })

  it('splits the sleep score into the same parts the backend weights', () => {
    const p = sleepScoreParts({ hours: 8, deep: 1.4, rem: 1.4, awake: 0.5 })!
    expect(p.duration).toBe(60)
    expect(p.restorative).toBe(25)
    expect(p.efficiency).toBe(15)
  })

  it('shortens a definition to what fits a table cell', () => {
    expect(shortDefinition('to know (a fact), to know how')).toBe('to know')
  })

  it('explains a workout without the window clause when the oldest day is empty', () => {
    const w = workout({
      days: workout().days.map((d, i) => ({ ...d, qualifying: i > 0 && d.qualifying })),
    })
    expect(workoutReason(w)).toBe('Cycling is 3 of 5 in the last 7 days.')
  })
})
