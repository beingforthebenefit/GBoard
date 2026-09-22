import { ReactNode } from 'react'
import { FitnessSummary, FitnessVital, MedicationStatus, WorkoutPlan } from '../../types/index.js'
import { DimensionBar } from './DimensionBar.js'
import { BpPlot, MassPlot, SleepPlot } from './HealthPlots.js'

// Beyond this the phone has stopped pushing. The hourly export only runs while the
// phone is unlocked, so a quiet night is normal — 26 h is the first hour that isn't.
const STALE_HOURS = 26

/** Schedule "mark" glyphs, in the spirit of the sheet's other drafting symbols */
const MARKS = {
  medication: '℞',
  steps: '»',
  intake: '◫',
  cycling: '⊘',
  lifting: '≡',
}

function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div
      className="border border-dashed px-3 py-2.5 text-[11px] leading-relaxed tracking-[0.08em]"
      style={{ borderColor: 'var(--bp-line)', color: 'var(--bp-ink2)' }}
    >
      {children}
    </div>
  )
}

function Readout({
  mark,
  label,
  value,
  valueColor = 'var(--bp-bright)',
  small = false,
  caption,
  children,
}: {
  mark: string
  label: string
  value: string
  valueColor?: string
  small?: boolean
  caption?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="min-w-0">
      <div
        className="flex items-baseline gap-1.5 text-[9px] tracking-[0.22em] uppercase truncate"
        style={{ color: 'var(--bp-ink3)' }}
      >
        <span>{mark}</span>
        <span className="truncate">{label}</span>
      </div>
      <div
        className={`${small ? 'text-sm tracking-[0.12em] mt-1' : 'text-xl'} leading-none tabular-nums truncate`}
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {caption && (
        <div
          className="text-[9px] tracking-[0.15em] uppercase truncate mt-1"
          style={{ color: 'var(--bp-ink3)' }}
        >
          {caption}
        </div>
      )}
      {children}
    </div>
  )
}

/** Seven ticks, one per day — a filled tick is a dose logged */
function DoseTicks({ doses }: { doses: MedicationStatus['last7'] }) {
  return (
    <svg width={doses.length * 9} height="8" className="mt-1" aria-hidden>
      {doses.map((d, i) => (
        <line
          key={d.date}
          x1={i * 9 + 1}
          y1={d.taken ? 0 : 3}
          x2={i * 9 + 1}
          y2="8"
          stroke={d.taken ? 'var(--bp-bright)' : 'var(--bp-line)'}
          strokeWidth={d.taken ? 2 : 1}
        />
      ))}
    </svg>
  )
}

function MedicationReadout({ med }: { med: MedicationStatus | null }) {
  if (!med) {
    return <Readout mark={MARKS.medication} label="Medication" value="—" caption="NO DOSE LOGGED" />
  }

  const nowHm = new Date().toTimeString().slice(0, 5)
  const overdue = !med.takenToday && med.scheduledAt !== null && nowHm > med.scheduledAt

  return (
    <Readout
      mark={MARKS.medication}
      label={med.name}
      value={med.takenToday ? '✓ TAKEN' : overdue ? '✗ OVERDUE' : '○ DUE'}
      valueColor={med.takenToday ? 'var(--bp-bright)' : overdue ? 'var(--bp-red)' : 'var(--bp-ink)'}
      small
      caption={
        med.takenToday
          ? `${med.takenAt ?? ''} · ${med.streakDays} DAY STREAK`
          : `SCHEDULED ${med.scheduledAt ?? '—'} · ${med.streakDays} DAY STREAK`
      }
    >
      <DoseTicks doses={med.last7} />
    </Readout>
  )
}

function IntakeReadout({ calories }: { calories: FitnessSummary['calories'] }) {
  if (calories.held) {
    return (
      <Readout
        mark={MARKS.intake}
        label="Intake"
        value="HELD"
        valueColor="var(--bp-red)"
        small
        caption="UNITS CHANGED"
      />
    )
  }

  const { budget, consumed, remaining } = calories
  const pct = consumed === null ? 0 : (consumed / budget) * 100
  const over = remaining !== null && remaining < 0

  return (
    <Readout
      mark={MARKS.intake}
      label={`Intake / ${fmt(budget)} kcal`}
      value={consumed === null ? '—' : fmt(consumed)}
      caption={
        consumed === null ? (
          'NOT LOGGED TODAY'
        ) : (
          <span style={{ color: over ? 'var(--bp-red)' : undefined }}>
            {over ? `${fmt(Math.abs(remaining!))} OVER` : `${fmt(remaining)} REMAINING`}
          </span>
        )
      }
    >
      <DimensionBar pct={pct} width={88} />
    </Readout>
  )
}

function WorkoutReadout({ workout }: { workout: WorkoutPlan }) {
  const { doneToday, needToday, minutesToday, daysInWindow, targetDays, targetMinutes } = workout
  // With no minutes target ("lift three days a week"), the call to action is just the verb
  // The sheet is set in caps; the verb arrives from the API in title case
  const verb = workout.verb.toUpperCase()
  const call = targetMinutes > 0 ? `${verb} ${targetMinutes} MIN` : `${verb} TODAY`
  const value = doneToday ? `✓ ${minutesToday} MIN` : needToday ? `▲ ${call}` : '— REST DAY'

  return (
    <Readout
      mark={MARKS[workout.key as keyof typeof MARKS] ?? '⊘'}
      label={workout.label}
      value={value}
      valueColor={doneToday ? 'var(--bp-bright)' : needToday ? 'var(--bp-red)' : 'var(--bp-ink2)'}
      small
      caption={`${daysInWindow}/${targetDays} DAYS · 7 D ROLLING`}
    >
      <div className="flex gap-[3px] mt-1">
        {workout.days.map((d) => (
          <span
            key={d.date}
            className="h-[8px] flex-1"
            style={{
              background: d.qualifying ? 'var(--bp-bright)' : 'var(--bp-line-soft)',
              border: '0.5px solid var(--bp-line-soft)',
            }}
            title={`${d.date}: ${d.minutes} min`}
          />
        ))}
      </div>
    </Readout>
  )
}

/** The sheet abbreviates everything else (WIND, RH, BARO); the vitals line follows suit */
const VITAL_ABBR: Record<string, string> = {
  'Resting HR': 'RHR',
  'VO₂ Max': 'VO₂',
  'Body Fat': 'BF',
}

/** Units that cost more width than they add — VO₂ max is only ever ml/(kg·min) */
const UNITLESS = new Set(['vo2Max', 'bmi'])

function vitalText(v: FitnessVital): string {
  const label = (VITAL_ABBR[v.label] ?? v.label).toUpperCase()
  if (v.held) return `${label} HELD`
  const digits = v.value !== null && Math.abs(v.value) < 100 && !Number.isInteger(v.value) ? 1 : 0
  const units = UNITLESS.has(v.key) ? '' : v.units
  return `${label} ${fmt(v.value, digits)}${units ? ` ${units.toUpperCase()}` : ''}`
}

function VitalsLine({ data }: { data: FitnessSummary }) {
  const t = data.today
  const extras: string[] = []
  if (t.exerciseMinutes?.value != null) extras.push(`EXER ${fmt(t.exerciseMinutes.value)} MIN`)
  if (t.standHours?.value != null) extras.push(`STAND ${fmt(t.standHours.value)} H`)
  if (t.distance?.value != null)
    extras.push(`DIST ${fmt(t.distance.value, 1)} ${t.distance.units.toUpperCase()}`)
  if (t.flightsClimbed?.value != null) extras.push(`FLTS ${fmt(t.flightsClimbed.value)}`)
  if (data.calories.burnedActive != null)
    extras.push(`BURN ${fmt(data.calories.burnedActive)} KCAL`)

  const parts = [...data.vitals.map(vitalText), ...extras]
  if (parts.length === 0) return null

  return (
    <div
      className="text-[9px] tracking-[0.15em] tabular-nums leading-[1.5] border-t pt-1 flex-shrink-0"
      style={{ color: 'var(--bp-ink3)', borderColor: 'var(--bp-line-soft)' }}
    >
      {parts.join(' · ')}
    </div>
  )
}

interface Props {
  data: FitnessSummary | null
  loading: boolean
}

/**
 * Apple Health drafted as the sheet's occupant schedule: today's compliance across the
 * top, then thirty days of blood pressure, ninety of body mass and a week of sleep.
 *
 * Three empty states, deliberately distinct (see the health service's handoff notes):
 * not configured, nothing logged for a metric, and a phone that has stopped syncing.
 * A held reading — units changed upstream, value withheld — is shown as "HELD", never
 * as a zero.
 */
export function HealthSchedule({ data, loading }: Props) {
  if (loading && !data) {
    return <Note>POLLING HEALTH RECORD…</Note>
  }

  if (!data || !data.configured) {
    return (
      <Note>
        <span style={{ color: 'var(--bp-red)' }}>NOTE 1 —</span> HEALTH RECORD NOT CONNECTED. SET
        THE HEALTHKIT SERVICE URL AND ITS READ KEY UNDER ADMIN ▸ ADVANCED SETTINGS ▸ APPLE HEALTH.
      </Note>
    )
  }

  if (!data.reachable && data.vitals.length === 0 && !data.medication) {
    return (
      <Note>
        <span style={{ color: 'var(--bp-red)' }}>LINK DOWN —</span> THE HEALTH SERVICE DID NOT
        ANSWER THE LAST SURVEY. CHECK THE SERVICE ON POPOS AND THE READ KEY.
      </Note>
    )
  }

  const stale = data.ingestAgeHours !== null && data.ingestAgeHours > STALE_HOURS

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      {(stale || data.heldMetrics.length > 0 || !data.reachable) && (
        <div className="text-[9px] tracking-[0.18em] uppercase" style={{ color: 'var(--bp-red)' }}>
          {!data.reachable && <span>LINK DOWN — LAST GOOD SURVEY SHOWN. </span>}
          {stale && <span>PHONE LAST SYNCED {Math.round(data.ingestAgeHours!)} H AGO. </span>}
          {data.heldMetrics.length > 0 && (
            <span>UNITS CHANGED: {data.heldMetrics.join(', ').toUpperCase()} — FIGURES HELD.</span>
          )}
        </div>
      )}

      {/* Today's compliance */}
      <div
        className="grid grid-cols-5 gap-3 border-b pb-2"
        style={{ borderColor: 'var(--bp-line-soft)' }}
      >
        <MedicationReadout med={data.medication} />
        <Readout
          mark={MARKS.steps}
          label="Steps"
          value={data.today.steps?.held ? 'HELD' : fmt(data.today.steps?.value ?? null)}
          valueColor={data.today.steps?.held ? 'var(--bp-red)' : 'var(--bp-bright)'}
          caption={data.stepsAvg7 !== null ? `7 D AVG ${fmt(data.stepsAvg7)}` : 'NO WEEKLY RECORD'}
        />
        <IntakeReadout calories={data.calories} />
        {data.workouts.map((w) => (
          <WorkoutReadout key={w.key} workout={w} />
        ))}
      </div>

      {/* Trends: the three series worth a plot rather than a number */}
      <div className="grid grid-cols-3 gap-5 h-24 flex-none">
        <BpPlot trend={data.bp} today={data.localDate} />
        <MassPlot trend={data.weight} today={data.localDate} />
        <SleepPlot trend={data.sleep} today={data.localDate} />
      </div>

      <VitalsLine data={data} />
    </div>
  )
}
