export interface WeatherCurrent {
  temp: number
  feelsLike: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
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

export interface WeatherResponse {
  current: WeatherCurrent
  forecast: WeatherForecastDay[]
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
  session: PlexSession | null
}

export interface PhotosResponse {
  photos: string[]
}
