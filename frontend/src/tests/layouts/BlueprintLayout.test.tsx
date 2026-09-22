import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { FitnessSummary, HomeAssistantSummary } from '../../types/index.js'

vi.mock('../../hooks/useClock.js', () => ({
  useClock: () => new Date('2025-01-01T14:30:00'),
}))

vi.mock('../../hooks/useSoberCounter.js', () => ({
  useSoberCounter: () => ({ years: 1, months: 2, days: 3, hours: 4 }),
}))

// jsdom reports a zero-size element, so the photo frame never resolves a thumbnail URL
vi.mock('../../hooks/useElementSize.js', () => ({
  useElementSize: () => ({ width: 800, height: 600 }),
}))

import { BlueprintLayout } from '../../layouts/blueprint/BlueprintLayout.js'
import { HealthSchedule } from '../../layouts/blueprint/HealthSchedule.js'
import { ThermalProfile } from '../../layouts/blueprint/ThermalProfile.js'

const NOW = Date.parse('2025-01-01T14:30:00Z') / 1000

const temps = {
  available: true,
  indoorName: 'Living Room Temperature',
  outdoorName: 'Backyard Temperature',
  unit: '°F',
  hours: 24,
  points: Array.from({ length: 48 }, (_, i) => ({
    t: NOW - (47 - i) * 1800,
    indoor: 70 + Math.round(Math.sin(i / 6) * 2),
    outdoor: 52 + Math.round(Math.sin(i / 8) * 9),
  })),
  indoorNow: 71,
  outdoorNow: 54,
}

const haData: HomeAssistantSummary = {
  configured: true,
  reachable: true,
  lightsOn: 1,
  lightsTotal: 3,
  devices: [
    {
      id: 'light.living_room',
      name: 'Living Room',
      domain: 'light',
      state: 'on',
      active: true,
      unavailable: false,
      detail: '50%',
      room: 'Living room',
    },
    {
      id: 'media_player.roku',
      name: 'Roku',
      domain: 'media_player',
      state: 'playing',
      active: true,
      unavailable: false,
      detail: 'The Office',
      room: 'Living room',
    },
    {
      id: 'light.bedroom',
      name: 'Bedroom',
      domain: 'light',
      state: 'off',
      active: false,
      unavailable: false,
      room: 'Bedroom',
    },
    {
      id: 'light.hallway',
      name: 'Hallway',
      domain: 'light',
      state: 'unavailable',
      active: false,
      unavailable: true,
      room: 'Bedroom',
    },
  ],
  sensors: [
    { id: 'sensor.temp', name: 'Aqara Temperature', kind: 'temperature', value: 72.5, unit: '°F' },
    { id: 'sensor.hum', name: 'Aqara Humidity', kind: 'humidity', value: 45, unit: '%' },
    { id: 'sensor.batt', name: 'Sensor Battery', kind: 'battery', value: 18, unit: '%' },
  ],
  unavailableCount: 1,
  temps,
  updatedAt: '2025-01-01T14:29:30.000Z',
}

const TODAY = '2025-01-01'

const day = (offset: number) =>
  new Date(Date.parse(`${TODAY}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)

const fitnessData: FitnessSummary = {
  configured: true,
  reachable: true,
  localDate: TODAY,
  timezone: 'America/Los_Angeles',
  asOf: '2025-01-01T22:30:00+00:00',
  ingestAgeHours: 0.4,
  medication: {
    name: 'BP Meds',
    detail: 'Hyzaar 100mg-25mg Tablet',
    takenToday: true,
    takenAt: '09:00',
    scheduledAt: '09:00',
    streakDays: 14,
    last7: Array.from({ length: 7 }, (_, i) => ({ date: day(i - 6), taken: true })),
  },
  today: {
    steps: { metric: 'step_count', value: 3994, units: 'count', held: false },
    activeEnergy: { metric: 'active_energy', value: 405.9, units: 'kcal', held: false },
    exerciseMinutes: { metric: 'apple_exercise_time', value: 8, units: 'min', held: false },
    standHours: { metric: 'apple_stand_hour', value: 14, units: 'count', held: false },
    distance: { metric: 'walking_running_distance', value: 1.223, units: 'mi', held: false },
    flightsClimbed: { metric: 'flights_climbed', value: 4, units: 'count', held: false },
  },
  calories: { budget: 1900, consumed: 1626, remaining: 274, burnedActive: 406, held: false },
  workouts: [
    {
      key: 'cycling',
      label: 'Cycling',
      verb: 'Ride',
      targetDays: 5,
      targetMinutes: 60,
      minutesToday: 0,
      doneToday: false,
      needToday: true,
      daysInWindow: 3,
      lastSession: { name: 'Indoor Cycling', ts: '2024-12-30T21:50:52+00:00', minutes: 65 },
      days: Array.from({ length: 7 }, (_, i) => ({
        date: day(i - 6),
        minutes: i === 1 || i === 2 || i === 4 ? 64 : 0,
        qualifying: i === 1 || i === 2 || i === 4,
      })),
    },
    {
      key: 'lifting',
      label: 'Lifting',
      verb: 'Lift',
      targetDays: 3,
      targetMinutes: 0,
      minutesToday: 0,
      doneToday: false,
      needToday: true,
      daysInWindow: 1,
      lastSession: {
        name: 'Traditional Strength Training',
        ts: '2024-12-28T21:34:25+00:00',
        minutes: 14,
      },
      days: Array.from({ length: 7 }, (_, i) => ({
        date: day(i - 6),
        minutes: i === 1 ? 14 : 0,
        qualifying: i === 1,
      })),
    },
  ],
  bp: {
    days: 30,
    points: [
      { date: day(-20), systolic: 124, diastolic: 86 },
      { date: day(-12), systolic: 106, diastolic: 73 },
      { date: day(-4), systolic: 118, diastolic: 78 },
      { date: TODAY, systolic: 123, diastolic: 86 },
    ],
    latest: { date: TODAY, systolic: 123, diastolic: 86 },
    avgSystolic: 118,
    avgDiastolic: 81,
    held: false,
  },
  weight: {
    days: 90,
    units: 'lb',
    points: [
      { date: day(-60), value: 229.4 },
      { date: day(-30), value: 227.1 },
      { date: TODAY, value: 225.6 },
    ],
    latest: 225.6,
    change: -3.8,
    held: false,
  },
  sleep: {
    nights: [
      { date: day(-2), hours: 6.8, deep: 0.7, rem: 2.0, core: 4.1, awake: 2.7, score: 81 },
      { date: day(-1), hours: 7.1, deep: 0.6, rem: 2.0, core: 4.5, awake: 1.6, score: 92 },
    ],
    score: 87,
    avgHours: 7,
  },
  stepsWeek: Array.from({ length: 7 }, (_, i) => ({ date: day(i - 6), value: 5000 + i })),
  stepsAvg7: 5102,
  vitals: [
    { key: 'restingHeartRate', label: 'Resting HR', value: 75, units: 'bpm', held: false },
    { key: 'hrv', label: 'HRV', value: 46.2, units: 'ms', held: false },
    { key: 'vo2Max', label: 'VO₂ Max', value: 32.2, units: 'ml/(kg·min)', held: false },
  ],
  heldMetrics: [],
  updatedAt: '2025-01-01T22:30:00.000Z',
}

const mockProps = {
  weatherData: {
    current: {
      temp: 72,
      feelsLike: 70,
      humidity: 45,
      description: 'clear sky',
      icon: '01d',
      windSpeed: 5,
      windDirection: 'NW',
      windGust: null,
      sunrise: 1700000000,
      sunset: 1700040000,
      dewPoint: 55,
      pressure: 1013,
      visibility: 10,
    },
    forecast: [
      { date: '2025-01-01', high: 75, low: 55, description: 'sunny', icon: '01d' },
      { date: '2025-01-02', high: 70, low: 50, description: 'rain', icon: '10d' },
      { date: '2025-01-03', high: 68, low: 48, description: 'cloudy', icon: '04d' },
      { date: '2025-01-04', high: 73, low: 52, description: 'sunny', icon: '01d' },
    ],
    hourly: [],
  },
  weatherLoading: false,
  events: [],
  calendarLoading: false,
  sessions: [],
  plexLoading: false,
  piholeData: null,
  piholeLoading: false,
  photos: [],
  mediaItems: [],
  mediaLoading: false,
  radarData: null,
  radarLoading: false,
  radarMode: 'adaptive' as const,
  sobrietyDate: '2024-01-01T00:00:00',
  wordOfDay: null,
  wordLoading: false,
  haData,
  haLoading: false,
  fitnessData,
  fitnessLoading: false,
}

describe('BlueprintLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<BlueprintLayout {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows the sheet masthead with project name and clock', () => {
    const { getByText } = render(<BlueprintLayout {...mockProps} />)
    expect(getByText('Todd Residence')).toBeTruthy()
    expect(getByText(/2:30/)).toBeTruthy()
  })

  it('shows current temperature and METAR-style forecast codes', () => {
    const { getByText, getAllByText } = render(<BlueprintLayout {...mockProps} />)
    expect(getByText('72°')).toBeTruthy()
    expect(getAllByText('CLR').length).toBeGreaterThan(0)
    expect(getByText('RA')).toBeTruthy()
  })

  it('shows the sobriety record in the title block', () => {
    const { getByText } = render(<BlueprintLayout {...mockProps} />)
    expect(getByText(/1Y 2M 3D/)).toBeTruthy()
    expect(getByText(/CERTIFIED SOBER/i)).toBeTruthy()
  })

  it('shows empty states for calendar and deliveries', () => {
    const { getByText } = render(<BlueprintLayout {...mockProps} />)
    expect(getByText(/NO WORKS SCHEDULED/i)).toBeTruthy()
    expect(getByText(/NONE PENDING/i)).toBeTruthy()
  })

  it('replaces the house systems schedule with the occupant health schedule', () => {
    const { getByText, queryByText } = render(<BlueprintLayout {...mockProps} />)
    expect(getByText(/OCCUPANT · HEALTH SCHEDULE/)).toBeTruthy()
    expect(queryByText(/HOUSE SYSTEMS/)).toBeNull()
    expect(getByText('✓ TAKEN')).toBeTruthy()
  })

  it('renders the thermal section panel', () => {
    const { getByText, getByLabelText } = render(<BlueprintLayout {...mockProps} />)
    expect(getByText(/THERMAL SECTION/)).toBeTruthy()
    expect(getByLabelText(/Interior versus exterior temperature/i)).toBeTruthy()
  })

  it('shows the site photograph in full colour', () => {
    const { container } = render(
      <BlueprintLayout {...mockProps} photos={[{ filename: 'holiday.jpg' }]} />
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toBeTruthy()
    // It reads as a photo taped to the sheet, not a tinted panel
    expect(img.style.filter).toBe('')
    expect(img.style.mixBlendMode).toBe('')
    expect(img.style.opacity).toBe('')
  })

  it('lists Plex playback in general conditions with progress', () => {
    const session = {
      title: 'Breaking Bad',
      type: 'episode' as const,
      subtitle: 'S01E01',
      thumbPath: null,
      userName: 'gerald',
      userAvatar: null,
      viewOffset: 25800,
      duration: 60000,
      playerState: 'playing' as const,
    }
    const { getByText } = render(<BlueprintLayout {...mockProps} sessions={[session]} />)
    expect(getByText(/BREAKING BAD/)).toBeTruthy()
    expect(getByText(/43%/)).toBeTruthy()
  })
})

describe('HealthSchedule', () => {
  it('shows the medication as taken, with the time and streak', () => {
    const { getByText } = render(<HealthSchedule data={fitnessData} loading={false} />)
    expect(getByText('✓ TAKEN')).toBeTruthy()
    expect(getByText(/09:00 · 14 DAY STREAK/)).toBeTruthy()
    expect(getByText('BP Meds')).toBeTruthy()
  })

  it('marks the dose overdue once its scheduled time has passed', () => {
    const due = {
      ...fitnessData,
      medication: {
        ...fitnessData.medication!,
        takenToday: false,
        takenAt: null,
        scheduledAt: '00:01',
      },
    }
    const { getByText } = render(<HealthSchedule data={due} loading={false} />)
    expect(getByText('✗ OVERDUE')).toBeTruthy()
    expect(getByText(/SCHEDULED 00:01/)).toBeTruthy()
  })

  it('shows steps against the weekly average', () => {
    const { getByText } = render(<HealthSchedule data={fitnessData} loading={false} />)
    expect(getByText('3,994')).toBeTruthy()
    expect(getByText(/7 D AVG 5,102/)).toBeTruthy()
  })

  it('shows calories consumed and what is left of the budget', () => {
    const { getByText } = render(<HealthSchedule data={fitnessData} loading={false} />)
    expect(getByText('1,626')).toBeTruthy()
    expect(getByText(/274 REMAINING/)).toBeTruthy()
  })

  it('says how far over budget the day went', () => {
    const over = {
      ...fitnessData,
      calories: { ...fitnessData.calories, consumed: 2100, remaining: -200 },
    }
    const { getByText } = render(<HealthSchedule data={over} loading={false} />)
    expect(getByText(/200 OVER/)).toBeTruthy()
  })

  it('calls for a ride when the rolling week is short of the target', () => {
    const { getByText } = render(<HealthSchedule data={fitnessData} loading={false} />)
    expect(getByText('▲ RIDE 60 MIN')).toBeTruthy()
    expect(getByText(/3\/5 DAYS/)).toBeTruthy()
  })

  it('tracks lifting alongside cycling, with no minutes target', () => {
    const { getByText } = render(<HealthSchedule data={fitnessData} loading={false} />)
    expect(getByText('Lifting')).toBeTruthy()
    expect(getByText('▲ LIFT TODAY')).toBeTruthy()
    expect(getByText(/1\/3 DAYS/)).toBeTruthy()
  })

  it('calls it a rest day once a target is already met', () => {
    const met = {
      ...fitnessData,
      workouts: [{ ...fitnessData.workouts[0], daysInWindow: 5, needToday: false }],
    }
    const { getByText } = render(<HealthSchedule data={met} loading={false} />)
    expect(getByText('— REST DAY')).toBeTruthy()
  })

  it("credits today's session once it is logged", () => {
    const done = {
      ...fitnessData,
      workouts: [
        { ...fitnessData.workouts[0], doneToday: true, needToday: false, minutesToday: 65 },
        { ...fitnessData.workouts[1], doneToday: true, needToday: false, minutesToday: 9 },
      ],
    }
    const { getByText } = render(<HealthSchedule data={done} loading={false} />)
    expect(getByText('✓ 65 MIN')).toBeTruthy()
    expect(getByText('✓ 9 MIN')).toBeTruthy()
  })

  it('plots blood pressure, body mass and sleep', () => {
    const { getByLabelText } = render(<HealthSchedule data={fitnessData} loading={false} />)
    expect(getByLabelText(/ARTERIAL PRESSURE/)).toBeTruthy()
    expect(getByLabelText(/BODY MASS/)).toBeTruthy()
    expect(getByLabelText(/SLEEP/)).toBeTruthy()
  })

  it('shows the latest pressure and the sleep score in the plot headers', () => {
    const { getByText } = render(<HealthSchedule data={fitnessData} loading={false} />)
    expect(getByText('123/86')).toBeTruthy()
    expect(getByText(/SCORE 87 · 7 H AVG/)).toBeTruthy()
    expect(getByText(/225.6 LB/)).toBeTruthy()
  })

  it('leaves a gap for a night with no sleep record rather than interpolating', () => {
    const { container } = render(<HealthSchedule data={fitnessData} loading={false} />)
    // Two nights recorded out of seven slots: the other five are baseline ticks
    const sleepPlot = container.querySelectorAll('svg')
    const bars = Array.from(sleepPlot).flatMap((svg) => Array.from(svg.querySelectorAll('rect')))
    expect(bars.length).toBeGreaterThan(0)
    expect(bars.length).toBeLessThanOrEqual(6)
  })

  it('renders a held reading as HELD, never as a zero', () => {
    const held = {
      ...fitnessData,
      today: {
        ...fitnessData.today,
        steps: { metric: 'step_count', value: null, units: 'count', held: true },
      },
      weight: { ...fitnessData.weight, held: true, points: [], latest: null },
      heldMetrics: ['weight_body_mass'],
    }
    const { getByText, queryByText } = render(<HealthSchedule data={held} loading={false} />)
    expect(getByText('HELD')).toBeTruthy()
    expect(queryByText('0')).toBeNull()
    expect(getByText(/UNITS CHANGED: WEIGHT_BODY_MASS/)).toBeTruthy()
    expect(getByText(/UNITS CHANGED — SERIES HELD/)).toBeTruthy()
  })

  it('notes a phone that has stopped syncing without hiding the figures', () => {
    const stale = { ...fitnessData, ingestAgeHours: 31 }
    const { getByText } = render(<HealthSchedule data={stale} loading={false} />)
    expect(getByText(/PHONE LAST SYNCED 31 H AGO/)).toBeTruthy()
    expect(getByText('3,994')).toBeTruthy()
  })

  it('distinguishes an unmeasured series from a broken one', () => {
    const noBp = {
      ...fitnessData,
      bp: { ...fitnessData.bp, points: [], latest: null, avgSystolic: null, avgDiastolic: null },
    }
    const { getByText } = render(<HealthSchedule data={noBp} loading={false} />)
    expect(getByText(/NO READINGS LOGGED THIS PERIOD/)).toBeTruthy()
  })

  it('shows the setup note when unconfigured', () => {
    const { getByText } = render(
      <HealthSchedule data={{ ...fitnessData, configured: false }} loading={false} />
    )
    expect(getByText(/HEALTH RECORD NOT CONNECTED/i)).toBeTruthy()
  })

  it('shows the link-down note when unreachable with nothing cached', () => {
    const down = { ...fitnessData, reachable: false, vitals: [], medication: null }
    const { getByText } = render(<HealthSchedule data={down} loading={false} />)
    expect(getByText(/LINK DOWN/)).toBeTruthy()
  })

  it('shows a polling note while loading without data', () => {
    const { getByText } = render(<HealthSchedule data={null} loading={true} />)
    expect(getByText(/POLLING HEALTH RECORD/i)).toBeTruthy()
  })

  it('lists the extra vitals in one line', () => {
    const { getByText } = render(<HealthSchedule data={fitnessData} loading={false} />)
    expect(getByText(/RHR 75 BPM/)).toBeTruthy()
    expect(getByText(/FLTS 4/)).toBeTruthy()
    // VO₂ max is only ever ml/(kg·min); the unit costs more width than it adds
    expect(getByText(/VO₂ 32.2 ·/)).toBeTruthy()
  })
})

describe('ThermalProfile', () => {
  it('draws both series and the current readings', () => {
    const { container, getByText } = render(<ThermalProfile temps={temps} loading={false} />)
    expect(getByText(/INTERIOR/)).toBeTruthy()
    expect(getByText(/EXTERIOR/)).toBeTruthy()
    expect(getByText('71°')).toBeTruthy()
    expect(getByText('54°')).toBeTruthy()
    // one solid interior line, one dashed exterior line (the hatched envelope has no stroke)
    const lines = container.querySelectorAll('path[fill="none"][stroke]')
    expect(lines.length).toBe(2)
    expect(container.querySelector('path[stroke-dasharray]')).toBeTruthy()
  })

  it('carries the interior and exterior humidity in its legend', () => {
    const sensors = [
      { id: 'sensor.in_h', name: 'Interior RH', kind: 'humidity' as const, value: 45, unit: '%' },
      { id: 'sensor.out_h', name: 'Exterior RH', kind: 'humidity' as const, value: 62, unit: '%' },
    ]
    const { getByText } = render(<ThermalProfile temps={temps} sensors={sensors} loading={false} />)
    expect(getByText('45%')).toBeTruthy()
    expect(getByText('62%')).toBeTruthy()
  })

  it('shows the temperature delta between inside and outside', () => {
    const { getByText } = render(<ThermalProfile temps={temps} loading={false} />)
    expect(getByText('17°')).toBeTruthy()
  })

  it('omits the delta when only one sensor is known', () => {
    const indoorOnly = {
      ...temps,
      outdoorNow: null,
      points: temps.points.map((p) => ({ ...p, outdoor: null })),
    }
    const { queryByText } = render(<ThermalProfile temps={indoorOnly} loading={false} />)
    expect(queryByText(/ΔT/)).toBeNull()
  })

  it('explains how to configure sensors when no history exists', () => {
    const empty = { ...temps, available: false, points: [] }
    const { getByText } = render(<ThermalProfile temps={empty} loading={false} />)
    expect(getByText(/NO TEMPERATURE RECORD/)).toBeTruthy()
  })

  it('shows a plotting note while loading', () => {
    const { getByText } = render(<ThermalProfile temps={null} loading={true} />)
    expect(getByText(/PLOTTING THERMAL SECTION/)).toBeTruthy()
  })

  it('breaks the line across gaps instead of interpolating', () => {
    const gapped = {
      ...temps,
      points: temps.points.map((p, i) => ({ ...p, indoor: i < 10 ? null : p.indoor })),
    }
    const { container } = render(<ThermalProfile temps={gapped} loading={false} />)
    const solid = Array.from(container.querySelectorAll('path[stroke]')).find(
      (p) => !p.getAttribute('stroke-dasharray')
    )
    // Starts plotting only once readings exist
    expect(solid?.getAttribute('d')?.startsWith('M')).toBe(true)
  })
})
