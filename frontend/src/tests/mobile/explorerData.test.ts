import { describe, it, expect } from 'vitest'
import {
  Pt,
  changeTone,
  exploreSpec,
  movingAverage,
  nearestIndex,
  valuesAt,
  windowStats,
} from '../../mobile/explorerData.js'
import { FitnessHistory } from '../../types/index.js'

const DAY = 86_400_000
const t = (d: number) => Date.UTC(2026, 8, 1) + d * DAY

function history(over: Partial<FitnessHistory> = {}): FitnessHistory {
  return {
    configured: true,
    reachable: true,
    localDate: '2026-09-25',
    timezone: 'America/Los_Angeles',
    bp: { points: [{ date: '2026-09-20', systolic: 118, diastolic: 76 }], held: false },
    weight: {
      units: 'lb',
      points: [
        { date: '2026-09-20', value: 230 },
        { date: '2026-09-25', value: 228.5 },
      ],
      held: false,
    },
    sleep: {
      nights: [
        { date: '2026-09-25', hours: 7.1, deep: 0.5, rem: 1.5, core: 5, awake: 0.5, score: 89 },
      ],
      held: false,
    },
    steps: { points: [{ date: '2026-09-25', value: 1053 }], held: false },
    updatedAt: '2026-09-25T22:00:00Z',
    ...over,
  }
}

describe('movingAverage', () => {
  it('averages over calendar days, not over a count of readings', () => {
    // Readings on days 0, 1 and 10: day 10's 7-day window holds only itself
    const s: Pt[] = [
      [t(0), 10],
      [t(1), 20],
      [t(10), 40],
    ]
    expect(movingAverage(s, 7)).toEqual([
      [t(0), 10],
      [t(1), 15],
      [t(10), 40],
    ])
  })
})

describe('windowStats', () => {
  const s: Pt[] = [
    [t(0), 230],
    [t(5), 228],
    [t(9), 229],
    [t(20), 225],
  ]

  it('describes only the readings in view', () => {
    expect(windowStats(s, t(0), t(9))).toEqual({
      count: 3,
      spanDays: 10,
      low: 228,
      high: 230,
      average: 229,
      change: -1,
    })
  })

  it('is null for an empty window', () => {
    expect(windowStats(s, t(10), t(19))).toBeNull()
  })
})

describe('changeTone', () => {
  it('colours a fall green for weight and a rise green for steps', () => {
    expect(changeTone(-2, 'down')).toBe('good')
    expect(changeTone(2, 'down')).toBe('warn')
    expect(changeTone(500, 'up')).toBe('good')
    expect(changeTone(0, 'down')).toBe('none')
    expect(changeTone(3, null)).toBe('none')
  })
})

describe('nearestIndex', () => {
  it('finds the closest reading', () => {
    expect(
      nearestIndex(
        [
          [t(0), 1],
          [t(5), 2],
          [t(9), 3],
        ],
        t(6)
      )
    ).toBe(1)
    expect(nearestIndex([], t(6))).toBe(-1)
  })
})

describe('exploreSpec', () => {
  it('builds systolic and diastolic series with reference bands for BP', () => {
    const s = exploreSpec('bp', history(), null)
    expect(s.series.map((x) => x.name)).toEqual(['Systolic', 'Diastolic'])
    expect(s.series[1].data[0][1]).toBe(76)
    expect(s.bands.length).toBeGreaterThan(0)
    expect(s.read([118, 76])).toBe('118/76')
  })

  it('adds a 7-day average under weight and carries its units', () => {
    const s = exploreSpec(
      'weight',
      history({ weight: { units: 'kg', points: [], held: false } }),
      null
    )
    expect(s.unit).toBe('kg')
    expect(s.series[1].name).toBe('7-day average')
  })

  it('passes a held series through as held, with nothing to plot', () => {
    const s = exploreSpec(
      'weight',
      history({ weight: { units: 'lb', points: [], held: true } }),
      null
    )
    expect(s.held).toBe(true)
    expect(s.series[0].data).toEqual([])
  })

  it('draws an 8-hour goal on sleep', () => {
    expect(exploreSpec('sleep', history(), null).lines[0]).toMatchObject({ at: 8 })
  })

  it('reads temperatures from Home Assistant, skipping empty buckets', () => {
    const s = exploreSpec('temps', null, {
      available: true,
      indoorName: null,
      outdoorName: null,
      unit: '°F',
      hours: 24,
      points: [
        { t: 100, indoor: 71, outdoor: null },
        { t: 1900, indoor: 72, outdoor: 60 },
      ],
      indoorNow: 72,
      outdoorNow: 60,
    })
    expect(s.hours).toBe(true)
    expect(s.series[0].data).toEqual([
      [100_000, 71],
      [1_900_000, 72],
    ])
    expect(s.series[1].data).toEqual([[1_900_000, 60]])
    expect(s.unit).toBe('°F')
  })
})

describe('valuesAt', () => {
  it('reports a series as missing on a day it has no reading', () => {
    const s = exploreSpec('weight', history(), null)
    const mid = new Date('2026-09-22T12:00:00').getTime()
    expect(valuesAt(s, mid)[0]).toBeNull()
    const on = new Date('2026-09-25T12:00:00').getTime()
    expect(valuesAt(s, on)[0]).toBe(228.5)
  })
})
