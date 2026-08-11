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
