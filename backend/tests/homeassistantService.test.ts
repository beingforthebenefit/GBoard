import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildSummary,
  fetchHomeAssistant,
  pickTempEntities,
  bucketReadings,
  buildTempHistory,
  detectRooms,
  _resetCache,
} from '../src/services/homeassistantService.js'

const entity = (entity_id: string, state: string, attributes: Record<string, unknown> = {}) => ({
  entity_id,
  state,
  attributes,
})

const FIXTURE = [
  entity('light.living_room', 'on', { friendly_name: 'Living Room', brightness: 128 }),
  entity('light.bedroom', 'off', { friendly_name: 'Bedroom' }),
  entity('light.hallway', 'unavailable', { friendly_name: 'Hallway' }),
  entity('switch.sync_box', 'on', { friendly_name: 'Sync Box Light Sync' }),
  entity('media_player.roku', 'playing', {
    friendly_name: 'Living Room Roku',
    media_title: 'The Office',
  }),
  entity('media_player.nanoleaf', 'idle', { friendly_name: 'Nanoleaf' }),
  entity('binary_sensor.front_door', 'on', {
    friendly_name: 'Front Door',
    device_class: 'door',
  }),
  entity('binary_sensor.updater_thing', 'on', { device_class: 'update' }),
  entity('sensor.aqara_temperature', '72.46', {
    friendly_name: 'Aqara Temperature',
    device_class: 'temperature',
    unit_of_measurement: '°F',
  }),
  entity('sensor.aqara_humidity', '45.2', {
    friendly_name: 'Aqara Humidity',
    device_class: 'humidity',
    unit_of_measurement: '%',
  }),
  entity('sensor.phone_battery', '18', {
    friendly_name: 'Phone Battery',
    device_class: 'battery',
  }),
  entity('sensor.remote_battery', '80', {
    friendly_name: 'Remote Battery',
    device_class: 'battery',
    unit_of_measurement: '%',
  }),
  entity('sensor.aqara_temp_bad', 'unavailable', { device_class: 'temperature' }),
  entity('sensor.pihole_ads_blocked', '1234', { friendly_name: 'Ads Blocked' }),
  entity('sun.sun', 'above_horizon', {}),
  entity('person.gerald', 'home', { friendly_name: 'Gerald' }),
  entity('weather.forecast_home', 'sunny', {}),
]

describe('buildSummary', () => {
  it('counts lights on vs total', () => {
    const summary = buildSummary(FIXTURE)
    expect(summary.lightsOn).toBe(1)
    expect(summary.lightsTotal).toBe(3)
  })

  it('includes only curated domains as devices', () => {
    const summary = buildSummary(FIXTURE)
    const ids = summary.devices.map((d) => d.id)
    expect(ids).toContain('light.living_room')
    expect(ids).toContain('switch.sync_box')
    expect(ids).toContain('media_player.roku')
    expect(ids).not.toContain('sun.sun')
    expect(ids).not.toContain('person.gerald')
    expect(ids).not.toContain('weather.forecast_home')
    expect(ids).not.toContain('sensor.pihole_ads_blocked')
  })

  it('converts light brightness to a percentage detail', () => {
    const summary = buildSummary(FIXTURE)
    const light = summary.devices.find((d) => d.id === 'light.living_room')
    expect(light?.detail).toBe('50%')
    expect(light?.active).toBe(true)
  })

  it('surfaces media title for playing players only', () => {
    const summary = buildSummary(FIXTURE)
    const roku = summary.devices.find((d) => d.id === 'media_player.roku')
    const nanoleaf = summary.devices.find((d) => d.id === 'media_player.nanoleaf')
    expect(roku?.detail).toBe('The Office')
    expect(roku?.active).toBe(true)
    expect(nanoleaf?.detail).toBeUndefined()
    expect(nanoleaf?.active).toBe(false)
  })

  it('drops integration config toggles that are not real devices', () => {
    const withNoise = [
      ...FIXTURE,
      entity('switch.hue_bridge_automation_kitchen_switch', 'on', {
        friendly_name: 'Hue Bridge Automation: Kitchen Switch',
      }),
      entity('switch.sync_box_dolby_vision_compatibility', 'off', {
        friendly_name: 'Sync Box Dolby Vision compatibility',
      }),
    ]
    const ids = buildSummary(withNoise).devices.map((d) => d.id)
    expect(ids).not.toContain('switch.hue_bridge_automation_kitchen_switch')
    expect(ids).not.toContain('switch.sync_box_dolby_vision_compatibility')
    expect(ids).toContain('switch.sync_box')
  })

  it('treats a powered-on media player as active so it sorts to the top', () => {
    const withPoweredPlayer = [
      ...FIXTURE,
      entity('media_player.the_board', 'on', { friendly_name: 'The Board' }),
    ]
    const summary = buildSummary(withPoweredPlayer)
    const board = summary.devices.find((d) => d.id === 'media_player.the_board')
    expect(board?.active).toBe(true)
    // Everything active precedes everything idle
    const lastActive = summary.devices.findLastIndex((d) => d.active)
    const firstIdle = summary.devices.findIndex((d) => !d.active)
    expect(lastActive).toBeLessThan(firstIdle)
  })

  it('keeps door binary sensors but drops uninteresting device classes', () => {
    const summary = buildSummary(FIXTURE)
    const ids = summary.devices.map((d) => d.id)
    expect(ids).toContain('binary_sensor.front_door')
    expect(ids).not.toContain('binary_sensor.updater_thing')
  })

  it('marks unavailable devices and counts them', () => {
    const summary = buildSummary(FIXTURE)
    const hallway = summary.devices.find((d) => d.id === 'light.hallway')
    expect(hallway?.unavailable).toBe(true)
    expect(summary.unavailableCount).toBe(1)
  })

  it('sorts active devices before idle ones and unavailable last', () => {
    const summary = buildSummary(FIXTURE)
    const tiers = summary.devices.map((d) => (d.active ? 0 : d.unavailable ? 2 : 1))
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b))
  })

  it('extracts numeric sensors with units, rounding to whole degrees and percent', () => {
    const summary = buildSummary(FIXTURE)
    const temp = summary.sensors.find((s) => s.id === 'sensor.aqara_temperature')
    expect(temp).toMatchObject({ kind: 'temperature', value: 72, unit: '°F' })
    const hum = summary.sensors.find((s) => s.id === 'sensor.aqara_humidity')
    expect(hum?.value).toBe(45)
    expect(summary.sensors.find((s) => s.id === 'sensor.aqara_temp_bad')).toBeUndefined()
  })

  it('relabels the readouts as interior/exterior and pairs each with its humidity', () => {
    const paired = [
      entity('sensor.w100_temperature', '72', {
        friendly_name: 'Climate Sensor W100 Temperature',
        device_class: 'temperature',
      }),
      entity('sensor.w100_humidity', '58.8', {
        friendly_name: 'Climate Sensor W100 Humidity',
        device_class: 'humidity',
      }),
      entity('sensor.pirateweather_temperature', '61', {
        friendly_name: 'PirateWeather Temperature',
        device_class: 'temperature',
      }),
      entity('sensor.pirateweather_humidity', '87', {
        friendly_name: 'PirateWeather Humidity',
        device_class: 'humidity',
      }),
    ]
    const sensors = buildSummary(paired).sensors
    expect(sensors.map((s) => s.name)).toEqual([
      'Interior',
      'Exterior',
      'Interior RH',
      'Exterior RH',
    ])
    expect(sensors.map((s) => s.value)).toEqual([72, 61, 59, 87])
  })

  it('orders sensors temperature → humidity → battery (lowest battery first)', () => {
    const summary = buildSummary(FIXTURE)
    const kinds = summary.sensors.map((s) => s.kind)
    expect(kinds).toEqual(['temperature', 'humidity', 'battery', 'battery'])
    const batteries = summary.sensors.filter((s) => s.kind === 'battery')
    expect(batteries[0].value).toBe(18)
    expect(batteries[0].unit).toBe('%')
  })
})

describe('device grouping', () => {
  it('hides numbered group members when the group light is listed', () => {
    const hue = [
      entity('light.kitchen_kitchen', 'off', { friendly_name: 'Kitchen' }),
      entity('light.kitchen_kitchen_1', 'off', { friendly_name: 'Kitchen 1' }),
      entity('light.kitchen_kitchen_2', 'off', { friendly_name: 'Kitchen 2' }),
      entity('light.kitchen_kitchen_3', 'off', { friendly_name: 'Kitchen 3' }),
      entity('light.kitchen_kitchen_4', 'off', { friendly_name: 'Kitchen 4' }),
    ]
    const ids = buildSummary(hue).devices.map((d) => d.id)
    expect(ids).toEqual(['light.kitchen_kitchen'])
  })

  it('keeps named room members, which are separately controllable', () => {
    const hue = [
      entity('light.living_room_living_room', 'off', { friendly_name: 'Living room' }),
      entity('light.living_room_sofa_light', 'on', { friendly_name: 'Sofa Light' }),
    ]
    const ids = buildSummary(hue).devices.map((d) => d.id)
    expect(ids).toContain('light.living_room_living_room')
    expect(ids).toContain('light.living_room_sofa_light')
  })

  it('merges an L/R pair into one fixture', () => {
    const pair = [
      entity('light.living_room_tv_light_l', 'on', { friendly_name: 'TV Light L' }),
      entity('light.living_room_tv_light_r', 'on', { friendly_name: 'TV Light R' }),
    ]
    const devices = buildSummary(pair).devices
    expect(devices).toHaveLength(1)
    expect(devices[0]).toMatchObject({
      name: 'TV Light',
      state: 'on',
      active: true,
      detail: '2 fixtures',
    })
  })

  it('reports a partly-lit pair as a fraction', () => {
    const pair = [
      entity('light.tv_light_l', 'on', { friendly_name: 'TV Light L' }),
      entity('light.tv_light_r', 'off', { friendly_name: 'TV Light R' }),
    ]
    const devices = buildSummary(pair).devices
    expect(devices[0].state).toBe('1/2 on')
    expect(devices[0].active).toBe(true)
  })

  it('leaves an unpaired light with a side-letter name alone', () => {
    const single = [entity('light.tv_light_l', 'on', { friendly_name: 'TV Light L' })]
    expect(buildSummary(single).devices[0].name).toBe('TV Light L')
  })

  it('counts merged fixtures once in the luminaire tally', () => {
    const pair = [
      entity('light.tv_light_l', 'on', { friendly_name: 'TV Light L' }),
      entity('light.tv_light_r', 'on', { friendly_name: 'TV Light R' }),
    ]
    const summary = buildSummary(pair)
    expect(summary.lightsTotal).toBe(1)
    expect(summary.lightsOn).toBe(1)
  })
})

describe('room detection', () => {
  const HOUSE = [
    entity('light.kitchen_kitchen', 'off', { friendly_name: 'Kitchen' }),
    entity('light.living_room_living_room', 'on', { friendly_name: 'Living room' }),
    entity('light.living_room_sofa_light', 'on', { friendly_name: 'Sofa Light' }),
    entity('media_player.kitchen_kitchen', 'idle', {
      friendly_name: 'Kitchen',
      volume_level: 0.3,
    }),
    entity('switch.sync_box_power', 'off', { friendly_name: 'Sync Box Power' }),
  ]

  it('derives rooms from Hue group lights and assigns members', () => {
    expect(
      detectRooms(HOUSE)
        .map((r) => r.label)
        .sort()
    ).toEqual(['Kitchen', 'Living room'])
    const byId = new Map(buildSummary(HOUSE).devices.map((d) => [d.id, d.room]))
    expect(byId.get('light.living_room_sofa_light')).toBe('Living room')
    expect(byId.get('media_player.kitchen_kitchen')).toBe('Kitchen')
  })

  it('leaves devices outside any room unassigned', () => {
    const byId = new Map(buildSummary(HOUSE).devices.map((d) => [d.id, d.room]))
    expect(byId.get('switch.sync_box_power')).toBeNull()
  })

  it('renames a room group light so it does not duplicate the room heading', () => {
    const group = buildSummary(HOUSE).devices.find((d) => d.id === 'light.kitchen_kitchen')
    expect(group?.name).toBe('All fixtures')
  })

  it('orders rooms with something switched on before quiet ones, roomless last', () => {
    const rooms = buildSummary(HOUSE).devices.map((d) => d.room)
    expect(rooms[0]).toBe('Living room')
    expect(rooms[rooms.length - 1]).toBeNull()
  })
})

describe('media player labelling', () => {
  it('labels a TV by its device class', () => {
    const tv = [
      entity('media_player.the_board', 'on', { friendly_name: 'The Board', device_class: 'tv' }),
    ]
    expect(buildSummary(tv).devices[0].detail).toBe('tv')
  })

  it('labels an AirPlay speaker with no device class as a speaker', () => {
    const homepod = [
      entity('media_player.kitchen_kitchen', 'idle', {
        friendly_name: 'Kitchen',
        volume_level: 0.4,
        media_artist: 'Someone',
      }),
    ]
    expect(buildSummary(homepod).devices[0].detail).toBe('speaker')
  })

  it('prefers the track title while playing', () => {
    const homepod = [
      entity('media_player.kitchen_kitchen', 'playing', {
        friendly_name: 'Kitchen',
        volume_level: 0.4,
        media_title: 'Weightless',
      }),
    ]
    expect(buildSummary(homepod).devices[0].detail).toBe('Weightless')
  })
})

describe('pickTempEntities', () => {
  const TEMPS = [
    entity('sensor.aqara_temperature', '72', {
      friendly_name: 'Living Room Temperature',
      device_class: 'temperature',
    }),
    entity('sensor.backyard_temp', '58', {
      friendly_name: 'Backyard Outside Temp',
      device_class: 'temperature',
    }),
    entity('sensor.phone_battery', '80', { device_class: 'battery' }),
  ]

  afterEach(() => {
    delete process.env.HOMEASSISTANT_INDOOR_TEMP_ENTITY
    delete process.env.HOMEASSISTANT_OUTDOOR_TEMP_ENTITY
  })

  it('detects outdoor by name and assigns the other sensor indoors', () => {
    expect(pickTempEntities(TEMPS)).toEqual({
      indoor: 'sensor.aqara_temperature',
      outdoor: 'sensor.backyard_temp',
    })
  })

  // Real case: the W100 exposes a sibling pair, and PirateWeather also reports a
  // "temperature" that is really outdoors. Keyword matching alone picked the forecast.
  it('pairs a device sibling and never treats a forecast sensor as indoors', () => {
    const real = [
      entity('sensor.living_room_climate_sensor_w100_outdoor_temperature', '64', {
        friendly_name: 'Climate Sensor W100 Outdoor Temperature',
        device_class: 'temperature',
      }),
      entity('sensor.pirateweather_temperature', '61', {
        friendly_name: 'PirateWeather Temperature',
        device_class: 'temperature',
      }),
      entity('sensor.climate_sensor_w100_temperature', '72.2', {
        friendly_name: 'Climate Sensor W100 Temperature',
        device_class: 'temperature',
      }),
    ]
    expect(pickTempEntities(real)).toEqual({
      indoor: 'sensor.climate_sensor_w100_temperature',
      outdoor: 'sensor.living_room_climate_sensor_w100_outdoor_temperature',
    })
  })

  it('falls back to a forecast sensor for outdoors when nothing is named outdoor', () => {
    const noOutdoor = [
      entity('sensor.hallway_temperature', '70', {
        friendly_name: 'Hallway Temperature',
        device_class: 'temperature',
      }),
      entity('sensor.pirateweather_temperature', '61', {
        friendly_name: 'PirateWeather Temperature',
        device_class: 'temperature',
      }),
    ]
    expect(pickTempEntities(noOutdoor)).toEqual({
      indoor: 'sensor.hallway_temperature',
      outdoor: 'sensor.pirateweather_temperature',
    })
  })

  it('prefers explicit env overrides', () => {
    process.env.HOMEASSISTANT_INDOOR_TEMP_ENTITY = 'sensor.custom_in'
    process.env.HOMEASSISTANT_OUTDOOR_TEMP_ENTITY = 'sensor.custom_out'
    expect(pickTempEntities(TEMPS)).toEqual({
      indoor: 'sensor.custom_in',
      outdoor: 'sensor.custom_out',
    })
  })

  it('never assigns the same sensor to both slots', () => {
    const onlyOne = [TEMPS[1]]
    const picks = pickTempEntities(onlyOne)
    expect(picks.outdoor).toBe('sensor.backyard_temp')
    expect(picks.indoor).toBeNull()
  })

  it('ignores non-temperature and non-numeric sensors', () => {
    const noisy = [
      entity('sensor.broken', 'unavailable', { device_class: 'temperature' }),
      entity('sensor.phone_battery', '80', { device_class: 'battery' }),
    ]
    expect(pickTempEntities(noisy)).toEqual({ indoor: null, outdoor: null })
  })
})

describe('bucketReadings', () => {
  const start = 1_000_000
  const bucket = 1000

  it('averages multiple readings landing in the same bucket', () => {
    const out = bucketReadings(
      [
        { t: start + 100, v: 70 },
        { t: start + 200, v: 72 },
      ],
      start,
      bucket,
      2
    )
    expect(out[0]).toBe(71)
  })

  it('rounds bucket values to whole degrees', () => {
    const out = bucketReadings([{ t: start + 10, v: 72.212 }], start, bucket, 1)
    expect(out[0]).toBe(72)
  })

  it('carries the last value forward across empty buckets', () => {
    const out = bucketReadings([{ t: start + 10, v: 68 }], start, bucket, 4)
    expect(out).toEqual([68, 68, 68, 68])
  })

  it('seeds from the most recent reading before the window', () => {
    const out = bucketReadings(
      [
        { t: start - 50_000, v: 60 },
        { t: start - 10, v: 65 },
        { t: start + bucket + 5, v: 70 },
      ],
      start,
      bucket,
      3
    )
    expect(out).toEqual([65, 70, 70])
  })

  it('leaves leading buckets null when nothing is known yet', () => {
    const out = bucketReadings([{ t: start + 2 * bucket, v: 70 }], start, bucket, 4)
    expect(out).toEqual([null, null, 70, 70])
  })

  it('ignores readings past the end of the window', () => {
    const out = bucketReadings([{ t: start + 99 * bucket, v: 99 }], start, bucket, 2)
    expect(out).toEqual([null, null])
  })
})

describe('buildTempHistory', () => {
  const now = Date.parse('2025-01-02T00:00:00Z')
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString()

  const series = [
    [
      { entity_id: 'sensor.in', state: '70', last_changed: hoursAgo(23) },
      { state: '73', last_changed: hoursAgo(4) },
    ],
    [
      { entity_id: 'sensor.out', state: '50', last_changed: hoursAgo(23) },
      { state: '44', last_changed: hoursAgo(2) },
    ],
  ]
  const picks = { indoor: 'sensor.in', outdoor: 'sensor.out' }
  const names = { indoor: 'Inside', outdoor: 'Outside' }

  it('produces a full 24h grid of half-hour buckets', () => {
    const h = buildTempHistory(series, picks, names, '°F', now)
    expect(h.available).toBe(true)
    expect(h.hours).toBe(24)
    expect(h.points).toHaveLength(48)
    expect(h.points[0].t).toBe(Math.round((now - 24 * 3600_000) / 1000))
  })

  it('reports the latest value of each series, rounded to whole degrees', () => {
    const h = buildTempHistory(series, picks, names, '°F', now)
    expect(h.indoorNow).toBe(73)
    expect(h.outdoorNow).toBe(44)
    expect(h.unit).toBe('°F')
    expect(h.indoorName).toBe('Inside')
  })

  it('handles a missing outdoor series without failing', () => {
    const h = buildTempHistory(
      [series[0]],
      { indoor: 'sensor.in', outdoor: null },
      names,
      '°F',
      now
    )
    expect(h.available).toBe(true)
    expect(h.outdoorNow).toBeNull()
    expect(h.points.every((p) => p.outdoor === null)).toBe(true)
  })

  it('marks itself unavailable when no readings came back', () => {
    const h = buildTempHistory([], picks, names, '°F', now)
    expect(h.available).toBe(false)
    expect(h.indoorNow).toBeNull()
  })

  it('skips rows with unparseable states', () => {
    const bad = [
      [
        { entity_id: 'sensor.in', state: 'unavailable', last_changed: hoursAgo(5) },
        { state: '71', last_changed: hoursAgo(1) },
      ],
    ]
    const h = buildTempHistory(bad, { indoor: 'sensor.in', outdoor: null }, names, '°F', now)
    expect(h.indoorNow).toBe(71)
  })
})

describe('fetchHomeAssistant', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    _resetCache()
    process.env.HOMEASSISTANT_URL = 'http://ha.local:8123'
    process.env.HOMEASSISTANT_TOKEN = 'test-token'
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.HOMEASSISTANT_URL
    delete process.env.HOMEASSISTANT_TOKEN
  })

  it('returns unconfigured summary without env vars', async () => {
    delete process.env.HOMEASSISTANT_TOKEN
    const summary = await fetchHomeAssistant()
    expect(summary.configured).toBe(false)
    expect(summary.reachable).toBe(false)
    expect(summary.devices).toEqual([])
  })

  // States and history are separate endpoints; route the mock by URL so each test
  // can fail one without accidentally failing the other.
  const HISTORY = [
    [
      {
        entity_id: 'sensor.aqara_temperature',
        state: '72',
        last_changed: new Date().toISOString(),
      },
    ],
  ]
  function mockHa({ states = true, history = true } = {}) {
    const fetchMock = vi.fn(async (url: string) => {
      const isHistory = url.includes('/api/history/')
      if (isHistory && !history) throw new Error('history down')
      if (!isHistory && !states) throw new Error('states down')
      return { ok: true, json: async () => (isHistory ? HISTORY : FIXTURE) }
    })
    global.fetch = fetchMock as unknown as typeof fetch
    return fetchMock
  }
  const statesCalls = (m: ReturnType<typeof mockHa>) =>
    m.mock.calls.filter(([u]) => !String(u).includes('/api/history/')).length

  it('fetches states with a bearer token and builds the summary', async () => {
    const fetchMock = mockHa()

    const summary = await fetchHomeAssistant()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://ha.local:8123/api/states',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      })
    )
    expect(summary.configured).toBe(true)
    expect(summary.reachable).toBe(true)
    expect(summary.lightsTotal).toBe(3)
  })

  it('fetches temperature history for the detected sensors', async () => {
    const fetchMock = mockHa()

    const summary = await fetchHomeAssistant()
    const historyUrl = fetchMock.mock.calls
      .map(([u]) => String(u))
      .find((u) => u.includes('/api/history/'))

    expect(historyUrl).toContain('filter_entity_id=sensor.aqara_temperature')
    expect(summary.temps.available).toBe(true)
    expect(summary.temps.indoorNow).toBe(72)
  })

  it('still returns the schedule when only the history call fails', async () => {
    mockHa({ history: false })

    const summary = await fetchHomeAssistant()
    expect(summary.reachable).toBe(true)
    expect(summary.lightsTotal).toBe(3)
    expect(summary.temps.available).toBe(false)
  })

  it('serves cached data within the TTL', async () => {
    const fetchMock = mockHa()

    await fetchHomeAssistant()
    await fetchHomeAssistant()
    expect(statesCalls(fetchMock)).toBe(1)
  })

  it('falls back to last-good data flagged unreachable on failure', async () => {
    const fetchMock = mockHa()
    const first = await fetchHomeAssistant()
    expect(first.reachable).toBe(true)

    // Advance past the cache TTL so the second call actually re-fetches (and fails)
    fetchMock.mockRejectedValue(new Error('connection refused'))
    vi.useFakeTimers()
    vi.advanceTimersByTime(21_000)
    const second = await fetchHomeAssistant()
    vi.useRealTimers()

    expect(second.reachable).toBe(false)
    expect(second.lightsTotal).toBe(3)
  })

  it('returns an empty reachable=false summary when configured but down with no cache', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('connection refused')) as unknown as typeof fetch

    const summary = await fetchHomeAssistant()
    expect(summary.configured).toBe(true)
    expect(summary.reachable).toBe(false)
    expect(summary.devices).toEqual([])
  })
})
