import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildBpTrend,
  buildFitness,
  buildSleepTrend,
  buildVitals,
  buildWeightTrend,
  dailyPoints,
  dateWindow,
  fetchFitness,
  localDateOf,
  medicationStatus,
  scoreNight,
  spannedDays,
  workoutPlan,
  _resetCache,
} from '../src/services/fitnessService.js'

const TZ = 'America/Los_Angeles'
const TODAY = '2026-09-21'
const NOW = Date.parse('2026-09-22T04:22:28Z') // 2026-09-21 21:22 local

const day = (offset: number) =>
  new Date(Date.parse(`${TODAY}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)

/** Health Auto Export writes local wall-clock stamps with their own offset */
const stamp = (date: string, time = '09:00:00') => `${date} ${time} -0700`

const dose = (date: string, status = 'Taken', nickname = 'BP Meds') => ({
  id: `sha1:${date}`,
  ts: `${date}T16:00:00+00:00`,
  name: null,
  detail: {
    displayText: 'Hyzaar 100mg-25mg Tablet',
    nickname,
    status,
    start: stamp(date),
    scheduledDate: stamp(date, '09:00:00'),
  },
})

const CYCLE = { key: 'cycling', label: 'Cycling', verb: 'Ride', re: /cycl|spin|bike/i }
const LIFT = {
  key: 'lifting',
  label: 'Lifting',
  verb: 'Lift',
  re: /strength|weight.?lift|lifting|resistance/i,
}

const ride = (date: string, minutes: number, name = 'Indoor Cycling', type = 'cycling') => ({
  id: date,
  ts: `${date}T21:50:52+00:00`,
  name,
  detail: {
    duration: minutes * 60,
    start: stamp(date, '14:50:52'),
    activities: [{ activityType: type }],
  },
})

const point = (ts: string, field: string, value: number, units = 'count') => ({
  ts,
  source: '',
  field,
  value,
  units,
})

// A real /api/summary response, trimmed to the slots the widget reads
const SUMMARY = {
  asOf: '2026-09-22T04:22:28+00:00',
  localDate: TODAY,
  timezone: TZ,
  today: {
    steps: { metric: 'step_count', field: 'qty', value: 3994, units: 'count' },
    activeEnergy: { metric: 'active_energy', field: 'qty', value: 405.909, units: 'kcal' },
    exerciseMinutes: { metric: 'apple_exercise_time', field: 'qty', value: 8, units: 'min' },
    standHours: { metric: 'apple_stand_hour', field: 'qty', value: 14, units: 'count' },
    distance: { metric: 'walking_running_distance', field: 'qty', value: 1.223, units: 'mi' },
    flightsClimbed: { metric: 'flights_climbed', field: 'qty', value: 4, units: 'count' },
    water: null,
    mindfulMinutes: null,
  },
  latest: {
    weight: { metric: 'weight_body_mass', value: 225.597, units: 'lb' },
    restingHeartRate: { metric: 'resting_heart_rate', value: 75, units: 'count/min' },
    hrv: { metric: 'heart_rate_variability', value: 46.186, units: 'ms' },
    vo2Max: { metric: 'vo2_max', value: 32.19, units: 'ml/(kg·min)' },
    bloodOxygen: { metric: 'blood_oxygen_saturation', value: 97, units: '%' },
    bodyFat: { metric: 'body_fat_percentage', value: 31.467, units: '%' },
    bmi: { metric: 'body_mass_index', value: 33.337, units: 'count' },
    bloodPressure: {
      metric: 'blood_pressure',
      value: 123.333,
      units: 'mmHg',
      fields: { systolic: 123.333, diastolic: 86 },
    },
  },
  sleep: { metric: 'sleep_analysis', field: 'totalsleep', value: 7.137, units: 'hr' },
  workouts: { last7Days: 4, latest: { name: 'Indoor Cycling', ts: '2026-09-19T21:50:52+00:00' } },
  ingest: { received_at: '2026-09-22T04:12:34+00:00', origin: 'api', points: 0, ageHours: 0.2 },
  unresolved: [],
  unitChanges: [],
}

const BUNDLE = {
  summary: SUMMARY,
  medications: { records: [dose(TODAY), dose(day(-1)), dose(day(-2))] },
  workouts: { records: [ride(day(-2), 64), ride(day(-4), 63), ride(day(-5), 64)] },
  bp: {
    metric: 'blood_pressure',
    unitsSeen: ['mmHg'],
    mixedUnits: false,
    points: [
      point(`${day(-8)}T07:00:00+00:00`, 'systolic', 123.667, 'mmHg'),
      point(`${day(-8)}T07:00:00+00:00`, 'diastolic', 86, 'mmHg'),
      point(`${TODAY}T07:00:00+00:00`, 'systolic', 106, 'mmHg'),
      point(`${TODAY}T07:00:00+00:00`, 'diastolic', 73.333, 'mmHg'),
    ],
  },
  weight: {
    metric: 'weight_body_mass',
    unitsSeen: ['lb'],
    mixedUnits: false,
    points: [
      point(`${day(-30)}T07:00:00+00:00`, 'qty', 229.4, 'lb'),
      point(`${TODAY}T07:00:00+00:00`, 'qty', 225.597, 'lb'),
    ],
  },
  sleep: {
    metric: 'sleep_analysis',
    unitsSeen: ['hr'],
    mixedUnits: false,
    points: [
      point(`${day(-1)}T07:00:00+00:00`, 'totalsleep', 7.137, 'hr'),
      point(`${day(-1)}T07:00:00+00:00`, 'deep', 0.625, 'hr'),
      point(`${day(-1)}T07:00:00+00:00`, 'rem', 1.984, 'hr'),
      point(`${day(-1)}T07:00:00+00:00`, 'core', 4.527, 'hr'),
      point(`${day(-1)}T07:00:00+00:00`, 'awake', 1.567, 'hr'),
      point(`${day(-1)}T07:00:00+00:00`, 'asleep', 0, 'hr'),
    ],
  },
  diet: {
    metric: 'dietary_energy',
    unitsSeen: ['kcal'],
    mixedUnits: false,
    points: [
      point(`${day(-1)}T07:00:00+00:00`, 'qty', 1999.692, 'kcal'),
      point(`${TODAY}T07:00:00+00:00`, 'qty', 1626.042, 'kcal'),
    ],
  },
  steps: {
    metric: 'step_count',
    unitsSeen: ['count'],
    mixedUnits: false,
    points: [
      point(`${day(-1)}T07:00:00+00:00`, 'qty', 6000),
      point(`${TODAY}T07:00:00+00:00`, 'qty', 3994),
    ],
  },
}

describe('localDateOf', () => {
  it('resolves a UTC timestamp to the health service’s own calendar day', () => {
    // 21:22 on the 21st in Los Angeles, already the 22nd in UTC
    expect(localDateOf('2026-09-22T04:22:28Z', TZ)).toBe('2026-09-21')
    expect(localDateOf('2026-09-22T04:22:28Z', 'UTC')).toBe('2026-09-22')
  })

  it('falls back to the UTC date rather than throwing on a bad zone', () => {
    expect(localDateOf('2026-09-22T04:22:28Z', 'Mars/Olympus')).toBe('2026-09-22')
  })
})

describe('dateWindow', () => {
  it('returns the window ending today, oldest first', () => {
    const w = dateWindow('2026-09-21', 7)
    expect(w).toHaveLength(7)
    expect(w[0]).toBe('2026-09-15')
    expect(w[6]).toBe('2026-09-21')
  })
})

describe('medicationStatus', () => {
  it('reports today’s dose with the streak behind it', () => {
    const med = medicationStatus([dose(TODAY), dose(day(-1)), dose(day(-2))], TODAY)!
    expect(med.name).toBe('BP Meds')
    expect(med.takenToday).toBe(true)
    expect(med.takenAt).toBe('09:00')
    expect(med.streakDays).toBe(3)
    expect(med.last7).toHaveLength(7)
    expect(med.last7[6]).toEqual({ date: TODAY, taken: true })
  })

  it('keeps the streak alive before the dose is due today', () => {
    // Nothing logged today yet — that is "not yet", not a broken streak
    const med = medicationStatus([dose(day(-1)), dose(day(-2))], TODAY)!
    expect(med.takenToday).toBe(false)
    expect(med.streakDays).toBe(2)
    expect(med.scheduledAt).toBe('09:00')
  })

  it('breaks the streak on a missed day', () => {
    const med = medicationStatus([dose(TODAY), dose(day(-2))], TODAY)!
    expect(med.streakDays).toBe(1)
  })

  it('ignores a skipped dose', () => {
    const med = medicationStatus([dose(TODAY, 'Skipped')], TODAY)!
    expect(med.takenToday).toBe(false)
  })

  it('picks the blood-pressure med out of several', () => {
    const records = [dose(TODAY, 'Taken', 'Vitamin D'), dose(TODAY, 'Taken', 'BP Meds')]
    expect(medicationStatus(records, TODAY)!.name).toBe('BP Meds')
  })

  it('falls back to what is logged when nothing matches the BP pattern', () => {
    const med = medicationStatus([dose(TODAY, 'Taken', 'Metformin')], TODAY)!
    expect(med.name).toBe('Metformin')
    expect(med.takenToday).toBe(true)
  })

  it('returns null when no medication has ever been logged', () => {
    expect(medicationStatus([], TODAY)).toBeNull()
  })
})

describe('workoutPlan', () => {
  it('counts qualifying rides in the rolling seven-day window', () => {
    const plan = workoutPlan(
      [ride(day(-2), 64), ride(day(-4), 63), ride(day(-5), 64)],
      TODAY,
      CYCLE,
      5,
      60
    )
    expect(plan.daysInWindow).toBe(3)
    expect(plan.doneToday).toBe(false)
    expect(plan.needToday).toBe(true)
    expect(plan.days).toHaveLength(7)
    expect(plan.lastSession?.minutes).toBe(64)
  })

  it('stops asking once the weekly target is met', () => {
    const rides = [-1, -2, -3, -4, -5].map((d) => ride(day(d), 62))
    const plan = workoutPlan(rides, TODAY, CYCLE, 5, 60)
    expect(plan.daysInWindow).toBe(5)
    expect(plan.needToday).toBe(false)
  })

  it('credits a ride logged today', () => {
    const plan = workoutPlan([ride(TODAY, 65)], TODAY, CYCLE, 5, 60)
    expect(plan.minutesToday).toBe(65)
    expect(plan.doneToday).toBe(true)
    expect(plan.needToday).toBe(false)
  })

  it('does not count a token thirteen-minute spin as a day', () => {
    const plan = workoutPlan([ride(TODAY, 13)], TODAY, CYCLE, 5, 60)
    expect(plan.minutesToday).toBe(13)
    expect(plan.doneToday).toBe(false)
    expect(plan.daysInWindow).toBe(0)
  })

  it('ignores activities that are not cycling', () => {
    const plan = workoutPlan(
      [ride(TODAY, 80, 'Outdoor Walk', 'walking'), ride(TODAY, 15, 'Strength', 'strength')],
      TODAY,
      CYCLE,
      5,
      60
    )
    expect(plan.minutesToday).toBe(0)
    expect(plan.lastSession).toBeNull()
  })

  it('sums two rides on the same day', () => {
    const plan = workoutPlan(
      [ride(TODAY, 20), { ...ride(TODAY, 25), id: 'b' }],
      TODAY,
      CYCLE,
      5,
      60
    )
    expect(plan.minutesToday).toBe(45)
    expect(plan.doneToday).toBe(true)
  })
})

describe('workoutPlan — lifting', () => {
  const lift = (date: string, minutes: number) =>
    ride(date, minutes, 'Traditional Strength Training', 'traditional_strength_training')

  it('counts a session of any length', () => {
    // Real sessions run 3–15 minutes; the goal is turning up, not time under the bar
    const plan = workoutPlan([lift(TODAY, 5), lift(day(-3), 3)], TODAY, LIFT, 3, 0)
    expect(plan.key).toBe('lifting')
    expect(plan.verb).toBe('Lift')
    expect(plan.daysInWindow).toBe(2)
    expect(plan.doneToday).toBe(true)
    expect(plan.needToday).toBe(false)
  })

  it('asks for a session when the window is short of three days', () => {
    const plan = workoutPlan([lift(day(-3), 14)], TODAY, LIFT, 3, 0)
    expect(plan.daysInWindow).toBe(1)
    expect(plan.needToday).toBe(true)
    expect(plan.minutesToday).toBe(0)
  })

  it('stops asking at three days', () => {
    const plan = workoutPlan(
      [lift(day(-1), 4), lift(day(-3), 6), lift(day(-5), 8)],
      TODAY,
      LIFT,
      3,
      0
    )
    expect(plan.daysInWindow).toBe(3)
    expect(plan.needToday).toBe(false)
  })

  it('does not count a ride as a lift, or a lift as a ride', () => {
    const mixed = [ride(TODAY, 64), lift(TODAY, 9)]
    expect(workoutPlan(mixed, TODAY, LIFT, 3, 0).minutesToday).toBe(9)
    expect(workoutPlan(mixed, TODAY, CYCLE, 5, 60).minutesToday).toBe(64)
  })

  it('never counts a day with no session at all', () => {
    const plan = workoutPlan([], TODAY, LIFT, 3, 0)
    expect(plan.days.every((d) => !d.qualifying)).toBe(true)
    expect(plan.daysInWindow).toBe(0)
  })
})

describe('scoreNight', () => {
  it('scores a full, restorative night near the top', () => {
    expect(scoreNight({ hours: 8.2, deep: 1.4, rem: 2.2, awake: 0.5 })).toBeGreaterThanOrEqual(95)
  })

  it('penalises a short night', () => {
    expect(scoreNight({ hours: 4, deep: 0.6, rem: 1, awake: 0.5 })).toBeLessThanOrEqual(70)
  })

  it('returns zero when nothing was recorded', () => {
    expect(scoreNight({ hours: 0, deep: 0, rem: 0, awake: 0 })).toBe(0)
  })
})

describe('trend builders', () => {
  it('pairs systolic and diastolic readings by day', () => {
    const bp = buildBpTrend(BUNDLE.bp, TZ)
    expect(bp.points).toHaveLength(2)
    expect(bp.latest).toEqual({ date: TODAY, systolic: 106, diastolic: 73 })
    expect(bp.avgSystolic).toBe(115)
  })

  it('drops a reading missing half the pair', () => {
    const halved = {
      ...BUNDLE.bp,
      points: BUNDLE.bp.points.filter((p) => p.field === 'systolic'),
    }
    expect(buildBpTrend(halved, TZ).points).toHaveLength(0)
  })

  it('refuses to plot a series whose units changed', () => {
    const mixed = { ...BUNDLE.weight, mixedUnits: true }
    const weight = buildWeightTrend(mixed, TZ, TODAY)
    expect(weight.held).toBe(true)
    expect(weight.points).toEqual([])
    expect(weight.latest).toBeNull()
    // Nothing to span, so the label keeps the window that was asked for
    expect(weight.days).toBe(90)
  })

  it('keeps the full weight window when there is no series at all', () => {
    expect(buildWeightTrend(null, TZ, TODAY).days).toBe(90)
  })

  it('trims the weight window to the span the record actually covers', () => {
    // The API is asked for 90 days; these readings only go back 31
    const weight = buildWeightTrend(BUNDLE.weight, TZ, TODAY)
    expect(weight.days).toBe(31)
  })

  it('keeps the full window when the record reaches back past it', () => {
    const long = {
      ...BUNDLE.weight,
      points: [
        point(`${day(-200)}T07:00:00+00:00`, 'qty', 240, 'lb'),
        point(`${TODAY}T07:00:00+00:00`, 'qty', 225, 'lb'),
      ],
    }
    expect(buildWeightTrend(long, TZ, TODAY).days).toBe(90)
  })

  it('reports the change across the weight window', () => {
    const weight = buildWeightTrend(BUNDLE.weight, TZ, TODAY)
    expect(weight.latest).toBe(225.6)
    expect(weight.change).toBe(-3.8)
    expect(weight.units).toBe('lb')
  })

  it('reads sleep from totalsleep, not the zeroed asleep field', () => {
    const sleep = buildSleepTrend(BUNDLE.sleep, TZ)
    expect(sleep.nights).toHaveLength(1)
    expect(sleep.nights[0].hours).toBe(7.14)
    expect(sleep.avgHours).toBe(7.1)
    expect(sleep.score).toBe(sleep.nights[0].score)
  })

  it('keeps at most seven nights', () => {
    const points = Array.from({ length: 10 }, (_, i) =>
      point(`${day(-i)}T07:00:00+00:00`, 'totalsleep', 7, 'hr')
    )
    expect(buildSleepTrend({ ...BUNDLE.sleep, points }, TZ).nights).toHaveLength(7)
  })

  it('collapses a daily series to one value per local day', () => {
    expect(dailyPoints(BUNDLE.steps, TZ, 'qty', 0)).toEqual([
      { date: day(-1), value: 6000 },
      { date: TODAY, value: 3994 },
    ])
  })
})

describe('spannedDays', () => {
  it('counts both ends of the span', () => {
    expect(spannedDays([{ date: TODAY, value: 1 }], TODAY, 90)).toBe(1)
    expect(spannedDays([{ date: day(-1), value: 1 }], TODAY, 90)).toBe(2)
  })

  it('falls back to the full window with no points', () => {
    expect(spannedDays([], TODAY, 90)).toBe(90)
  })

  it('never reports more than the window asked for', () => {
    expect(spannedDays([{ date: day(-89), value: 1 }], TODAY, 90)).toBe(90)
    expect(spannedDays([{ date: day(-90), value: 1 }], TODAY, 90)).toBe(90)
    expect(spannedDays([{ date: day(-400), value: 1 }], TODAY, 90)).toBe(90)
  })

  it('measures from the first reading even when the last one is old', () => {
    const points = [
      { date: day(-20), value: 1 },
      { date: day(-10), value: 1 },
    ]
    expect(spannedDays(points, TODAY, 90)).toBe(21)
  })

  it('never reports less than one day, even for a reading dated after today', () => {
    expect(spannedDays([{ date: day(3), value: 1 }], TODAY, 90)).toBe(1)
  })

  it('falls back to the full window on an unparseable date', () => {
    expect(spannedDays([{ date: 'not-a-date', value: 1 }], TODAY, 90)).toBe(90)
    expect(spannedDays([{ date: day(-5), value: 1 }], '', 90)).toBe(90)
  })
})

describe('buildVitals', () => {
  it('relabels count/min as bpm and drops empty slots', () => {
    const vitals = buildVitals(SUMMARY.latest)
    expect(vitals.find((v) => v.key === 'restingHeartRate')).toEqual({
      key: 'restingHeartRate',
      label: 'Resting HR',
      value: 75,
      units: 'bpm',
      held: false,
    })
    expect(vitals.find((v) => v.key === 'respiratoryRate')).toBeUndefined()
    // Breaths per minute beside a pulse in bpm would read as a second heart rate
    expect(buildVitals({ respiratoryRate: { value: 16.3, units: 'count/min' } })[0].units).toBe(
      '/min'
    )
    // BMI's unit is Apple's placeholder "count", which reads as nonsense on a card
    expect(vitals.find((v) => v.key === 'bmi')?.units).toBe('')
  })

  it('keeps a held vital so the card can say so', () => {
    const vitals = buildVitals({
      hrv: { metric: 'heart_rate_variability', value: null, heldFor: 'unacknowledged unit change' },
    })
    expect(vitals[0]).toMatchObject({ key: 'hrv', value: null, held: true })
  })
})

describe('buildFitness', () => {
  it('assembles the day from a real summary payload', () => {
    const f = buildFitness(BUNDLE, NOW)
    expect(f.configured).toBe(true)
    expect(f.localDate).toBe(TODAY)
    expect(f.today.steps).toMatchObject({ value: 3994, units: 'count', held: false })
    expect(f.calories).toMatchObject({ budget: 1900, consumed: 1626, remaining: 274 })
    expect(f.calories.burnedActive).toBe(406)
    expect(f.medication?.takenToday).toBe(true)
    expect(f.workouts.map((w) => w.key)).toEqual(['cycling', 'lifting'])
    expect(f.workouts[0]).toMatchObject({ daysInWindow: 3, needToday: true, targetMinutes: 60 })
    expect(f.workouts[1]).toMatchObject({ targetDays: 3, targetMinutes: 0, needToday: true })
    expect(f.stepsAvg7).toBe(4997)
    expect(f.weight.days).toBe(31)
    expect(f.ingestAgeHours).toBe(0.2)
    expect(f.heldMetrics).toEqual([])
  })

  it('leaves calories unknown rather than zero when nothing was logged today', () => {
    const f = buildFitness({ ...BUNDLE, diet: { ...BUNDLE.diet, points: [] } }, NOW)
    expect(f.calories.consumed).toBeNull()
    expect(f.calories.remaining).toBeNull()
  })

  it('surfaces a held slot instead of reporting a zero', () => {
    const held = {
      ...BUNDLE,
      summary: {
        ...SUMMARY,
        today: {
          ...SUMMARY.today,
          steps: {
            metric: 'step_count',
            value: null,
            heldFor: 'unacknowledged unit change',
          },
        },
        unitChanges: [{ metric: 'weight_body_mass' }],
      },
    }
    const f = buildFitness(held, NOW)
    expect(f.today.steps).toMatchObject({ value: null, held: true })
    expect(f.heldMetrics).toContain('weight_body_mass')
    expect(f.heldMetrics).toContain('step_count')
  })

  it('survives every optional endpoint being unavailable', () => {
    const f = buildFitness(
      {
        summary: SUMMARY,
        medications: null,
        workouts: null,
        bp: null,
        weight: null,
        sleep: null,
        diet: null,
        steps: null,
      },
      NOW
    )
    expect(f.today.steps?.value).toBe(3994)
    expect(f.medication).toBeNull()
    expect(f.bp.points).toEqual([])
    expect(f.workouts[0].days).toHaveLength(7)
    expect(f.stepsAvg7).toBeNull()
  })
})

describe('fetchFitness', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    _resetCache()
    process.env.HEALTHKIT_URL = 'http://192.168.50.51:8099'
    process.env.HEALTHKIT_READ_KEY = 'read-key'
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.HEALTHKIT_URL
    delete process.env.HEALTHKIT_READ_KEY
    delete process.env.FITNESS_CALORIE_BUDGET
  })

  function mockHk({ summary = true, series = true } = {}) {
    const fetchMock = vi.fn(async (url: string) => {
      const isSummary = url.endsWith('/api/summary')
      if (isSummary && !summary) throw new Error('summary down')
      if (!isSummary && !series) throw new Error('series down')
      if (isSummary) return { ok: true, json: async () => SUMMARY }
      if (url.includes('/records/medications'))
        return { ok: true, json: async () => BUNDLE.medications }
      if (url.includes('/records/workouts')) return { ok: true, json: async () => BUNDLE.workouts }
      if (url.includes('blood_pressure')) return { ok: true, json: async () => BUNDLE.bp }
      if (url.includes('weight_body_mass')) return { ok: true, json: async () => BUNDLE.weight }
      if (url.includes('sleep_analysis')) return { ok: true, json: async () => BUNDLE.sleep }
      if (url.includes('dietary_energy')) return { ok: true, json: async () => BUNDLE.diet }
      return { ok: true, json: async () => BUNDLE.steps }
    })
    global.fetch = fetchMock as unknown as typeof fetch
    return fetchMock
  }

  it('returns an unconfigured summary without env vars, and makes no call', async () => {
    delete process.env.HEALTHKIT_READ_KEY
    const fetchMock = mockHk()
    const summary = await fetchFitness()
    expect(summary.configured).toBe(false)
    expect(summary.reachable).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads every endpoint with the API key header', async () => {
    const fetchMock = mockHk()
    const summary = await fetchFitness()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.50.51:8099/api/summary',
      expect.objectContaining({ headers: { 'X-Api-Key': 'read-key' } })
    )
    expect(summary.configured).toBe(true)
    expect(summary.reachable).toBe(true)
    expect(summary.today.steps?.value).toBe(3994)
    expect(summary.bp.points.length).toBeGreaterThan(0)
  })

  it('never asks the workout listing for full payloads', async () => {
    const fetchMock = mockHk()
    await fetchFitness()
    const urls = fetchMock.mock.calls.map(([u]) => String(u))
    expect(urls.some((u) => u.includes('/records/workouts'))).toBe(true)
    expect(urls.some((u) => u.includes('full=1'))).toBe(false)
  })

  it('caches, so several layouts mounting the widget do not multiply upstream calls', async () => {
    const fetchMock = mockHk()
    await fetchFitness()
    const first = fetchMock.mock.calls.length
    await fetchFitness()
    expect(fetchMock.mock.calls.length).toBe(first)
  })

  it('still serves the day when a trend endpoint fails', async () => {
    mockHk({ series: false })
    const summary = await fetchFitness()
    expect(summary.reachable).toBe(true)
    expect(summary.today.steps?.value).toBe(3994)
    expect(summary.bp.points).toEqual([])
    expect(summary.medication).toBeNull()
  })

  it('serves the last good payload, flagged unreachable, when the service is down', async () => {
    mockHk()
    await fetchFitness()

    // Step past the cache TTL without clearing the last-good payload behind it
    const later = Date.now() + 10 * 60 * 1000
    const clock = vi.spyOn(Date, 'now').mockReturnValue(later)
    mockHk({ summary: false })
    const summary = await fetchFitness()
    clock.mockRestore()

    expect(summary.reachable).toBe(false)
    expect(summary.today.steps?.value).toBe(3994)
  })

  it('honours the calorie budget override', async () => {
    process.env.FITNESS_CALORIE_BUDGET = '2100'
    mockHk()
    const summary = await fetchFitness()
    expect(summary.calories.budget).toBe(2100)
    expect(summary.calories.remaining).toBe(474)
  })
})
