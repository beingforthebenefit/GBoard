import { ReactNode, useState } from 'react'
import { FitnessSummary } from '../../types/index.js'
import { Label, Meter, Notice, Sparkline } from '../parts.js'
import {
  clock12,
  dayOf,
  fmt,
  healthState,
  lastNight,
  plural,
  sleepScoreParts,
  sleepStatus,
  weekday,
} from '../status.js'
import { ExploreId, toPts } from '../explorerData.js'

interface Props {
  f: FitnessSummary | null
  failed: boolean
  onExplore: (id: ExploreId) => void
}

export function HealthSection({ f, failed, onExplore }: Props) {
  const state = healthState(f)
  if (state === 'loading') {
    return failed ? (
      <Notice status="bad" title="Health data didn't load">
        GBoard couldn't reach its fitness API. Pull down to try again.
      </Notice>
    ) : (
      <p className="gbm-muted">Loading…</p>
    )
  }
  if (state === 'unconfigured') {
    return (
      <Notice status="none" title="Apple Health isn't connected">
        Set HEALTHKIT_URL and HEALTHKIT_READ_KEY in GBoard's .env to show it here.
      </Notice>
    )
  }
  if (state === 'nodata') {
    return (
      <Notice status="none" title="Nothing has synced yet">
        The health service is connected but has never received data from the phone.
      </Notice>
    )
  }
  const s = f!
  const stale = state === 'stale'

  return (
    <>
      {stale && (
        <Notice
          status="stale"
          title={`Last synced ${plural(Math.round(s.ingestAgeHours ?? 0), 'hour')} ago`}
        >
          These figures are real but out of date. Open Health Auto Export on the phone.
        </Notice>
      )}
      <Meds f={s} />
      <Goals f={s} stale={stale} />
      <div className="gbm-pair">
        <Steps f={s} onExplore={onExplore} />
        <Calories f={s} />
      </div>
      <Sleep f={s} onExplore={onExplore} />
      <Trends f={s} onExplore={onExplore} />
      <Vitals f={s} />
    </>
  )
}

function Meds({ f }: { f: FitnessSummary }) {
  const m = f.medication
  if (!m) return null
  return (
    <div id="row-meds">
      <Label
        right={
          m.takenToday
            ? `taken at ${clock12(m.takenAt)}`
            : m.scheduledAt
              ? `due ${clock12(m.scheduledAt)}`
              : 'not logged'
        }
      >
        {m.name}, last 7 days
      </Label>
      <div className="gbm-row-between">
        <div
          className="gbm-dots"
          role="img"
          aria-label={`Taken on ${m.last7.filter((d) => d.taken).length} of the last 7 days`}
        >
          {m.last7.map((d) => (
            <span
              key={d.date}
              className={`gbm-dot${d.taken ? ' on' : ''}`}
              title={weekday(d.date)}
            />
          ))}
        </div>
        <span>
          <span className="gbm-mid">{m.streakDays}</span>
          <span className="gbm-unit">day streak</span>
        </span>
      </div>
    </div>
  )
}

function Goals({ f, stale }: { f: FitnessSummary; stale: boolean }) {
  if (!f.workouts.length) return null
  const days = f.workouts[0].days
  return (
    <div id="row-goals">
      <Label>Workouts, rolling 7 days</Label>
      {f.workouts.map((w) => (
        <div className="gbm-track" key={w.key}>
          <span>{w.label}</span>
          <span
            className="gbm-cells"
            role="img"
            aria-label={`${w.label}: ${w.daysInWindow} of ${w.targetDays} days`}
          >
            {w.days.map((d, i) => {
              const today = i === w.days.length - 1
              let cls = d.qualifying ? 'gbm-cell on' : 'gbm-cell'
              if (today && stale) cls = 'gbm-cell gap'
              else if (today && w.needToday && !w.doneToday) cls = 'gbm-cell due'
              return (
                <span key={d.date} className={cls} title={`${weekday(d.date)}: ${d.minutes} min`} />
              )
            })}
          </span>
          <span className="gbm-count">
            {w.daysInWindow} of {w.targetDays}
          </span>
        </div>
      ))}
      <div className="gbm-ticks">
        <span />
        <span className="gbm-cells">
          {days.map((d) => (
            <span key={d.date}>{weekday(d.date, 'short').charAt(0)}</span>
          ))}
        </span>
        <span />
      </div>
    </div>
  )
}

function Steps({ f, onExplore }: { f: FitnessSummary; onExplore: (id: ExploreId) => void }) {
  const r = f.today.steps
  const week = f.stepsWeek
  const max = Math.max(1, ...week.map((p) => p.value))
  return (
    <button className="gbm-plain" id="row-steps" onClick={() => onExplore('steps')}>
      <Label>Steps</Label>
      {r?.held ? (
        <span className="gbm-held-inline">Held: units changed</span>
      ) : (
        <span className="gbm-big">{fmt(r?.value ?? 0)}</span>
      )}
      <span className="gbm-weekbars" aria-hidden="true">
        {week.map((p, i) => (
          <span
            key={p.date}
            style={{
              height: `${Math.max(8, (p.value / max) * 100)}%`,
              opacity: i === week.length - 1 ? 1 : 0.35,
            }}
          />
        ))}
      </span>
      <span className="gbm-small gbm-muted">
        {f.stepsAvg7 !== null ? `7-day average ${fmt(f.stepsAvg7)}. ` : ''}Tap to explore
      </span>
    </button>
  )
}

function Calories({ f }: { f: FitnessSummary }) {
  const c = f.calories
  return (
    <div id="row-calories">
      <Label>Calories</Label>
      {c.held ? (
        <span className="gbm-held-inline">Held: units changed</span>
      ) : c.consumed === null || c.remaining === null ? (
        <>
          <span className="gbm-big gbm-muted">—</span>
          <span className="gbm-small gbm-muted gbm-block">
            Nothing logged today, {fmt(c.budget)} budget
          </span>
        </>
      ) : (
        <>
          <span className="gbm-big" style={c.remaining < 0 ? { color: 'var(--warn)' } : undefined}>
            {fmt(Math.abs(c.remaining))}
          </span>
          <span className="gbm-unit">{c.remaining < 0 ? 'over' : 'left'}</span>
          <span className="gbm-block" style={{ marginBlockStart: 14 }}>
            <Meter
              value={c.consumed / c.budget}
              color={c.remaining < 0 ? 'var(--warn)' : 'var(--good)'}
            />
          </span>
          <span className="gbm-small gbm-muted gbm-block">
            {fmt(c.consumed)} of {fmt(c.budget)} eaten
            {c.burnedActive !== null ? `, ${fmt(c.burnedActive)} burned` : ''}
          </span>
        </>
      )}
    </div>
  )
}

function Sleep({ f, onExplore }: { f: FitnessSummary; onExplore: (id: ExploreId) => void }) {
  const [showParts, setShowParts] = useState(false)
  const n = lastNight(f)
  if (!n) {
    return (
      <div id="row-sleep">
        <Label>Last night</Label>
        <p className="gbm-muted gbm-small" style={{ margin: 0 }}>
          No sleep recorded for last night.
        </p>
      </div>
    )
  }
  const total = n.deep + n.rem + n.core + n.awake || 1
  const parts = sleepScoreParts(n)
  const st = sleepStatus(n.score)
  return (
    <div id="row-sleep">
      <Label right={`${n.hours.toFixed(1)} h asleep`}>Last night</Label>
      <div className="gbm-sleep">
        <span
          className="gbm-big"
          style={{ color: `var(--${st.status === 'none' ? 'ink' : st.status})` }}
        >
          {n.score}
        </span>
        <div style={{ flex: 1 }}>
          <div className="gbm-stages" aria-hidden="true">
            <i style={{ width: `${(n.deep / total) * 100}%`, background: 'var(--health)' }} />
            <i style={{ width: `${(n.rem / total) * 100}%`, background: 'var(--today)' }} />
            <i style={{ width: `${(n.core / total) * 100}%`, background: 'var(--surface-2)' }} />
            <i style={{ width: `${(n.awake / total) * 100}%`, background: 'var(--warn)' }} />
          </div>
          <div className="gbm-stagekey">
            <span style={{ ['--k' as string]: 'var(--health)' }}>Deep {n.deep.toFixed(1)}</span>
            <span style={{ ['--k' as string]: 'var(--today)' }}>REM {n.rem.toFixed(1)}</span>
            <span style={{ ['--k' as string]: 'var(--surface-2)' }}>Core {n.core.toFixed(1)}</span>
            <span style={{ ['--k' as string]: 'var(--warn)' }}>Awake {n.awake.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="gbm-links">
        <button
          className="gbm-link"
          aria-expanded={showParts}
          aria-controls="sleep-parts"
          onClick={() => setShowParts(!showParts)}
        >
          {showParts ? 'Hide the breakdown' : 'How the score works'}
        </button>
        <button className="gbm-link" onClick={() => onExplore('sleep')}>
          Explore sleep
        </button>
      </div>
      {showParts && parts && (
        <div className="gbm-parts" id="sleep-parts">
          <Part label="Duration against 8 hours" pts={parts.duration} max={60} />
          <Part
            label={`Deep and REM, ${Math.round(parts.share * 100)}% against 35%`}
            pts={parts.restorative}
            max={25}
          />
          <Part
            label={`Efficiency, ${Math.round(parts.efficiencyPct * 100)}% against 90%`}
            pts={parts.efficiency}
            max={15}
          />
        </div>
      )}
    </div>
  )
}

function Part({ label, pts, max }: { label: string; pts: number; max: number }) {
  return (
    <div className="gbm-part">
      <span>{label}</span>
      <span className="gbm-num">
        {Math.round(pts)} of {max}
      </span>
      <Meter
        value={pts / max}
        color={pts / max >= 0.9 ? 'var(--good)' : 'var(--warn)'}
        height={6}
      />
    </div>
  )
}

function Trends({ f, onExplore }: { f: FitnessSummary; onExplore: (id: ExploreId) => void }) {
  const bpSys = f.bp.points.map((p): [number, number] => [dayOf(p.date).getTime(), p.systolic])
  const bpDia = f.bp.points.map((p): [number, number] => [dayOf(p.date).getTime(), p.diastolic])
  const sleep = f.sleep.nights.map((n): [number, number] => [dayOf(n.date).getTime(), n.hours])
  return (
    <div>
      <Label right="tap to explore">Trends</Label>
      {f.bp.held ? (
        <HeldRow id="bp" label="Blood pressure" />
      ) : (
        <TrendRow
          id="bp"
          label={`Blood pressure, ${f.bp.days} days`}
          value={f.bp.latest ? `${f.bp.latest.systolic}/${f.bp.latest.diastolic}` : '—'}
          unit="mmHg"
          onExplore={onExplore}
        >
          <Sparkline data={bpSys} second={bpDia} />
        </TrendRow>
      )}
      {f.weight.held ? (
        <HeldRow id="weight" label="Weight" />
      ) : (
        <TrendRow
          id="weight"
          label={`Weight, ${f.weight.days} days`}
          value={f.weight.latest !== null ? f.weight.latest.toFixed(1) : '—'}
          unit={f.weight.units}
          onExplore={onExplore}
        >
          <Sparkline data={toPts(f.weight.points)} />
        </TrendRow>
      )}
      <TrendRow
        id="sleep-trend"
        explore="sleep"
        label={`Sleep, last ${f.sleep.nights.length} nights`}
        value={f.sleep.avgHours !== null ? f.sleep.avgHours.toFixed(1) : '—'}
        unit="h average"
        onExplore={onExplore}
      >
        <Sparkline data={sleep} />
      </TrendRow>
    </div>
  )
}

function TrendRow({
  id,
  explore,
  label,
  value,
  unit,
  onExplore,
  children,
}: {
  id: string
  explore?: ExploreId
  label: string
  value: string
  unit: string
  onExplore: (id: ExploreId) => void
  children: ReactNode
}) {
  return (
    <button
      className="gbm-trend"
      id={`row-${id}`}
      onClick={() => onExplore(explore ?? (id as ExploreId))}
    >
      <span>
        <span className="gbm-t">{label}</span>
        <br />
        <span className="gbm-mid">{value}</span>
        <span className="gbm-unit">{unit}</span>
      </span>
      {children}
      <span className="gbm-arrow" aria-hidden="true">
        ›
      </span>
    </button>
  )
}

function HeldRow({ id, label }: { id: string; label: string }) {
  return (
    <div className="gbm-heldrow" id={`row-${id}`}>
      <div>
        <strong>{label} is held</strong>
        <span>
          Its units changed. The series is paused until the change is confirmed on the health
          service.
        </span>
      </div>
      <span className="gbm-hbox" aria-hidden="true" />
    </div>
  )
}

function Vitals({ f }: { f: FitnessSummary }) {
  if (!f.vitals.length) return null
  return (
    <div>
      <Label>Vitals</Label>
      <div className="gbm-vitals">
        {f.vitals.map((v) => (
          <div key={v.key}>
            <div className="gbm-small gbm-muted">{v.label}</div>
            {v.held ? (
              <span className="gbm-held-inline">Held</span>
            ) : (
              <>
                <span className="gbm-mid">
                  {v.value === null
                    ? '—'
                    : Number.isInteger(v.value)
                      ? v.value
                      : v.value.toFixed(1)}
                </span>
                <span className="gbm-unit">{v.units}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
