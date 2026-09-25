import {
  CalendarEvent,
  FitnessSummary,
  HomeAssistantSummary,
  UpcomingItem,
  WeatherData,
  WordOfDay,
  WorkoutPlan,
} from '../types/index.js'
import { PiholeStats } from '../hooks/usePihole.js'
import { PlexSession } from '../types/index.js'
import { computeSoberDuration } from '../utils/soberCounter.js'

/**
 * Everything the mobile view decides — what is OK, what needs attention, what each
 * glance row says — lives here as pure functions, so it can be tested without a DOM.
 *
 * Status is always carried by a glyph as well as a colour (see Glyph in parts.tsx):
 *   good  ✓   the thing is fine
 *   warn  !   worth acting on today
 *   bad   ✕   broken, or a reading that needs a person
 *   none  •   information only
 *   stale     hatched — the figure is real but old, or held; never a number to trust
 */
export type Status = 'good' | 'warn' | 'bad' | 'none' | 'stale'

export type SectionId = 'health' | 'today' | 'home' | 'infra'

// The phone pushes hourly while unlocked, so a quiet night is normal; 26 h is the first
// hour that isn't. Same threshold as the kiosk's Blueprint health panel.
export const STALE_HOURS = 26

export interface MobileData {
  fitness: FitnessSummary | null
  weather: WeatherData | null
  events: CalendarEvent[] | null
  media: UpcomingItem[] | null
  word: WordOfDay | null
  ha: HomeAssistantSummary | null
  pihole: PiholeStats | null
  plex: PlexSession[] | null
}

export type MobileErrors = Partial<Record<keyof MobileData, string | null>>

export interface Attention {
  status: 'warn' | 'bad'
  title: string
  detail: string
  section: SectionId
  row?: string
}

export interface GlanceRow {
  key: string
  status: Status
  label: string
  value: string
  note?: string // small secondary text beside the value
  aside: string // right-hand note, coloured by status unless `plainAside`
  plainAside?: boolean
  cells?: { on: boolean; due: boolean }[] // tiny 7-day strip for workouts
  bar?: number // 0–1 mini bar instead of an aside
  row: string // the detail row this jumps to
}

export interface GlanceGroup {
  section: SectionId
  title: string
  rows: GlanceRow[]
}

// ── formatting ──

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

/** "08:29" → "8:29 AM" */
export function clock12(hhmm: string | null | undefined): string {
  if (!hhmm) return ''
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  if (!m) return hhmm
  const h = Number(m[1])
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

/** A YYYY-MM-DD date read as a local calendar day, noon to dodge DST edges */
export function dayOf(date: string): Date {
  return new Date(`${date}T12:00:00`)
}

export function weekday(date: string, style: 'long' | 'short' = 'long'): string {
  return dayOf(date).toLocaleDateString('en-US', { weekday: style })
}

export function localHHMM(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

const METRIC_LABELS: Record<string, string> = {
  weight_body_mass: 'Weight',
  blood_pressure: 'Blood pressure',
  dietary_energy: 'Calories',
  step_count: 'Steps',
  sleep_analysis: 'Sleep',
  active_energy: 'Active energy',
  resting_heart_rate: 'Resting heart rate',
  heart_rate_variability: 'Heart rate variability',
}

export function metricLabel(metric: string): string {
  if (METRIC_LABELS[metric]) return METRIC_LABELS[metric]
  const words = metric.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// ── health ──

export type HealthState = 'loading' | 'unconfigured' | 'nodata' | 'stale' | 'ok'

export function healthState(f: FitnessSummary | null): HealthState {
  if (!f) return 'loading'
  if (!f.configured) return 'unconfigured'
  if (f.ingestAgeHours === null) return 'nodata'
  if (f.ingestAgeHours > STALE_HOURS) return 'stale'
  return 'ok'
}

export type BpClass = 'normal' | 'elevated' | 'stage 1' | 'stage 2'

/** ACC/AHA categories — the reading's worse number decides */
export function bpClass(systolic: number, diastolic: number): BpClass {
  if (systolic >= 140 || diastolic >= 90) return 'stage 2'
  if (systolic >= 130 || diastolic >= 80) return 'stage 1'
  if (systolic >= 120) return 'elevated'
  return 'normal'
}

const BP_STATUS: Record<BpClass, Status> = {
  normal: 'good',
  elevated: 'none',
  'stage 1': 'warn',
  'stage 2': 'bad',
}

export function sleepStatus(score: number): { status: Status; word: string } {
  if (score >= 80) return { status: 'good', word: 'good night' }
  if (score >= 65) return { status: 'none', word: 'fair night' }
  return { status: 'warn', word: 'short night' }
}

/** The three parts of scoreNight() in fitnessService, for the "how it works" breakdown */
export function sleepScoreParts(n: { hours: number; deep: number; rem: number; awake: number }) {
  if (n.hours <= 0) return null
  const share = (n.deep + n.rem) / n.hours
  const efficiency = n.hours / (n.hours + n.awake)
  return {
    duration: Math.min(1, n.hours / 8) * 60,
    restorative: Math.min(1, share / 0.35) * 25,
    efficiency: Math.min(1, efficiency / 0.9) * 15,
    share,
    efficiencyPct: efficiency,
  }
}

export function lastNight(f: FitnessSummary) {
  const n = f.sleep.nights[f.sleep.nights.length - 1]
  return n && n.date === f.localDate ? n : null
}

export function medDue(f: FitnessSummary, now: Date): boolean {
  const m = f.medication
  if (!m || m.takenToday || !m.scheduledAt) return false
  return localHHMM(now) >= m.scheduledAt.slice(0, 5)
}

function workoutOwed(w: WorkoutPlan) {
  return w.needToday && !w.doneToday
}

/** "Cycling is 3 of 5 in the last 7 days, and Saturday's session leaves the window tomorrow." */
export function workoutReason(w: WorkoutPlan): string {
  const base = `${w.label} is ${w.daysInWindow} of ${w.targetDays} in the last 7 days`
  const oldest = w.days[0]
  if (oldest?.qualifying) {
    return `${base}, and ${weekday(oldest.date)}'s session leaves the window tomorrow.`
  }
  return `${base}.`
}

export function workoutCells(w: WorkoutPlan) {
  return w.days.map((d, i) => ({
    on: d.qualifying,
    due: i === w.days.length - 1 && workoutOwed(w),
  }))
}

// ── attention ──

export function attention(data: MobileData, errors: MobileErrors, now: Date): Attention[] {
  const out: Attention[] = []
  const f = data.fitness
  const hs = healthState(f)

  if (errors.fitness && !f) {
    out.push({
      status: 'bad',
      title: "Health data didn't load",
      detail: 'GBoard could not reach its own fitness API. Pull down to try again.',
      section: 'health',
    })
  }
  if (f && f.configured && !f.reachable) {
    out.push({
      status: 'warn',
      title: "The health service isn't answering",
      detail: 'Showing the last figures GBoard received from healthkit on popos.',
      section: 'health',
    })
  }
  if (f && hs === 'stale') {
    out.push({
      status: 'bad',
      title: `Phone last synced ${plural(Math.round(f.ingestAgeHours ?? 0), 'hour')} ago`,
      detail: 'Health figures are out of date. Open Health Auto Export on the phone.',
      section: 'health',
    })
  }

  if (f && hs === 'ok') {
    if (medDue(f, now) && f.medication) {
      out.push({
        status: 'warn',
        title: `${f.medication.name} not logged yet`,
        detail: `Due at ${clock12(f.medication.scheduledAt)}.`,
        section: 'health',
        row: 'meds',
      })
    }
    for (const w of f.workouts) {
      if (!workoutOwed(w)) continue
      const title =
        w.targetMinutes > 0 ? `${w.verb} ${w.targetMinutes} minutes today` : `${w.verb} today`
      out.push({ status: 'warn', title, detail: workoutReason(w), section: 'health', row: 'goals' })
    }
    const c = f.calories
    if (!c.held && c.remaining !== null && c.remaining < 0) {
      out.push({
        status: 'warn',
        title: `${fmt(-c.remaining)} calories over budget`,
        detail: `${fmt(c.consumed ?? 0)} eaten against ${fmt(c.budget)}.`,
        section: 'health',
        row: 'calories',
      })
    }
    const bp = f.bp.latest
    if (
      !f.bp.held &&
      bp &&
      bp.date === f.localDate &&
      bpClass(bp.systolic, bp.diastolic) === 'stage 2'
    ) {
      out.push({
        status: 'bad',
        title: `Blood pressure high: ${bp.systolic}/${bp.diastolic}`,
        detail: "Today's reading is in the stage 2 range.",
        section: 'health',
        row: 'bp',
      })
    }
  }

  for (const metric of f?.heldMetrics ?? []) {
    out.push({
      status: 'warn',
      title: `${metricLabel(metric)} is held`,
      detail: 'Its units changed. Confirm the change on the health service to resume the series.',
      section: 'health',
      row: metric === 'weight_body_mass' ? 'weight' : undefined,
    })
  }

  if (errors.pihole) {
    out.push({
      status: 'bad',
      title: "Pi-hole isn't answering",
      detail: 'GBoard could not reach Pi-hole on lepotato.',
      section: 'infra',
      row: 'pihole',
    })
  } else if (data.pihole && data.pihole.status !== 'enabled') {
    out.push({
      status: 'warn',
      title: 'Pi-hole blocking is off',
      detail: `Pi-hole reports "${data.pihole.status}".`,
      section: 'infra',
      row: 'pihole',
    })
  }

  if (data.ha && data.ha.configured && !data.ha.reachable) {
    out.push({
      status: 'warn',
      title: "Home Assistant isn't answering",
      detail: 'Indoor temperatures are the last ones GBoard received.',
      section: 'home',
      row: 'temps',
    })
  }

  return out.sort((a, b) => (a.status === b.status ? 0 : a.status === 'bad' ? -1 : 1))
}

// ── glance board ──

function healthRows(f: FitnessSummary, now: Date): GlanceRow[] {
  const stale = healthState(f) === 'stale'
  const st = (s: Status): Status => (stale ? 'stale' : s)
  const aside = (text: string) => (stale ? 'out of date' : text)
  const rows: GlanceRow[] = []

  const m = f.medication
  if (m) {
    const due = m.scheduledAt ? `due ${clock12(m.scheduledAt)}` : 'not logged'
    rows.push(
      m.takenToday
        ? {
            key: 'meds',
            status: st('good'),
            label: 'Meds',
            value: 'Taken',
            note: clock12(m.takenAt),
            aside: aside(`${m.streakDays}-day streak`),
            row: 'meds',
          }
        : {
            key: 'meds',
            status: st(medDue(f, now) ? 'warn' : 'none'),
            label: 'Meds',
            value: 'Not yet',
            aside: aside(due),
            row: 'meds',
          }
    )
  }

  for (const w of f.workouts) {
    const owed = workoutOwed(w)
    rows.push({
      key: w.key,
      status: st(w.doneToday ? 'good' : owed ? 'warn' : 'good'),
      label: w.label,
      value: `${w.daysInWindow} of ${w.targetDays}`,
      cells: workoutCells(w),
      aside: aside(w.doneToday ? 'done today' : owed ? `${w.verb.toLowerCase()} today` : 'on pace'),
      row: 'goals',
    })
  }

  const steps = f.today.steps
  if (steps) {
    rows.push(
      steps.held
        ? {
            key: 'steps',
            status: 'stale',
            label: 'Steps',
            value: 'Held',
            aside: 'units changed',
            row: 'steps',
          }
        : {
            key: 'steps',
            status: st('none'),
            label: 'Steps',
            value: fmt(steps.value ?? 0),
            note: f.stepsAvg7 !== null ? `avg ${fmt(f.stepsAvg7)}` : undefined,
            aside: '',
            bar: f.stepsAvg7 ? Math.min(1, (steps.value ?? 0) / f.stepsAvg7) : undefined,
            row: 'steps',
          }
    )
  }

  const c = f.calories
  if (c.held) {
    rows.push({
      key: 'calories',
      status: 'stale',
      label: 'Calories',
      value: 'Held',
      aside: 'units changed',
      row: 'calories',
    })
  } else if (c.consumed === null || c.remaining === null) {
    rows.push({
      key: 'calories',
      status: st('none'),
      label: 'Calories',
      value: 'Not logged',
      aside: aside(`${fmt(c.budget)} budget`),
      plainAside: true,
      row: 'calories',
    })
  } else {
    const over = c.remaining < 0
    rows.push({
      key: 'calories',
      status: st(over ? 'warn' : 'good'),
      label: 'Calories',
      value: fmt(Math.abs(c.remaining)),
      note: over ? 'over' : 'left',
      aside: aside(`${fmt(c.consumed)} eaten`),
      row: 'calories',
    })
  }

  const night = lastNight(f)
  if (night) {
    const s = sleepStatus(night.score)
    rows.push({
      key: 'sleep',
      status: st(s.status),
      label: 'Sleep',
      value: String(night.score),
      note: `${night.hours.toFixed(1)} h`,
      aside: aside(s.word),
      row: 'sleep',
    })
  } else {
    rows.push({
      key: 'sleep',
      status: st('none'),
      label: 'Sleep',
      value: 'No data',
      aside: aside('for last night'),
      plainAside: true,
      row: 'sleep',
    })
  }

  const bp = f.bp.latest
  if (f.bp.held) {
    rows.push({
      key: 'bp',
      status: 'stale',
      label: 'BP',
      value: 'Held',
      aside: 'units changed',
      row: 'bp',
    })
  } else if (bp) {
    const cls = bpClass(bp.systolic, bp.diastolic)
    rows.push({
      key: 'bp',
      status: st(BP_STATUS[cls]),
      label: 'BP',
      value: `${bp.systolic}/${bp.diastolic}`,
      note: bp.date === f.localDate ? undefined : weekday(bp.date, 'short'),
      aside: aside(cls),
      row: 'bp',
    })
  }

  const wt = f.weight
  if (wt.held) {
    rows.push({
      key: 'weight',
      status: 'stale',
      label: 'Weight',
      value: 'Held',
      aside: 'units changed',
      row: 'weight',
    })
  } else if (wt.latest !== null) {
    const ch = wt.change ?? 0
    rows.push({
      key: 'weight',
      status: st(ch < 0 ? 'good' : ch > 0 ? 'warn' : 'none'),
      label: 'Weight',
      value: wt.latest.toFixed(1),
      note: wt.units,
      aside: aside(
        ch === 0
          ? `flat over ${wt.days} d`
          : `${ch < 0 ? '▼' : '▲'} ${Math.abs(ch).toFixed(1)} in ${wt.days} d`
      ),
      row: 'weight',
    })
  }

  return rows
}

export function nextEvent(events: CalendarEvent[], now: Date): CalendarEvent | null {
  const today = localDateKey(now)
  return (
    events.find((e) =>
      e.allDay ? localDateKey(new Date(e.start)) >= today : Date.parse(e.end) > now.getTime()
    ) ?? null
  )
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function eventWhen(e: CalendarEvent, now: Date): string {
  const start = new Date(e.start)
  const sameDay = localDateKey(start) === localDateKey(now)
  const day = sameDay ? '' : start.toLocaleDateString('en-US', { weekday: 'short' }) + ' '
  if (e.allDay) return sameDay ? 'All day' : `${day}all day`
  return day + start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** "to know (a fact…)" → "to know" — the part that fits in a table cell */
export function shortDefinition(def: string): string {
  return def.split(/[,;(]/)[0].trim()
}

export function indoorHumidity(ha: HomeAssistantSummary | null): number | null {
  const s = ha?.sensors.find((x) => x.kind === 'humidity' && /interior|indoor|inside/i.test(x.name))
  return s ? s.value : null
}

export function glance(data: MobileData, errors: MobileErrors, now: Date): GlanceGroup[] {
  const groups: GlanceGroup[] = []
  const f = data.fitness

  if (f && f.configured && healthState(f) !== 'nodata') {
    groups.push({ section: 'health', title: 'Health', rows: healthRows(f, now) })
  }

  const today: GlanceRow[] = []
  if (data.events) {
    const next = nextEvent(data.events, now)
    today.push(
      next
        ? {
            key: 'next',
            status: 'none',
            label: 'Next',
            value: next.title.trim() || 'Untitled',
            aside: eventWhen(next, now),
            plainAside: true,
            row: 'cal',
          }
        : {
            key: 'next',
            status: 'none',
            label: 'Next',
            value: 'Nothing scheduled',
            aside: '',
            plainAside: true,
            row: 'cal',
          }
    )
  }
  if (data.word) {
    today.push({
      key: 'word',
      status: 'none',
      label: 'Word',
      value: data.word.word,
      aside: shortDefinition(data.word.definition),
      plainAside: true,
      row: 'word',
    })
  }
  if (data.media && data.media.length) {
    const m = data.media[0]
    today.push({
      key: 'new',
      status: 'none',
      label: 'New',
      value: m.title,
      aside: m.type === 'movie' ? 'movie' : m.subtitle,
      plainAside: true,
      row: 'media',
    })
  }
  if (today.length) groups.push({ section: 'today', title: 'Today', rows: today })

  const home: GlanceRow[] = []
  if (data.weather) {
    const w = data.weather
    const tomorrow = w.forecast[1]
    home.push({
      key: 'outside',
      status: 'none',
      label: 'Outside',
      value: `${Math.round(w.current.temp)}°`,
      note: w.current.description,
      aside: tomorrow ? `${Math.round(tomorrow.high)}° ${weekday(tomorrow.date, 'short')}` : '',
      plainAside: true,
      row: 'wx',
    })
  }
  if (data.ha && data.ha.configured) {
    const t = data.ha.temps.indoorNow
    const rh = indoorHumidity(data.ha)
    home.push({
      key: 'inside',
      status: data.ha.reachable ? 'good' : 'warn',
      label: 'Inside',
      value: t !== null ? `${Math.round(t)}°` : '—',
      note: rh !== null ? `${Math.round(rh)}% RH` : undefined,
      aside: data.ha.reachable ? 'HA connected' : 'HA offline',
      row: 'temps',
    })
  }
  if (home.length) groups.push({ section: 'home', title: 'Home', rows: home })

  const infra: GlanceRow[] = []
  if (errors.pihole) {
    infra.push({
      key: 'pihole',
      status: 'bad',
      label: 'Pi-hole',
      value: 'No answer',
      aside: 'unreachable',
      row: 'pihole',
    })
  } else if (data.pihole) {
    const on = data.pihole.status === 'enabled'
    infra.push({
      key: 'pihole',
      status: on ? 'good' : 'warn',
      label: 'Pi-hole',
      value: `${data.pihole.blockedPercentage.toFixed(1)}%`,
      note: 'blocked',
      aside: on ? 'filtering' : 'blocking off',
      row: 'pihole',
    })
  }
  if (data.plex) {
    const n = data.plex.length
    infra.push({
      key: 'plex',
      status: 'none',
      label: 'Plex',
      value: n ? plural(n, 'stream') : 'Idle',
      aside: n ? data.plex[0].title : '',
      plainAside: true,
      row: 'plex',
    })
  }
  if (infra.length) groups.push({ section: 'infra', title: 'Infra', rows: infra })

  return groups
}

// ── section summaries (the line under a collapsed heading) ──

export function summary(
  section: SectionId,
  data: MobileData,
  errors: MobileErrors,
  now: Date
): string {
  switch (section) {
    case 'health': {
      const f = data.fitness
      const hs = healthState(f)
      if (hs === 'loading') return errors.fitness ? "Didn't load" : 'Loading'
      if (hs === 'unconfigured') return 'Apple Health is not connected'
      if (hs === 'nodata') return 'Nothing synced yet'
      if (hs === 'stale')
        return `Phone stopped syncing ${plural(Math.round(f!.ingestAgeHours ?? 0), 'hour')} ago`
      const parts: string[] = []
      if (f!.medication) parts.push(f!.medication.takenToday ? 'meds taken' : 'meds not logged')
      const first = f!.workouts[0]
      if (first)
        parts.push(`${first.label.toLowerCase()} ${first.daysInWindow} of ${first.targetDays}`)
      const n = lastNight(f!)
      if (n) parts.push(`sleep ${n.score}`)
      if (f!.heldMetrics.length) parts.push(`${f!.heldMetrics.length} held`)
      const s = parts.join(', ')
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
    case 'today': {
      const todayKey = localDateKey(now)
      const count = (data.events ?? []).filter(
        (e) => localDateKey(new Date(e.start)) === todayKey
      ).length
      const word = data.word ? `, word of the day: ${data.word.word}` : ''
      return `${count === 0 ? 'Nothing' : plural(count, 'event')} today${word}`
    }
    case 'home': {
      const out = data.weather ? `${Math.round(data.weather.current.temp)}° outside` : null
      const t = data.ha?.temps.indoorNow
      const inside = t !== null && t !== undefined ? `${Math.round(t)}° inside` : null
      return [out, inside].filter(Boolean).join(', ') || 'No readings'
    }
    case 'infra': {
      const ph = errors.pihole
        ? 'Pi-hole unreachable'
        : data.pihole
          ? `${data.pihole.blockedPercentage.toFixed(1)}% blocked`
          : null
      const n = data.plex?.length ?? 0
      return [ph, n ? `${n} streaming` : 'Plex idle'].filter(Boolean).join(', ')
    }
  }
}

// ── header ──

export function soberLine(dateStr: string | undefined, now: Date): string | null {
  if (!dateStr) return null
  const start = new Date(dateStr)
  if (Number.isNaN(start.getTime())) return null
  const d = computeSoberDuration(start, now)
  const parts = [
    d.years ? `${d.years} ${d.years === 1 ? 'year' : 'years'}` : '',
    d.months ? `${d.months} ${d.months === 1 ? 'month' : 'months'}` : '',
    `${d.days} ${d.days === 1 ? 'day' : 'days'}`,
  ].filter(Boolean)
  return `Sober ${parts.join(', ')}`
}
