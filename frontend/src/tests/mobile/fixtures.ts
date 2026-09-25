import { FitnessSummary, WorkoutPlan } from '../../types/index.js'
import { MobileData } from '../../mobile/status.js'

export const TODAY = '2026-09-25'
// 3:30 PM local on TODAY
export const NOW = new Date('2026-09-25T15:30:00')

const day = (offset: number) => {
  const d = new Date(`${TODAY}T12:00:00`)
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function workout(over: Partial<WorkoutPlan> = {}): WorkoutPlan {
  const pattern = [true, false, true, false, true, false, false]
  return {
    key: 'cycling',
    label: 'Cycling',
    verb: 'Ride',
    targetDays: 5,
    targetMinutes: 60,
    minutesToday: 0,
    doneToday: false,
    needToday: true,
    daysInWindow: 3,
    lastSession: null,
    days: pattern.map((q, i) => ({ date: day(i - 6), minutes: q ? 62 : 0, qualifying: q })),
    ...over,
  }
}

export function fitness(over: Partial<FitnessSummary> = {}): FitnessSummary {
  return {
    configured: true,
    reachable: true,
    localDate: TODAY,
    timezone: 'America/Los_Angeles',
    asOf: `${TODAY}T22:00:00Z`,
    ingestAgeHours: 1.5,
    medication: {
      name: 'BP Meds',
      detail: null,
      takenToday: true,
      takenAt: '08:29',
      scheduledAt: '09:00',
      streakDays: 41,
      last7: Array.from({ length: 7 }, (_, i) => ({ date: day(i - 6), taken: true })),
    },
    today: {
      steps: { metric: 'step_count', value: 1053, units: 'count', held: false },
      activeEnergy: null,
      exerciseMinutes: null,
      standHours: null,
      distance: null,
      flightsClimbed: null,
    },
    calories: { budget: 1900, consumed: 966, remaining: 934, burnedActive: 113, held: false },
    workouts: [
      workout(),
      workout({
        key: 'lifting',
        label: 'Lifting',
        verb: 'Lift',
        targetDays: 3,
        targetMinutes: 0,
        needToday: false,
        daysInWindow: 2,
      }),
    ],
    bp: {
      days: 30,
      points: [
        { date: day(-3), systolic: 121, diastolic: 78 },
        { date: TODAY, systolic: 116, diastolic: 72 },
      ],
      latest: { date: TODAY, systolic: 116, diastolic: 72 },
      avgSystolic: 118,
      avgDiastolic: 75,
      held: false,
    },
    weight: {
      days: 42,
      units: 'lb',
      points: [
        { date: day(-41), value: 237.4 },
        { date: TODAY, value: 228.5 },
      ],
      latest: 228.5,
      change: -8.9,
      held: false,
    },
    sleep: {
      nights: [
        { date: TODAY, hours: 7.1, deep: 0.55, rem: 1.5, core: 5.05, awake: 0.5, score: 89 },
      ],
      score: 89,
      avgHours: 7.1,
    },
    stepsWeek: [7367, 5024, 4252, 2886, 3777, 4371, 1053].map((v, i) => ({
      date: day(i - 6),
      value: v,
    })),
    stepsAvg7: 4104,
    vitals: [
      { key: 'restingHeartRate', label: 'Resting HR', value: 68, units: 'bpm', held: false },
    ],
    heldMetrics: [],
    updatedAt: `${TODAY}T22:00:00Z`,
    ...over,
  }
}

export function mobileData(over: Partial<MobileData> = {}): MobileData {
  return {
    fitness: fitness(),
    weather: {
      current: {
        temp: 69,
        feelsLike: 69,
        description: 'scattered clouds',
        icon: '03d',
        humidity: 69,
        windSpeed: 20,
        windDirection: 'W',
        windGust: null,
        pressure: 1015,
        visibility: 6,
        dewPoint: 58,
        sunrise: 0,
        sunset: 0,
      },
      forecast: [
        { date: TODAY, high: 71, low: 58, icon: '04d', description: 'broken clouds' },
        { date: day(1), high: 76, low: 52, icon: '04d', description: 'overcast' },
      ],
      hourly: [],
    },
    events: [
      {
        id: 'a',
        title: 'Grocery pickup',
        start: `${TODAY}T16:30:00`,
        end: `${TODAY}T17:00:00`,
        allDay: false,
      },
      {
        id: 'b',
        title: 'Game night',
        start: `${TODAY}T19:00:00`,
        end: `${TODAY}T22:00:00`,
        allDay: false,
      },
    ],
    media: [
      { title: 'Real Time with Bill Maher', type: 'episode', date: TODAY, subtitle: 'S24E28' },
    ],
    word: {
      word: 'saber',
      partOfSpeech: 'verb',
      pronunciation: 'sah-BEHR',
      definition: 'to know (a fact), to know how',
      example: '¿Sabes a qué hora abre?',
      exampleTranslation: 'Do you know what time it opens?',
      conjugationTense: 'Present',
      conjugations: [
        { pronoun: 'yo', form: 'sé' },
        { pronoun: 'tú', form: 'sabes' },
      ],
      date: TODAY,
    },
    ha: {
      configured: true,
      reachable: true,
      lightsOn: 0,
      lightsTotal: 0,
      devices: [],
      sensors: [
        { id: 'a', name: 'Interior RH', kind: 'humidity', value: 48, unit: '%' },
        { id: 'b', name: 'Exterior RH', kind: 'humidity', value: 69, unit: '%' },
      ],
      unavailableCount: 0,
      temps: {
        available: true,
        indoorName: 'Interior',
        outdoorName: 'Exterior',
        unit: '°F',
        hours: 24,
        points: [
          { t: 1790380800, indoor: 71, outdoor: 60 },
          { t: 1790382600, indoor: 72, outdoor: 63 },
        ],
        indoorNow: 72,
        outdoorNow: 63,
      },
      updatedAt: `${TODAY}T22:00:00Z`,
    },
    pihole: {
      totalQueries: 159583,
      blockedQueries: 15610,
      blockedPercentage: 9.78,
      domainsOnBlocklist: 2991803,
      status: 'enabled',
      blockedLastHour: 859,
      queriesLastHour: 7372,
      clients: [
        {
          name: 'Apple TV',
          ip: '192.168.50.17',
          queries: 8144,
          blockedQueries: 5340,
          blockedPercentage: 65.6,
        },
      ],
    },
    plex: [],
    ...over,
  }
}
