import { ComponentType } from 'react'
import {
  WeatherData,
  CalendarEvent,
  PlexSession,
  UpcomingItem,
  RadarData,
  PhotoInfo,
} from '../types/index.js'
import { PiholeStats } from '../hooks/usePihole.js'
import { ClassicLayout } from './classic/ClassicLayout.js'
import { ZenLayout } from './ZenLayout.js'
import { TerminalLayout } from './terminal/TerminalLayout.js'
import { NewspaperLayout } from './newspaper/NewspaperLayout.js'
import { DeparturesLayout } from './departures/DeparturesLayout.js'
import { FridgeLayout } from './fridge/FridgeLayout.js'
import { ObservatoryLayout } from './observatory/ObservatoryLayout.js'
import { FluxLayout } from './flux/FluxLayout.js'
import { MosaicLayout } from './mosaic/MosaicLayout.js'
import { FractalLayout } from './fractal/FractalLayout.js'

export type RadarMode = 'adaptive' | 'on' | 'off'

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
  photos: PhotoInfo[]
  mediaItems: UpcomingItem[]
  mediaLoading: boolean
  radarData: RadarData | null
  radarLoading: boolean
  radarMode: RadarMode
  sobrietyDate: string
}

export function shouldShowRadar(
  mode: RadarMode,
  data: { hasPrecipitation?: boolean } | null
): boolean {
  if (mode === 'off') return false
  if (mode === 'on') return data != null
  return data?.hasPrecipitation === true
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
  {
    name: 'departures',
    label: 'Departures',
    description: 'Split-flap airport departures board',
    component: DeparturesLayout,
  },
  {
    name: 'fridge',
    label: 'Fridge',
    description: 'Polaroids, magnets, and sticky notes',
    component: FridgeLayout,
  },
  {
    name: 'observatory',
    label: 'Observatory',
    description: 'Night-sky almanac with instruments, day/night theming',
    component: ObservatoryLayout,
  },
  {
    name: 'flux',
    label: 'Flux',
    description: 'Weather-driven particle flow field, day/night theming',
    component: FluxLayout,
  },
  {
    name: 'mosaic',
    label: 'Mosaic',
    description: 'Kinetic hex tessellation with data ripples, day/night theming',
    component: MosaicLayout,
  },
  {
    name: 'fractal',
    label: 'Fractal',
    description: 'Endless self-similar zoom, randomly generated, day/night theming',
    component: FractalLayout,
  },
]

export const DEFAULT_LAYOUT = 'zen'

export function getLayout(name: string): LayoutDefinition {
  return LAYOUTS.find((l) => l.name === name) ?? LAYOUTS[0]
}
