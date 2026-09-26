import {
  BpPoint,
  BpTrend,
  CalorieBudget,
  DailyPoint,
  FitnessHistory,
  FitnessReading,
  FitnessSummary,
  FitnessVital,
  MedicationStatus,
  SleepNight,
  SleepTrend,
  WeightTrend,
  WorkoutDay,
  WorkoutPlan,
} from '../types/index.js'

// The healthkit service on popos — LAN address, read-only key. Never the public hostname:
// that would leave the LAN for a call that starts and ends on the same box.
const HK_URL = () => (process.env.HEALTHKIT_URL || '').replace(/\/+$/, '')
const HK_KEY = () => process.env.HEALTHKIT_READ_KEY || ''

const numEnv = (raw: string | undefined, fallback: number) => {
  const n = Number.parseFloat(raw ?? '')
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const CALORIE_BUDGET = () => numEnv(process.env.FITNESS_CALORIE_BUDGET, 1900)
const WORKOUT_DAYS = () => numEnv(process.env.FITNESS_WORKOUT_DAYS, 5)
const WORKOUT_MINUTES = () => numEnv(process.env.FITNESS_WORKOUT_MINUTES, 60)
const LIFT_DAYS = () => numEnv(process.env.FITNESS_LIFT_DAYS, 3)

// The phone pushes hourly at best, so a faster poll cannot show anything newer
const CACHE_TTL_MS = 5 * 60 * 1000
const BP_DAYS = 30
const WEIGHT_DAYS = 90
const SLEEP_NIGHTS = 7

/**
 * The disciplines the board tracks, each against its own rolling-7-day target.
 * `targetMinutes: 0` means any session counts, however short — the lifting goal is
 * about turning up three times a week, not about time under the bar.
 */
interface WorkoutSpec {
  key: string
  label: string
  verb: string
  re: RegExp
  targetDays: () => number
  targetMinutes: () => number
}

const WORKOUT_SPECS: WorkoutSpec[] = [
  {
    key: 'cycling',
    label: 'Cycling',
    verb: 'Ride',
    re: /cycl|spin|bike/i,
    targetDays: WORKOUT_DAYS,
    targetMinutes: WORKOUT_MINUTES,
  },
  {
    key: 'lifting',
    label: 'Lifting',
    verb: 'Lift',
    // Apple's activityType is `traditional_strength_training`
    re: /strength|weight.?lift|lifting|resistance/i,
    targetDays: LIFT_DAYS,
    targetMinutes: () => 0,
  },
]

/**
 * Which medication the widget tracks. Health Auto Export sends every logged dose; this
 * picks the blood-pressure one by nickname or label. If nothing matches, the most
 * recently logged medication is used instead, so the card never sits blank when the
 * med is simply named something else.
 */
const MED_RE = /\bbp\b|blood.?pressure|hyzaar|losartan|lisinopril|amlodipine/i

/** A session shorter than this fraction of the target doesn't count as a day */
const QUALIFYING_FRACTION = 0.5

interface Slot {
  metric?: string
  field?: string
  value?: number | null
  units?: string
  ts?: string | null
  fields?: Record<string, number>
  heldFor?: string
}

interface HkSummary {
  asOf?: string
  localDate?: string
  timezone?: string
  today?: Record<string, Slot | null>
  latest?: Record<string, Slot | null>
  sleep?: Slot | null
  workouts?: { last7Days?: number; latest?: { name?: string; ts?: string } | null } | null
  ingest?: { received_at?: string; ageHours?: number | null } | null
  unitChanges?: { metric?: string }[]
}

interface HkPoint {
  ts: string
  source?: string
  field: string
  value: number
  units?: string
}

interface HkSeries {
  metric?: string
  points?: HkPoint[]
  unitsSeen?: string[]
  mixedUnits?: boolean
}

interface HkRecord {
  id: string
  ts: string
  name?: string | null
  detail?: Record<string, unknown>
}

interface HkRecords {
  records?: HkRecord[]
}

interface RawBundle {
  summary: HkSummary
  medications: HkRecords | null
  workouts: HkRecords | null
  bp: HkSeries | null
  weight: HkSeries | null
  sleep: HkSeries | null
  diet: HkSeries | null
  steps: HkSeries | null
}

interface CacheEntry {
  data: FitnessSummary
  fetchedAt: number
}

let cache: CacheEntry | null = null
let lastGood: FitnessSummary | null = null

export function _resetCache() {
  cache = null
  lastGood = null
}

// ── Dates ──

/**
 * The calendar date a UTC timestamp falls on in the health service's own timezone.
 * The kiosk, the backend and the phone must not be able to disagree about what day it is.
 */
export function localDateOf(ts: string, timezone: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

/** Health Auto Export writes wall-clock strings with their own offset: "2026-09-21 09:00:14 -0700" */
function localDateOfStamp(stamp: unknown): string {
  return typeof stamp === 'string' ? stamp.slice(0, 10) : ''
}

function localTimeOfStamp(stamp: unknown): string | null {
  return typeof stamp === 'string' && stamp.length >= 16 ? stamp.slice(11, 16) : null
}

/** The `count` calendar dates ending at `endDate`, oldest first */
export function dateWindow(endDate: string, count: number): string[] {
  const end = Date.parse(`${endDate}T12:00:00Z`)
  if (Number.isNaN(end)) return []
  return Array.from({ length: count }, (_, i) =>
    new Date(end - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10)
  )
}

// ── Readings ──

function reading(slot: Slot | null | undefined): FitnessReading | null {
  if (!slot) return null
  return {
    metric: slot.metric ?? '',
    value: typeof slot.value === 'number' ? slot.value : null,
    units: slot.units ?? '',
    held: Boolean(slot.heldFor),
    ts: slot.ts ?? null,
  }
}

/** Apple reports heart rates as "count/min"; every dashboard on earth calls that bpm */
function prettyUnits(units: string): string {
  return units === 'count/min' ? 'bpm' : units === 'count' ? '' : units
}

const VITAL_SPEC: { key: string; label: string; units?: string }[] = [
  { key: 'restingHeartRate', label: 'Resting HR' },
  { key: 'hrv', label: 'HRV' },
  { key: 'vo2Max', label: 'VO₂ Max' },
  { key: 'bloodOxygen', label: 'SpO₂' },
  // Apple reports breaths in count/min too, and "16 bpm" beside a heart rate reads as a pulse
  { key: 'respiratoryRate', label: 'Resp', units: '/min' },
  { key: 'bodyFat', label: 'Body Fat' },
  { key: 'bmi', label: 'BMI' },
]

export function buildVitals(latest: Record<string, Slot | null>): FitnessVital[] {
  const out: FitnessVital[] = []
  for (const { key, label, units } of VITAL_SPEC) {
    const slot = latest[key]
    if (!slot) continue
    const held = Boolean(slot.heldFor)
    const value = typeof slot.value === 'number' ? slot.value : null
    if (value === null && !held) continue
    out.push({ key, label, value, units: units ?? prettyUnits(slot.units ?? ''), held })
  }
  return out
}

// ── Medication ──

function detailOf(rec: HkRecord): Record<string, unknown> {
  return (rec.detail ?? {}) as Record<string, unknown>
}

function medLabel(rec: HkRecord): string {
  const d = detailOf(rec)
  const nickname = typeof d.nickname === 'string' ? d.nickname.trim() : ''
  const display = typeof d.displayText === 'string' ? d.displayText.trim() : ''
  return nickname || display || rec.name || 'Medication'
}

function isTaken(rec: HkRecord): boolean {
  const status = detailOf(rec).status
  return typeof status === 'string' && /taken/i.test(status)
}

/**
 * Whether the blood-pressure dose has been logged today, plus the streak behind it.
 *
 * A missing dose *today* doesn't break the streak — it's only "not yet". The streak
 * therefore counts back from today when today is logged, and from yesterday when it
 * isn't, so the number never collapses to zero first thing in the morning.
 */
export function medicationStatus(records: HkRecord[], today: string): MedicationStatus | null {
  if (records.length === 0) return null

  const matched = records.filter((r) => MED_RE.test(medLabel(r) + ' ' + (r.name ?? '')))
  const relevant = matched.length > 0 ? matched : records
  if (relevant.length === 0) return null

  const takenDates = new Set<string>()
  for (const rec of relevant) {
    if (!isTaken(rec)) continue
    const date = localDateOfStamp(detailOf(rec).start) || localDateOfStamp(rec.ts)
    if (date) takenDates.add(date)
  }

  const window = dateWindow(today, 7)
  const takenToday = takenDates.has(today)

  let streak = 0
  // Before the dose is due, "not yet today" shouldn't read as a broken streak
  const start = takenToday ? 0 : 1
  for (let i = start; ; i++) {
    const day = new Date(Date.parse(`${today}T12:00:00Z`) - i * 86_400_000)
      .toISOString()
      .slice(0, 10)
    if (!takenDates.has(day)) break
    streak++
  }

  const todayRec = relevant.find((r) => isTaken(r) && localDateOfStamp(detailOf(r).start) === today)
  const newest = [...relevant].sort((a, b) => (a.ts < b.ts ? 1 : -1))[0]
  const scheduled = detailOf(todayRec ?? newest).scheduledDate

  return {
    name: medLabel(newest),
    detail: (() => {
      const text = detailOf(newest).displayText
      return typeof text === 'string' && text.trim() ? text.trim() : null
    })(),
    takenToday,
    takenAt: todayRec ? localTimeOfStamp(detailOf(todayRec).start) : null,
    scheduledAt: localTimeOfStamp(scheduled),
    streakDays: streak,
    last7: window.map((date) => ({ date, taken: takenDates.has(date) })),
  }
}

// ── Workouts ──

function workoutMinutes(rec: HkRecord): number {
  const d = detailOf(rec)
  const seconds = typeof d.duration === 'number' ? d.duration : 0
  return seconds / 60
}

function matchesActivity(rec: HkRecord, re: RegExp): boolean {
  const d = detailOf(rec)
  const activities = Array.isArray(d.activities) ? d.activities : []
  const types = activities
    .map((a) =>
      a && typeof a === 'object' ? (a as { activityType?: unknown }).activityType : null
    )
    .filter((t): t is string => typeof t === 'string')
  return re.test([rec.name ?? '', ...types].join(' '))
}

/**
 * Progress against a discipline's goal — "an hour on the bike, five days a week",
 * "lift three days a week" — measured over a rolling seven-day window rather than a
 * calendar week, so the board says "ride today" on a Monday for the same reason it
 * would on a Friday.
 */
export function workoutPlan(
  records: HkRecord[],
  today: string,
  spec: { key: string; label: string; verb: string; re: RegExp },
  targetDays: number,
  targetMinutes: number
): WorkoutPlan {
  const byDate = new Map<string, number>()
  let lastSession: WorkoutPlan['lastSession'] = null

  for (const rec of records) {
    if (!matchesActivity(rec, spec.re)) continue
    const date = localDateOfStamp(detailOf(rec).start) || localDateOfStamp(rec.ts)
    if (!date) continue
    const minutes = workoutMinutes(rec)
    byDate.set(date, (byDate.get(date) ?? 0) + minutes)
    if (!lastSession || rec.ts > lastSession.ts) {
      lastSession = { name: rec.name ?? 'Workout', ts: rec.ts, minutes: Math.round(minutes) }
    }
  }

  // A day counts once the session is at least half the target length; with no minutes
  // target, any logged session does
  const floor = targetMinutes * QUALIFYING_FRACTION
  const days: WorkoutDay[] = dateWindow(today, 7).map((date) => {
    const minutes = Math.round(byDate.get(date) ?? 0)
    return { date, minutes, qualifying: minutes > 0 && minutes >= floor }
  })

  const minutesToday = days[days.length - 1]?.minutes ?? 0
  const doneToday = minutesToday > 0 && minutesToday >= floor
  const daysInWindow = days.filter((d) => d.qualifying).length

  return {
    key: spec.key,
    label: spec.label,
    verb: spec.verb,
    targetDays,
    targetMinutes,
    minutesToday,
    doneToday,
    needToday: !doneToday && daysInWindow < targetDays,
    daysInWindow,
    lastSession,
    days,
  }
}

// ── Series ──

function seriesHeld(series: HkSeries | null): boolean {
  return Boolean(series?.mixedUnits)
}

export function buildBpTrend(series: HkSeries | null, timezone: string): BpTrend {
  const held = seriesHeld(series)
  const byDate = new Map<string, { systolic?: number; diastolic?: number }>()

  if (!held) {
    for (const p of series?.points ?? []) {
      const date = localDateOf(p.ts, timezone)
      if (!date) continue
      const entry = byDate.get(date) ?? {}
      if (p.field === 'systolic') entry.systolic = p.value
      if (p.field === 'diastolic') entry.diastolic = p.value
      byDate.set(date, entry)
    }
  }

  const points: BpPoint[] = [...byDate.entries()]
    .filter(([, v]) => typeof v.systolic === 'number' && typeof v.diastolic === 'number')
    .map(([date, v]) => ({
      date,
      systolic: Math.round(v.systolic!),
      diastolic: Math.round(v.diastolic!),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const mean = (nums: number[]) =>
    nums.length > 0 ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : null

  return {
    days: BP_DAYS,
    points,
    latest: points[points.length - 1] ?? null,
    avgSystolic: mean(points.map((p) => p.systolic)),
    avgDiastolic: mean(points.map((p) => p.diastolic)),
    held,
  }
}

/** A single-field series collapsed to one value per local day, oldest first */
export function dailyPoints(
  series: HkSeries | null,
  timezone: string,
  field = 'qty',
  decimals = 1
): DailyPoint[] {
  if (seriesHeld(series)) return []
  const byDate = new Map<string, number[]>()
  for (const p of series?.points ?? []) {
    if (p.field !== field) continue
    const date = localDateOf(p.ts, timezone)
    if (!date) continue
    byDate.set(date, [...(byDate.get(date) ?? []), p.value])
  }
  const round = 10 ** decimals
  return [...byDate.entries()]
    .map(([date, values]) => ({
      date,
      value: Math.round((values.reduce((s, n) => s + n, 0) / values.length) * round) / round,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * The window a series actually occupies. The API is asked for 90 days, but the record
 * may only start part way in — drawing that as a 90-day frame leaves the left half
 * empty under a label claiming ninety days of data. Shrink the window to the span the
 * readings really cover, and let the plot label itself from it.
 */
export function spannedDays(points: DailyPoint[], today: string, max: number): number {
  const first = points[0]?.date
  const start = first ? Date.parse(`${first}T12:00:00Z`) : NaN
  const end = Date.parse(`${today}T12:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return max
  // Inclusive of both ends: a reading yesterday and one today span two days
  const span = Math.round((end - start) / 86_400_000) + 1
  return Math.max(1, Math.min(max, span))
}

export function buildWeightTrend(
  series: HkSeries | null,
  timezone: string,
  today: string
): WeightTrend {
  const held = seriesHeld(series)
  const points = dailyPoints(series, timezone)

  const first = points[0]?.value ?? null
  const last = points[points.length - 1]?.value ?? null

  return {
    days: spannedDays(points, today, WEIGHT_DAYS),
    units: series?.unitsSeen?.[0] ?? 'lb',
    points,
    latest: last,
    change: first !== null && last !== null ? Math.round((last - first) * 10) / 10 : null,
    held,
  }
}

/**
 * A night's sleep as one 0–100 number, so seven of them fit in a strip the width of a
 * thumb. Three things, weighted the way the sleep literature weights them:
 *
 *   duration    (60%) — hours asleep against an 8-hour target
 *   restorative (25%) — deep + REM as a share of the night, against 35%
 *   efficiency  (15%) — asleep against time in bed, against 90%
 *
 * Each component is capped at its target, so a long night can't buy back a broken one.
 */
export function scoreNight(n: { hours: number; deep: number; rem: number; awake: number }): number {
  if (n.hours <= 0) return 0
  const duration = Math.min(1, n.hours / 8)
  const restorative = Math.min(1, (n.deep + n.rem) / n.hours / 0.35)
  const efficiency = Math.min(1, n.hours / (n.hours + n.awake) / 0.9)
  return Math.round(100 * (0.6 * duration + 0.25 * restorative + 0.15 * efficiency))
}

/**
 * The nights recorded in the SLEEP_NIGHTS calendar days ending `today` — the same week
 * the plot draws — or every recorded night when `today` is omitted (the history view).
 * A night with no record is unmeasured, not a zero: it is left out of the nights and
 * out of both averages, so a night without the watch can't drag the score down.
 */
export function buildSleepTrend(
  series: HkSeries | null,
  timezone: string,
  today?: string
): SleepTrend {
  const end = today ? Date.parse(`${today}T12:00:00Z`) : NaN
  const start = Number.isFinite(end)
    ? new Date(end - (SLEEP_NIGHTS - 1) * 86_400_000).toISOString().slice(0, 10)
    : null
  const inWindow = (date: string) => start === null || (date >= start && date <= (today ?? ''))

  const byDate = new Map<string, Record<string, number>>()
  for (const p of series?.points ?? []) {
    const date = localDateOf(p.ts, timezone)
    if (!date) continue
    byDate.set(date, { ...(byDate.get(date) ?? {}), [p.field]: p.value })
  }

  const nights: SleepNight[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, f]) => {
      // `asleep` is 0 on Apple Watch exports; totalsleep is the field that carries the night
      const hours = f.totalsleep ?? f.asleep ?? 0
      const night = {
        hours: Math.round(hours * 100) / 100,
        deep: Math.round((f.deep ?? 0) * 100) / 100,
        rem: Math.round((f.rem ?? 0) * 100) / 100,
        core: Math.round((f.core ?? 0) * 100) / 100,
        awake: Math.round((f.awake ?? 0) * 100) / 100,
      }
      return { date, ...night, score: scoreNight(night) }
    })
    .filter((n) => n.hours > 0 && inWindow(n.date))

  const mean = (nums: number[]) =>
    nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : null
  const avgScore = mean(nights.map((n) => n.score))
  const avgHours = mean(nights.map((n) => n.hours))

  return {
    nights,
    score: avgScore === null ? null : Math.round(avgScore),
    avgHours: avgHours === null ? null : Math.round(avgHours * 10) / 10,
  }
}

// ── Calories ──

export function buildCalories(
  diet: HkSeries | null,
  activeEnergy: FitnessReading | null,
  today: string,
  timezone: string,
  budget: number
): CalorieBudget {
  const held = seriesHeld(diet)
  const todayPoint = held
    ? null
    : (diet?.points ?? []).find((p) => p.field === 'qty' && localDateOf(p.ts, timezone) === today)

  const consumed = todayPoint ? Math.round(todayPoint.value) : null

  return {
    budget,
    consumed,
    remaining: consumed === null ? null : Math.round(budget - consumed),
    burnedActive: typeof activeEnergy?.value === 'number' ? Math.round(activeEnergy.value) : null,
    held,
  }
}

// ── Assembly ──

export function buildFitness(raw: RawBundle, nowMs: number): FitnessSummary {
  const s = raw.summary
  const timezone = s.timezone || 'UTC'
  const localDate = s.localDate || localDateOf(new Date(nowMs).toISOString(), timezone)
  const today = s.today ?? {}
  const latest = s.latest ?? {}

  const activeEnergy = reading(today.activeEnergy)
  const stepsWeek = dailyPoints(raw.steps, timezone, 'qty', 0)

  const heldMetrics = [
    ...new Set(
      [
        ...(s.unitChanges ?? []).map((u) => u.metric ?? ''),
        ...[...Object.values(today), ...Object.values(latest), s.sleep].map((slot) =>
          slot?.heldFor ? (slot.metric ?? '') : ''
        ),
      ].filter(Boolean)
    ),
  ]

  return {
    configured: true,
    reachable: true,
    localDate,
    timezone,
    asOf: s.asOf ?? null,
    ingestAgeHours: typeof s.ingest?.ageHours === 'number' ? s.ingest.ageHours : null,
    medication: medicationStatus(raw.medications?.records ?? [], localDate),
    today: {
      steps: reading(today.steps),
      activeEnergy,
      exerciseMinutes: reading(today.exerciseMinutes),
      standHours: reading(today.standHours),
      distance: reading(today.distance),
      flightsClimbed: reading(today.flightsClimbed),
    },
    calories: buildCalories(raw.diet, activeEnergy, localDate, timezone, CALORIE_BUDGET()),
    workouts: WORKOUT_SPECS.map((spec) =>
      workoutPlan(
        raw.workouts?.records ?? [],
        localDate,
        spec,
        Math.round(spec.targetDays()),
        Math.round(spec.targetMinutes())
      )
    ),
    stepsWeek,
    stepsAvg7:
      stepsWeek.length > 0
        ? Math.round(stepsWeek.reduce((sum, p) => sum + p.value, 0) / stepsWeek.length)
        : null,
    bp: buildBpTrend(raw.bp, timezone),
    weight: buildWeightTrend(raw.weight, timezone, localDate),
    sleep: buildSleepTrend(raw.sleep, timezone, localDate),
    vitals: buildVitals(latest),
    heldMetrics,
    updatedAt: new Date(nowMs).toISOString(),
  }
}

export function emptyFitness(configured: boolean): FitnessSummary {
  const now = new Date()
  return {
    configured,
    reachable: false,
    localDate: now.toISOString().slice(0, 10),
    timezone: 'UTC',
    asOf: null,
    ingestAgeHours: null,
    medication: null,
    today: {
      steps: null,
      activeEnergy: null,
      exerciseMinutes: null,
      standHours: null,
      distance: null,
      flightsClimbed: null,
    },
    calories: {
      budget: CALORIE_BUDGET(),
      consumed: null,
      remaining: null,
      burnedActive: null,
      held: false,
    },
    workouts: WORKOUT_SPECS.map((spec) => ({
      key: spec.key,
      label: spec.label,
      verb: spec.verb,
      targetDays: Math.round(spec.targetDays()),
      targetMinutes: Math.round(spec.targetMinutes()),
      minutesToday: 0,
      doneToday: false,
      needToday: false,
      daysInWindow: 0,
      lastSession: null,
      days: [],
    })),
    bp: {
      days: BP_DAYS,
      points: [],
      latest: null,
      avgSystolic: null,
      avgDiastolic: null,
      held: false,
    },
    weight: { days: WEIGHT_DAYS, units: 'lb', points: [], latest: null, change: null, held: false },
    sleep: { nights: [], score: null, avgHours: null },
    stepsWeek: [],
    stepsAvg7: null,
    vitals: [],
    heldMetrics: [],
    updatedAt: now.toISOString(),
  }
}

async function hkGet<T>(path: string): Promise<T> {
  const res = await fetch(`${HK_URL()}${path}`, {
    headers: { 'X-Api-Key': HK_KEY() },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`healthkit API error: ${res.status} (${path})`)
  return (await res.json()) as T
}

/** A trend or record listing that fails is a missing panel, not a broken card */
async function optional<T>(path: string): Promise<T | null> {
  try {
    return await hkGet<T>(path)
  } catch (err) {
    console.error('[GBoard API] healthkit fetch failed:', err)
    return null
  }
}

export async function fetchFitness(): Promise<FitnessSummary> {
  if (!HK_URL() || !HK_KEY()) return emptyFitness(false)

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data
  }

  try {
    // /api/summary is the one call that must succeed; the rest fill in panels.
    // Never `full=1` on the workout listing — one export inlines its whole sample series.
    const summary = await hkGet<HkSummary>('/api/summary')
    const [medications, workouts, bp, weight, sleep, diet, steps] = await Promise.all([
      optional<HkRecords>('/api/records/medications?limit=40'),
      optional<HkRecords>('/api/records/workouts?limit=40'),
      optional<HkSeries>(`/api/metrics/blood_pressure?days=${BP_DAYS}`),
      optional<HkSeries>(`/api/metrics/weight_body_mass?days=${WEIGHT_DAYS}&field=qty`),
      optional<HkSeries>(`/api/metrics/sleep_analysis?days=${SLEEP_NIGHTS}`),
      optional<HkSeries>('/api/metrics/dietary_energy?days=2&field=qty'),
      optional<HkSeries>('/api/metrics/step_count?days=7&field=qty'),
    ])

    const data = buildFitness(
      { summary, medications, workouts, bp, weight, sleep, diet, steps },
      Date.now()
    )
    cache = { data, fetchedAt: Date.now() }
    lastGood = data
    return data
  } catch (err) {
    if (lastGood) return { ...lastGood, reachable: false }
    console.error('[GBoard API] healthkit fetch failed:', err)
    return emptyFitness(true)
  }
}

// ── History (the mobile chart explorer) ──

// "Everything": healthkit filters by `ts >= now - days`, so a decade is the whole record
const HISTORY_DAYS = 3650
// History is for zooming around in, not for today's figures — those come from
// fetchFitness(). Ten minutes spares healthkit a re-read on every explorer open.
const HISTORY_TTL_MS = 10 * 60 * 1000

let historyCache: { data: FitnessHistory; fetchedAt: number } | null = null
let historyLastGood: FitnessHistory | null = null

export function _resetHistoryCache() {
  historyCache = null
  historyLastGood = null
}

export function emptyHistory(
  configured: boolean,
  localDate: string,
  timezone: string
): FitnessHistory {
  return {
    configured,
    reachable: false,
    localDate,
    timezone,
    bp: { points: [], held: false },
    weight: { units: 'lb', points: [], held: false },
    sleep: { nights: [], held: false },
    steps: { points: [], held: false },
    updatedAt: new Date().toISOString(),
  }
}

export function buildHistory(
  raw: {
    bp: HkSeries | null
    weight: HkSeries | null
    sleep: HkSeries | null
    steps: HkSeries | null
  },
  localDate: string,
  timezone: string,
  nowMs: number
): FitnessHistory {
  const sleepHeld = seriesHeld(raw.sleep)
  return {
    configured: true,
    reachable: true,
    localDate,
    timezone,
    bp: { points: buildBpTrend(raw.bp, timezone).points, held: seriesHeld(raw.bp) },
    weight: {
      units: raw.weight?.unitsSeen?.[0] ?? 'lb',
      points: dailyPoints(raw.weight, timezone),
      held: seriesHeld(raw.weight),
    },
    // buildSleepTrend has no hold of its own; a held sleep series must not plot
    sleep: {
      nights: sleepHeld ? [] : buildSleepTrend(raw.sleep, timezone).nights,
      held: sleepHeld,
    },
    steps: { points: dailyPoints(raw.steps, timezone, 'qty', 0), held: seriesHeld(raw.steps) },
    updatedAt: new Date(nowMs).toISOString(),
  }
}

export async function fetchFitnessHistory(): Promise<FitnessHistory> {
  // The summary (cached) owns what "today" and the timezone are — one answer for both
  const summary = await fetchFitness()
  if (!summary.configured) return emptyHistory(false, summary.localDate, summary.timezone)

  if (historyCache && Date.now() - historyCache.fetchedAt < HISTORY_TTL_MS) {
    return historyCache.data
  }

  const [bp, weight, sleep, steps] = await Promise.all([
    optional<HkSeries>(`/api/metrics/blood_pressure?days=${HISTORY_DAYS}`),
    optional<HkSeries>(`/api/metrics/weight_body_mass?days=${HISTORY_DAYS}&field=qty`),
    optional<HkSeries>(`/api/metrics/sleep_analysis?days=${HISTORY_DAYS}`),
    optional<HkSeries>(`/api/metrics/step_count?days=${HISTORY_DAYS}&field=qty`),
  ])

  // All four failing is an outage, not four empty series
  if (!bp && !weight && !sleep && !steps) {
    if (historyLastGood) return { ...historyLastGood, reachable: false }
    return emptyHistory(true, summary.localDate, summary.timezone)
  }

  const data = buildHistory(
    { bp, weight, sleep, steps },
    summary.localDate,
    summary.timezone,
    Date.now()
  )
  historyCache = { data, fetchedAt: Date.now() }
  historyLastGood = data
  return data
}
