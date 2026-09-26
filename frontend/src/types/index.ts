export interface WeatherCurrent {
  temp: number
  feelsLike: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
  windDirection: string
  windGust: number | null
  pressure: number
  visibility: number
  dewPoint: number
  sunrise: number
  sunset: number
}

export interface WeatherForecastDay {
  date: string
  high: number
  low: number
  icon: string
  description: string
}

export interface WeatherForecastHour {
  time: number // UTC epoch seconds; clients format it in their own local timezone
  temp: number
  icon: string
  pop: number // precipitation probability as a whole percent, 0–100
}

export interface WeatherData {
  current: WeatherCurrent
  forecast: WeatherForecastDay[]
  hourly: WeatherForecastHour[]
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  calendarIndex?: number
}

export interface PlexSession {
  title: string
  type: 'episode' | 'movie' | 'track'
  subtitle: string
  thumbPath: string | null
  userName: string
  userAvatar: string | null
  viewOffset: number
  duration: number
  playerState: 'playing' | 'paused' | 'buffering'
}

export interface UpcomingItem {
  title: string
  type: 'episode' | 'movie'
  date: string
  subtitle: string
}

export interface SoberDuration {
  years: number
  months: number
  days: number
  hours: number
}

export interface PhotoLocation {
  lat: number
  lon: number
  city?: string
  state?: string
  country?: string
}

export interface PhotoInfo {
  filename: string
  dateTaken?: string
  location?: PhotoLocation
}

export interface RadarData {
  zoom: number
  centerX: number
  centerY: number
  locX: number
  locY: number
  host: string
  radarPath: string
  hasPrecipitation: boolean
  frameCount: number
}

export interface HomeDevice {
  id: string // entity_id
  name: string // friendly_name (or prettified entity_id)
  domain: string // light, switch, media_player, binary_sensor, climate, lock, cover, fan
  state: string // raw HA state string
  active: boolean // "on"-like state for the domain (light on, media playing, door open…)
  unavailable: boolean
  detail?: string // human extra: "72%", media title, current temp…
  room: string | null // display label of the room, null when it belongs to none
}

export interface HomeSensor {
  id: string
  name: string
  kind: 'temperature' | 'humidity' | 'battery'
  value: number
  unit: string
}

/** One resampled time bucket; null where the sensor had no reading yet */
export interface TempPoint {
  t: number // unix seconds at bucket start
  indoor: number | null
  outdoor: number | null
}

export interface TempHistory {
  available: boolean
  indoorName: string | null
  outdoorName: string | null
  unit: string
  hours: number // window length the points span
  points: TempPoint[]
  indoorNow: number | null
  outdoorNow: number | null
}

export interface HomeAssistantSummary {
  configured: boolean // HOMEASSISTANT_URL + TOKEN present
  reachable: boolean // last poll succeeded (or served from last-good cache)
  lightsOn: number
  lightsTotal: number
  devices: HomeDevice[]
  sensors: HomeSensor[]
  unavailableCount: number
  temps: TempHistory
  updatedAt: string
}

export interface WordConjugation {
  pronoun: string
  form: string
}

export interface WordOfDay {
  word: string
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'interjection' | 'phrase'
  gender?: 'm' | 'f'
  pronunciation?: string
  definition: string
  spanishDefinition?: string
  note?: string
  conjugationTense?: string
  conjugations?: WordConjugation[]
  example: string
  exampleTranslation: string
  date: string
}

// ── Apple Health (healthkit service on popos) ──

/**
 * One numeric reading. `held` means the health service is refusing to report a value
 * because the metric's units changed and nobody has acknowledged it yet — render that
 * as a visible "units changed" state, never as a zero.
 */
export interface FitnessReading {
  metric: string // the Apple Health metric that actually resolved
  value: number | null
  units: string
  held: boolean
  ts?: string | null
}

export interface MedicationDose {
  date: string // YYYY-MM-DD, local
  taken: boolean
}

export interface MedicationStatus {
  name: string // the med's nickname, e.g. "BP Meds"
  detail: string | null // full label, e.g. "Hyzaar 100mg-25mg Tablet"
  takenToday: boolean
  takenAt: string | null // local HH:MM it was logged
  scheduledAt: string | null // local HH:MM it's due
  streakDays: number // consecutive days taken, counting back from today
  last7: MedicationDose[] // oldest first
}

export interface WorkoutDay {
  date: string // YYYY-MM-DD, local
  minutes: number // qualifying-activity minutes that day
  qualifying: boolean // long enough to count toward the weekly target
}

export interface WorkoutPlan {
  key: string // 'cycling' | 'lifting'
  label: string // 'Cycling'
  verb: string // what the board tells you to do: 'Ride', 'Lift'
  targetDays: number // sessions per rolling 7 days
  targetMinutes: number // minutes that make a full session; 0 = any session counts
  minutesToday: number
  doneToday: boolean
  needToday: boolean // target not yet met by the rolling window
  daysInWindow: number // qualifying days in the last 7
  lastSession: { name: string; ts: string; minutes: number } | null
  days: WorkoutDay[] // 7 entries, oldest first
}

export interface CalorieBudget {
  budget: number // flat daily allowance
  consumed: number | null
  remaining: number | null
  burnedActive: number | null // active energy, for context — not added to the budget
  held: boolean
}

export interface BpPoint {
  date: string // YYYY-MM-DD, local
  systolic: number
  diastolic: number
}

export interface BpTrend {
  days: number // window length requested
  points: BpPoint[] // oldest first; only days actually measured
  latest: BpPoint | null
  avgSystolic: number | null
  avgDiastolic: number | null
  held: boolean
}

/** One day's value, keyed by local calendar date */
export interface DailyPoint {
  date: string
  value: number
}

export interface WeightTrend {
  days: number // window the plot covers: 90 d, trimmed to what the record actually spans
  units: string
  points: DailyPoint[] // oldest first
  latest: number | null
  change: number | null // last minus first over the window
  held: boolean
}

export interface SleepNight {
  date: string
  hours: number // totalsleep
  deep: number
  rem: number
  core: number
  awake: number
  score: number // 0–100, see scoreNight() in fitnessService
}

export interface SleepTrend {
  nights: SleepNight[] // recorded nights in the last 7 days, oldest first; unmeasured nights are absent
  score: number | null // mean of the recorded nights' scores
  avgHours: number | null
}

/**
 * Every recorded day of the four explorable series, for the mobile view's chart
 * explorer. One call carries all of them: the whole record is a few tens of KB, and
 * the phone slices ranges locally rather than asking again for each zoom level.
 * A held series (units changed, unacknowledged) comes back with `held: true` and NO
 * points, never with numbers in the wrong unit.
 */
export interface FitnessHistory {
  configured: boolean
  reachable: boolean
  localDate: string
  timezone: string
  bp: { points: BpPoint[]; held: boolean }
  weight: { units: string; points: DailyPoint[]; held: boolean }
  sleep: { nights: SleepNight[]; held: boolean }
  steps: { points: DailyPoint[]; held: boolean }
  updatedAt: string
}

export interface FitnessVital {
  key: string
  label: string
  value: number | null
  units: string
  held: boolean
}

export interface FitnessSummary {
  configured: boolean // HEALTHKIT_URL + HEALTHKIT_READ_KEY present
  reachable: boolean // last poll succeeded (or served from last-good cache)
  localDate: string // the day "today" means, per the health service's timezone
  timezone: string
  asOf: string | null
  ingestAgeHours: number | null // hours since the phone last pushed; null when never
  medication: MedicationStatus | null
  today: {
    steps: FitnessReading | null
    activeEnergy: FitnessReading | null
    exerciseMinutes: FitnessReading | null
    standHours: FitnessReading | null
    distance: FitnessReading | null
    flightsClimbed: FitnessReading | null
  }
  calories: CalorieBudget
  workouts: WorkoutPlan[] // one per discipline, in display order
  bp: BpTrend
  weight: WeightTrend
  sleep: SleepTrend
  stepsWeek: DailyPoint[] // last 7 days of step counts, oldest first
  stepsAvg7: number | null
  vitals: FitnessVital[]
  heldMetrics: string[] // every metric awaiting a unit-change acknowledgement
  updatedAt: string
}
