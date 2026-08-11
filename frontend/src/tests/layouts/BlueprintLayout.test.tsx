import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { HomeAssistantSummary } from '../../types/index.js'

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
import { SystemsSchedule } from '../../layouts/blueprint/SystemsSchedule.js'
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

describe('SystemsSchedule', () => {
  it('renders device rows with status and details', () => {
    const { getByText } = render(<SystemsSchedule data={haData} loading={false} />)
    expect(getByText(/Living Room/)).toBeTruthy()
    expect(getByText(/— 50%/)).toBeTruthy()
    expect(getByText(/THE OFFICE/)).toBeTruthy()
    expect(getByText('PLAYING')).toBeTruthy()
    expect(getByText('OFF')).toBeTruthy()
    expect(getByText('FAULT')).toBeTruthy()
  })

  it('shows the luminaire tally and fault count', () => {
    const { getByText } = render(<SystemsSchedule data={haData} loading={false} />)
    expect(getByText('1/3')).toBeTruthy()
    expect(getByText(/1 FAULT/)).toBeTruthy()
    expect(getByText(/LINK OK/)).toBeTruthy()
  })

  it('balances columns instead of stranding a small room in its own column', () => {
    // Rooms of 2 / 7 / 5 devices: a naive even-thirds cut snapped to the first boundary
    // and left one column with 3 rows and another with 11
    const mk = (room: string, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `light.${room}_${i}`,
        name: `${room} ${i}`,
        domain: 'light',
        state: 'off',
        active: false,
        unavailable: false,
        room,
      }))
    const lopsided = {
      ...haData,
      devices: [...mk('Kitchen', 2), ...mk('Living room', 7), ...mk('Bedroom', 5)],
    }
    const { container } = render(<SystemsSchedule data={lopsided} loading={false} columns={3} />)
    const grid = container.querySelector('[style*="grid-template-columns"]') as HTMLElement
    const counts = Array.from(grid.children).map((col) => col.children.length - 1) // minus header
    expect(counts.length).toBe(3)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(6)
  })

  it('continues the schedule across columns, breaking at a room heading', () => {
    const { container } = render(<SystemsSchedule data={haData} loading={false} columns={3} />)
    const grid = container.querySelector('[style*="grid-template-columns"]') as HTMLElement
    // Only two rooms here, so it uses two columns rather than spreading thinly over three
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    // Each column starts with its own room heading, so no room is split across columns
    const headings = Array.from(grid.children).map(
      (col) => col.querySelector('.uppercase')?.textContent
    )
    expect(headings[0]).toContain('Living room')
  })

  it('groups devices under room headings with an on/total tally', () => {
    const { getByText, getAllByText } = render(<SystemsSchedule data={haData} loading={false} />)
    expect(getByText('Living room')).toBeTruthy()
    // "Bedroom" is both a room heading and a fixture name, so both nodes are expected
    expect(getAllByText('Bedroom').length).toBe(2)
    // Living room has both its devices active, Bedroom none
    expect(getByText('2/2')).toBeTruthy()
    expect(getByText('0/2')).toBeTruthy()
  })

  it('shows sensor readouts with units', () => {
    const { getByText } = render(<SystemsSchedule data={haData} loading={false} />)
    expect(getByText('72.5')).toBeTruthy()
    expect(getByText(/AQARA TEMPERATURE/i)).toBeTruthy()
  })

  it('shows the setup note when unconfigured', () => {
    const unconfigured = { ...haData, configured: false, devices: [], sensors: [] }
    const { getByText } = render(<SystemsSchedule data={unconfigured} loading={false} />)
    expect(getByText(/FIELD TELEMETRY NOT CONNECTED/i)).toBeTruthy()
  })

  it('shows the link-down note when unreachable with no cached devices', () => {
    const down = { ...haData, reachable: false, devices: [], sensors: [] }
    const { getByText } = render(<SystemsSchedule data={down} loading={false} />)
    expect(getByText(/LINK DOWN/)).toBeTruthy()
  })

  it('shows a polling note while loading without data', () => {
    const { getByText } = render(<SystemsSchedule data={null} loading={true} />)
    expect(getByText(/POLLING FIELD INSTRUMENTS/i)).toBeTruthy()
  })

  it('lists idle devices individually rather than summarising them', () => {
    const manyOff = {
      ...haData,
      devices: [
        ...haData.devices,
        ...[1, 2, 3].map((i) => ({
          id: `light.off_${i}`,
          name: `Off Light ${i}`,
          domain: 'light',
          state: 'off',
          active: false,
          unavailable: false,
          room: 'Kitchen',
        })),
      ],
    }
    const { getByText } = render(<SystemsSchedule data={manyOff} loading={false} />)
    expect(getByText(/Off Light 1/)).toBeTruthy()
    expect(getByText(/Off Light 3/)).toBeTruthy()
  })

  it('keeps active devices when the list is trimmed, and says how many were dropped', () => {
    const overflowing = {
      ...haData,
      devices: [
        ...haData.devices.filter((d) => d.active),
        ...Array.from({ length: 40 }, (_, i) => ({
          id: `light.off_${i}`,
          name: `Off Light ${i}`,
          domain: 'light',
          state: 'off',
          active: false,
          unavailable: false,
          room: 'Kitchen',
        })),
      ],
    }
    const { getByText } = render(<SystemsSchedule data={overflowing} loading={false} />)
    // The two active devices survive the cut
    expect(getByText(/Living Room/)).toBeTruthy()
    expect(getByText(/Roku/)).toBeTruthy()
    expect(getByText(/FURTHER ITEMS NOT SHOWN/)).toBeTruthy()
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
