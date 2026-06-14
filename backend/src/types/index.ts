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
  time: number
  temp: number
  icon: string
  pop: number
}

export interface WeatherResponse {
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

export interface CalendarResponse {
  events: CalendarEvent[]
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

export interface PlexResponse {
  // Backward compatibility for older frontend builds during rolling deploys.
  session: PlexSession | null
  sessions: PlexSession[]
}

export interface PhotosResponse {
  photos: string[]
}

export interface PiholeClient {
  name: string
  ip: string
  queries: number
  blockedQueries: number
  blockedPercentage: number
}

export interface UpcomingItem {
  title: string
  type: 'episode' | 'movie'
  date: string
  subtitle: string
}

export interface MediaResponse {
  items: UpcomingItem[]
}

export interface PiholeResponse {
  totalQueries: number
  blockedQueries: number
  blockedPercentage: number
  domainsOnBlocklist: number
  status: string
  blockedLastHour: number
  queriesLastHour: number
  clients: PiholeClient[]
}

export interface WordConjugation {
  pronoun: string // e.g. 'yo', 'tú', 'él/ella', 'nosotros', 'ellos/ellas'
  form: string // the conjugated verb form
}

export interface WordOfDay {
  word: string // the Spanish (Mexican) word or phrase
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'interjection' | 'phrase'
  gender?: 'm' | 'f' // for nouns
  pronunciation?: string // rough phonetic hint
  definition: string // English definition
  spanishDefinition?: string // Spanish gloss
  note?: string // Mexican usage / register note
  conjugationTense?: string // e.g. 'Present' — present when conjugations are included
  conjugations?: WordConjugation[] // present only for irregular verbs
  example: string // example sentence in Spanish
  exampleTranslation: string // English translation of the example
  date: string // YYYY-MM-DD this word is served for
}
