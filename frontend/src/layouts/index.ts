import { ComponentType } from 'react'
import { WeatherData, CalendarEvent, PlexSession, UpcomingItem, RadarData } from '../types/index.js'
import { PiholeStats } from '../hooks/usePihole.js'
import { ClassicLayout } from './classic/ClassicLayout.js'
import { ZenLayout } from './ZenLayout.js'
import { TerminalLayout } from './terminal/TerminalLayout.js'
import { NewspaperLayout } from './newspaper/NewspaperLayout.js'

/** Props every layout receives — all hook data pre-fetched by App */
export interface LayoutProps {
  weatherData: WeatherData | null
  weatherLoading: boolean
  events: CalendarEvent[]
  calendarLoading: boolean
  sessions: PlexSession[]
  plexLoading: boolean
  piholeData: PiholeStats | null
  piholeLoading: boolean
  photos: string[]
  mediaItems: UpcomingItem[]
  mediaLoading: boolean
  radarData: RadarData | null
  radarLoading: boolean
  sobrietyDate: string
}

export interface LayoutDefinition {
  name: string
  label: string
  description: string
  component: ComponentType<LayoutProps>
}

export const LAYOUTS: LayoutDefinition[] = [
  {
    name: 'zen',
    label: 'Zen',
    description: 'Clean vertical layout with day/night theming',
    component: ZenLayout,
  },
  {
    name: 'classic',
    label: 'Classic',
    description: 'Three-column glassmorphism with photo background',
    component: ClassicLayout,
  },
  {
    name: 'terminal',
    label: 'Terminal',
    description: 'Green-on-black retro CRT terminal',
    component: TerminalLayout,
  },
  {
    name: 'newspaper',
    label: 'Newspaper',
    description: 'Editorial broadsheet with serif typography',
    component: NewspaperLayout,
  },
]

export const DEFAULT_LAYOUT = 'zen'

export function getLayout(name: string): LayoutDefinition {
  return LAYOUTS.find((l) => l.name === name) ?? LAYOUTS[0]
}
