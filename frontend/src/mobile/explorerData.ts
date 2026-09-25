import { FitnessHistory, TempHistory } from '../types/index.js'
import { dayOf, fmt } from './status.js'

/** [epoch ms, value] — what ECharts' time axis takes directly */
export type Pt = [number, number]

export type ExploreId = 'bp' | 'weight' | 'sleep' | 'steps' | 'temps'

export interface ExploreSeries {
  name: string
  data: Pt[]
  kind: 'line' | 'bar'
  dashed?: boolean
  points?: boolean // draw a dot per reading (sparse series)
  secondary?: boolean // drawn in the muted ink, not the section colour
}

export interface ExploreSpec {
  id: ExploreId
  title: string
  section: 'health' | 'home'
  unit: string
  hours: boolean // x axis in clock time rather than dates
  series: ExploreSeries[]
  bands: { from: number; to: number; status: 'good' | 'warn'; label: string }[]
  lines: { at: number; status: 'good' | 'warn'; label: string }[]
  ranges: number[] // quick-range buttons in days; 0 = everything
  defaultRange: number
  better: 'up' | 'down' | null // which direction of change is good news
  decimals: number
  read: (values: (number | null)[]) => string
  held: boolean
}

const DAY = 86_400_000

export const toPts = (points: { date: string; value: number }[]): Pt[] =>
  points.map((p) => [dayOf(p.date).getTime(), p.value])

/** Trailing mean over the previous `days` calendar days (not the previous n readings) */
export function movingAverage(s: Pt[], days: number, decimals = 1): Pt[] {
  const round = 10 ** decimals
  return s.map((p, i) => {
    const from = p[0] - (days - 1) * DAY
    let sum = 0
    let n = 0
    for (let j = i; j >= 0 && s[j][0] >= from; j--) {
      sum += s[j][1]
      n++
    }
    return [p[0], Math.round((sum / n) * round) / round]
  })
}

export interface WindowStats {
  count: number
  spanDays: number
  low: number
  high: number
  average: number
  change: number
}

/** Stats for the readings visible between two instants, inclusive */
export function windowStats(s: Pt[], from: number, to: number): WindowStats | null {
  const inView = s.filter((p) => p[0] >= from && p[0] <= to)
  if (!inView.length) return null
  const values = inView.map((p) => p[1])
  return {
    count: inView.length,
    spanDays: Math.max(1, Math.round((inView[inView.length - 1][0] - inView[0][0]) / DAY) + 1),
    low: Math.min(...values),
    high: Math.max(...values),
    average: values.reduce((a, b) => a + b, 0) / values.length,
    change: values[values.length - 1] - values[0],
  }
}

export function nearestIndex(s: Pt[], t: number): number {
  let best = -1
  let bestDist = Infinity
  for (let i = 0; i < s.length; i++) {
    const d = Math.abs(s[i][0] - t)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

/** Whether a change is good news, bad news, or neither, for colouring it */
export function changeTone(change: number, better: 'up' | 'down' | null): 'good' | 'warn' | 'none' {
  if (!better || Math.abs(change) < 1e-9) return 'none'
  return (better === 'down') === change < 0 ? 'good' : 'warn'
}

export function exploreSpec(
  id: ExploreId,
  history: FitnessHistory | null,
  temps: TempHistory | null
): ExploreSpec {
  const base = { bands: [], lines: [], ranges: [7, 30, 90, 0], hours: false, held: false }
  switch (id) {
    case 'bp': {
      const pts = history?.bp.points ?? []
      return {
        ...base,
        id,
        title: 'Blood pressure',
        section: 'health',
        unit: 'mmHg',
        series: [
          {
            name: 'Systolic',
            kind: 'line',
            points: true,
            data: pts.map((p) => [dayOf(p.date).getTime(), p.systolic]),
          },
          {
            name: 'Diastolic',
            kind: 'line',
            points: true,
            dashed: true,
            secondary: true,
            data: pts.map((p) => [dayOf(p.date).getTime(), p.diastolic]),
          },
        ],
        bands: [
          { from: 0, to: 120, status: 'good', label: 'Normal systolic' },
          { from: 130, to: 250, status: 'warn', label: 'Stage 1 and above' },
        ],
        lines: [{ at: 80, status: 'warn', label: 'Diastolic 80' }],
        defaultRange: 30,
        better: 'down',
        decimals: 0,
        read: (v) => (v[0] === null ? '—' : `${v[0]}/${v[1] ?? '—'}`),
        held: history?.bp.held ?? false,
      }
    }
    case 'weight': {
      const pts = toPts(history?.weight.points ?? [])
      return {
        ...base,
        id,
        title: 'Weight',
        section: 'health',
        unit: history?.weight.units ?? 'lb',
        series: [
          { name: 'Weight', kind: 'line', points: true, data: pts },
          {
            name: '7-day average',
            kind: 'line',
            dashed: true,
            secondary: true,
            data: movingAverage(pts, 7),
          },
        ],
        defaultRange: 90,
        better: 'down',
        decimals: 1,
        read: (v) => (v[0] === null ? '—' : v[0].toFixed(1)),
        held: history?.weight.held ?? false,
      }
    }
    case 'sleep': {
      const nights = history?.sleep.nights ?? []
      return {
        ...base,
        id,
        title: 'Sleep',
        section: 'health',
        unit: 'h asleep',
        series: [
          {
            name: 'Asleep',
            kind: 'bar',
            data: nights.map((n) => [dayOf(n.date).getTime(), n.hours]),
          },
        ],
        lines: [{ at: 8, status: 'good', label: '8 h goal' }],
        defaultRange: 30,
        better: 'up',
        decimals: 1,
        read: (v) => (v[0] === null ? '—' : v[0].toFixed(1)),
        held: history?.sleep.held ?? false,
      }
    }
    case 'steps': {
      const pts = toPts(history?.steps.points ?? [])
      return {
        ...base,
        id,
        title: 'Steps',
        section: 'health',
        unit: 'steps',
        series: [
          { name: 'Steps', kind: 'bar', data: pts },
          {
            name: '7-day average',
            kind: 'line',
            dashed: true,
            secondary: true,
            data: movingAverage(pts, 7, 0),
          },
        ],
        defaultRange: 30,
        better: 'up',
        decimals: 0,
        read: (v) => (v[0] === null ? '—' : fmt(v[0])),
        held: history?.steps.held ?? false,
      }
    }
    case 'temps': {
      const points = temps?.points ?? []
      const col = (k: 'indoor' | 'outdoor'): Pt[] =>
        points.filter((p) => p[k] !== null).map((p) => [p.t * 1000, p[k] as number])
      return {
        ...base,
        id,
        title: 'Inside and outside',
        section: 'home',
        unit: `°${(temps?.unit ?? 'F').replace('°', '')}`,
        hours: true,
        ranges: [],
        series: [
          { name: 'Inside', kind: 'line', data: col('indoor') },
          { name: 'Outside', kind: 'line', dashed: true, secondary: true, data: col('outdoor') },
        ],
        defaultRange: 0,
        better: null,
        decimals: 1,
        read: (v) =>
          `${v[0] === null ? '—' : Math.round(v[0])}° in, ${v[1] === null ? '—' : Math.round(v[1])}° out`,
      }
    }
  }
}

/** The value of every series at (or nearest to) one instant, for the readout */
export function valuesAt(spec: ExploreSpec, t: number): (number | null)[] {
  return spec.series.map((s) => {
    const i = nearestIndex(s.data, t)
    // Only report a series' value if it actually has a reading on that day/bucket
    if (i < 0) return null
    const tolerance = spec.hours ? 30 * 60 * 1000 : DAY / 2
    return Math.abs(s.data[i][0] - t) <= tolerance ? s.data[i][1] : null
  })
}
