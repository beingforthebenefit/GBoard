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
  url: string
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
}
