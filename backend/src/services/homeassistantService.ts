import { HomeAssistantSummary, HomeDevice, HomeSensor, TempHistory } from '../types/index.js'

const HA_URL = () => (process.env.HOMEASSISTANT_URL || '').replace(/\/+$/, '')
const HA_TOKEN = () => process.env.HOMEASSISTANT_TOKEN || ''
const INDOOR_ENTITY = () => process.env.HOMEASSISTANT_INDOOR_TEMP_ENTITY || ''
const OUTDOOR_ENTITY = () => process.env.HOMEASSISTANT_OUTDOOR_TEMP_ENTITY || ''

const CACHE_TTL_MS = 20 * 1000

// History moves slowly and is the expensive call — poll it far less often than states
const HISTORY_TTL_MS = 5 * 60 * 1000
const HISTORY_HOURS = 24
const BUCKET_MS = 30 * 60 * 1000
const BUCKET_COUNT = (HISTORY_HOURS * 60 * 60 * 1000) / BUCKET_MS

interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
}

interface CacheEntry {
  data: HomeAssistantSummary
  fetchedAt: number
}

let cache: CacheEntry | null = null
let lastGood: HomeAssistantSummary | null = null
let historyCache: { data: TempHistory; fetchedAt: number } | null = null

export function _resetCache() {
  cache = null
  lastGood = null
  historyCache = null
}

/** Domains surfaced as devices on the dashboard */
const DEVICE_DOMAINS = new Set([
  'light',
  'switch',
  'media_player',
  'climate',
  'lock',
  'cover',
  'fan',
  'vacuum',
])

/**
 * Entities that aren't real devices worth listing — Hue exposes one switch per bridge-side
 * behaviour (all permanently "on"), the Sync Box exposes format settings, and Pi-hole already
 * has its own widget and footer line. HA only reports entity_category in the registry
 * (not in /api/states), so match by id.
 */
const NOISE_RE = /^switch\.(hue_bridge_automation_|sync_box_dolby_vision|pi_hole$)/

/** binary_sensor device_classes worth showing (doors, motion, leaks…) */
const BINARY_CLASSES = new Set([
  'door',
  'window',
  'garage_door',
  'opening',
  'motion',
  'occupancy',
  'presence',
  'moisture',
  'smoke',
  'lock',
])

/** States that mean "this device is doing its thing" per domain */
function isActive(domain: string, state: string): boolean {
  switch (domain) {
    case 'media_player':
      // A powered-on player counts as active even when it isn't playing, so anything
      // reading "ON" sorts to the top of the schedule
      return state === 'playing' || state === 'paused' || state === 'on'
    case 'lock':
      return state === 'unlocked'
    case 'cover':
      return state === 'open' || state === 'opening'
    case 'climate':
      return state !== 'off' && state !== 'unavailable' && state !== 'unknown'
    case 'vacuum':
      return state === 'cleaning' || state === 'returning'
    default:
      return state === 'on'
  }
}

function prettifyEntityId(entityId: string): string {
  const slug = entityId.split('.')[1] ?? entityId
  return slug
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function friendlyName(entity: HAState): string {
  const name = entity.attributes.friendly_name
  return typeof name === 'string' && name.trim() ? name.trim() : prettifyEntityId(entity.entity_id)
}

function domainOf(entityId: string): string {
  return entityId.split('.')[0] ?? ''
}

function isUnavailable(state: string): boolean {
  return state === 'unavailable' || state === 'unknown'
}

/**
 * What kind of media player this is. HA sets device_class for TVs but leaves AirPlay
 * speakers (HomePods) blank, so fall back to the volume/track attributes only a speaker has.
 */
function mediaKind(entity: HAState): string | null {
  const attrs = entity.attributes
  const cls = typeof attrs.device_class === 'string' ? attrs.device_class : ''
  if (cls === 'tv') return 'tv'
  if (cls === 'speaker') return 'speaker'
  if ('volume_level' in attrs || 'media_artist' in attrs) return 'speaker'
  return null
}

function deviceDetail(domain: string, entity: HAState): string | undefined {
  const attrs = entity.attributes
  if (domain === 'light' && entity.state === 'on' && typeof attrs.brightness === 'number') {
    return `${Math.round((attrs.brightness / 255) * 100)}%`
  }
  if (domain === 'media_player') {
    const title = typeof attrs.media_title === 'string' ? attrs.media_title : ''
    const app = typeof attrs.app_name === 'string' ? attrs.app_name : ''
    if (entity.state === 'playing' || entity.state === 'paused') {
      return title || app || mediaKind(entity) || undefined
    }
    // Idle players show what they are, which also tells a HomePod named "Kitchen"
    // apart from the Hue room light of the same name
    return mediaKind(entity) ?? undefined
  }
  if (domain === 'climate' && typeof attrs.current_temperature === 'number') {
    return `${attrs.current_temperature}°`
  }
  if (domain === 'cover' && typeof attrs.current_position === 'number') {
    return `${attrs.current_position}%`
  }
  return undefined
}

// ── Rooms ──

/**
 * HA's REST `/api/states` doesn't expose areas (they live in the entity registry, which is
 * websocket-only), but the Hue integration names each room's group light with a doubled slug
 * — `light.kitchen_kitchen`, `light.living_room_living_room`. Those give us the room slugs,
 * and every other entity prefixed with one belongs to that room.
 */
export function detectRooms(states: HAState[]): { slug: string; label: string }[] {
  const rooms: { slug: string; label: string }[] = []
  for (const s of states) {
    if (!s.entity_id.startsWith('light.')) continue
    const slug = s.entity_id.slice('light.'.length)
    const half = (slug.length - 1) / 2
    if (!Number.isInteger(half)) continue
    const head = slug.slice(0, half)
    if (head && slug === `${head}_${head}`) {
      rooms.push({ slug: head, label: friendlyName(s) })
    }
  }
  // Longest first so "living_room" wins over a hypothetical "living"
  return rooms.sort((a, b) => b.slug.length - a.slug.length)
}

function roomOf(entityId: string, rooms: { slug: string; label: string }[]): string | null {
  const slug = entityId.slice(entityId.indexOf('.') + 1)
  for (const room of rooms) {
    if (slug === room.slug || slug.startsWith(`${room.slug}_`)) return room.label
  }
  return null
}

// ── Fixture grouping ──

/** Trailing side markers on paired fixtures: "TV Light L" / "TV Light R" */
const SIDE_RE = /\s+(l|r|left|right)$/i

/**
 * Hue publishes a room/zone light *and* each bulb in it, so a wall switch that drives four
 * synced bulbs shows up as five near-identical rows. Collapse the redundancy:
 *
 *  - drop `light.kitchen_kitchen_2` when `light.kitchen_kitchen` also exists (numbered members
 *    of a group entity that is already listed)
 *  - merge fixtures whose names differ only by a trailing L/R into one row
 *
 * Named members of a room ("Sofa Light" in "Living room") are left alone — they're separately
 * controllable, so they're genuinely worth their own line.
 */
export function groupDevices(devices: HomeDevice[]): HomeDevice[] {
  const lightIds = new Set(devices.filter((d) => d.domain === 'light').map((d) => d.id))

  const withoutMembers = devices.filter((d) => {
    if (d.domain !== 'light') return true
    const parent = d.id.match(/^(.*)_\d+$/)?.[1]
    return !(parent && lightIds.has(parent))
  })

  // Merge left/right pairs into a single fixture
  const pairs = new Map<string, HomeDevice[]>()
  const out: HomeDevice[] = []
  for (const d of withoutMembers) {
    const base = d.domain === 'light' && SIDE_RE.test(d.name) ? d.name.replace(SIDE_RE, '') : null
    if (!base) {
      out.push(d)
      continue
    }
    const key = `${d.domain}:${base.toLowerCase()}`
    const list = pairs.get(key)
    if (list) list.push(d)
    else pairs.set(key, [d])
  }

  for (const members of pairs.values()) {
    if (members.length === 1) {
      out.push(members[0])
      continue
    }
    const base = members[0].name.replace(SIDE_RE, '')
    const on = members.filter((m) => m.active).length
    const allUnavailable = members.every((m) => m.unavailable)
    out.push({
      id: members.map((m) => m.id).sort()[0],
      name: base,
      domain: members[0].domain,
      state: allUnavailable
        ? 'unavailable'
        : on === 0
          ? 'off'
          : on === members.length
            ? 'on'
            : `${on}/${members.length} on`,
      active: on > 0,
      unavailable: allUnavailable,
      detail: `${members.length} fixtures`,
      room: members[0].room,
    })
  }

  return out
}

// ── Interior vs exterior temperature history ──

const OUTDOOR_RE = /outdoor|outside|exterior|patio|yard|garden|balcony|porch|deck/i
const INDOOR_RE = /indoor|inside|interior|living|bedroom|kitchen|office|hallway|room|house|aqara/i
/** Forecast-service sensors report outdoor conditions no matter what they're named */
const WEATHER_PROVIDER_RE =
  /pirate_?weather|open_?weather|accu_?weather|met_?no|dark_?sky|tomorrow_?io|weatherbit|weather|forecast/i

function tempSensors(states: HAState[]): HAState[] {
  return states.filter(
    (s) =>
      s.entity_id.startsWith('sensor.') &&
      s.attributes.device_class === 'temperature' &&
      Number.isFinite(Number.parseFloat(s.state))
  )
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Choose which sensors feed the thermal profile. Explicit env overrides win; otherwise
 * guess from entity/friendly names, since HA installs name these very inconsistently.
 *
 * The strongest signal is a sibling pair from one device ("W100 Outdoor Temperature" /
 * "W100 Temperature"), so that is tried before keyword matching — a keyword pass alone
 * mistakes a forecast sensor for the indoor reading when the indoor one is named plainly.
 */
export function pickTempEntities(states: HAState[]): {
  indoor: string | null
  outdoor: string | null
} {
  const candidates = tempSensors(states)
  const nameOf = (s: HAState) =>
    typeof s.attributes.friendly_name === 'string' && s.attributes.friendly_name.trim()
      ? s.attributes.friendly_name
      : s.entity_id
  const label = (s: HAState) => `${s.entity_id} ${nameOf(s)}`
  const isProvider = (s: HAState) => WEATHER_PROVIDER_RE.test(label(s))

  const envIn = INDOOR_ENTITY().trim()
  const envOut = OUTDOOR_ENTITY().trim()

  const outdoor =
    envOut ||
    candidates.find((s) => OUTDOOR_RE.test(label(s)))?.entity_id ||
    candidates.find(isProvider)?.entity_id ||
    null

  // The indoor counterpart of "<device> Outdoor Temperature" is "<device> Temperature"
  const outdoorEntity = candidates.find((s) => s.entity_id === outdoor)
  const siblingKey = outdoorEntity ? normalize(nameOf(outdoorEntity).replace(OUTDOOR_RE, '')) : null

  const usable = candidates.filter((s) => s.entity_id !== outdoor && !isProvider(s))

  const indoor =
    envIn ||
    (siblingKey ? usable.find((s) => normalize(nameOf(s)) === siblingKey)?.entity_id : null) ||
    usable.find((s) => INDOOR_RE.test(label(s)))?.entity_id ||
    usable[0]?.entity_id ||
    null

  return { indoor, outdoor }
}

interface Reading {
  t: number // ms
  v: number
}

/**
 * Resample sparse readings onto a fixed grid. HA only records on change, so buckets
 * with no reading carry the previous value forward; readings before the window seed it.
 */
export function bucketReadings(
  readings: Reading[],
  startMs: number,
  bucketMs: number,
  count: number
): (number | null)[] {
  const sums = new Array<number>(count).fill(0)
  const hits = new Array<number>(count).fill(0)
  let seed: number | null = null

  for (const r of readings) {
    const idx = Math.floor((r.t - startMs) / bucketMs)
    if (idx < 0) {
      seed = r.v // most recent reading before the window starts
      continue
    }
    if (idx >= count) continue
    sums[idx] += r.v
    hits[idx] += 1
  }

  const out = new Array<number | null>(count).fill(null)
  let carry = seed
  for (let i = 0; i < count; i++) {
    if (hits[i] > 0) carry = sums[i] / hits[i]
    // Whole degrees — sensor precision below 1° is noise at dashboard scale
    out[i] = carry === null ? null : Math.round(carry)
  }
  return out
}

/** HA history rows: first entry of each series carries entity_id, the rest are minimal */
type HistoryRow = {
  entity_id?: string
  state: string
  last_changed?: string
  last_updated?: string
}

export function parseHistorySeries(series: HistoryRow[][]): Map<string, Reading[]> {
  const byEntity = new Map<string, Reading[]>()
  for (const rows of series) {
    if (!Array.isArray(rows) || rows.length === 0) continue
    const entityId = rows[0].entity_id
    if (!entityId) continue
    const readings: Reading[] = []
    for (const row of rows) {
      const v = Number.parseFloat(row.state)
      if (!Number.isFinite(v)) continue
      const stamp = row.last_changed ?? row.last_updated
      const t = stamp ? Date.parse(stamp) : NaN
      if (!Number.isFinite(t)) continue
      readings.push({ t, v })
    }
    readings.sort((a, b) => a.t - b.t)
    byEntity.set(entityId, readings)
  }
  return byEntity
}

export function buildTempHistory(
  series: HistoryRow[][],
  picks: { indoor: string | null; outdoor: string | null },
  names: { indoor: string | null; outdoor: string | null },
  unit: string,
  nowMs: number
): TempHistory {
  const startMs = nowMs - HISTORY_HOURS * 60 * 60 * 1000
  const byEntity = parseHistorySeries(series)

  const indoorRaw = picks.indoor ? (byEntity.get(picks.indoor) ?? []) : []
  const outdoorRaw = picks.outdoor ? (byEntity.get(picks.outdoor) ?? []) : []

  const indoor = bucketReadings(indoorRaw, startMs, BUCKET_MS, BUCKET_COUNT)
  const outdoor = bucketReadings(outdoorRaw, startMs, BUCKET_MS, BUCKET_COUNT)

  const points = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    t: Math.round((startMs + i * BUCKET_MS) / 1000),
    indoor: indoor[i],
    outdoor: outdoor[i],
  }))

  const last = (arr: (number | null)[]) => [...arr].reverse().find((v) => v !== null) ?? null

  return {
    available: indoorRaw.length > 0 || outdoorRaw.length > 0,
    indoorName: names.indoor,
    outdoorName: names.outdoor,
    unit,
    hours: HISTORY_HOURS,
    points,
    indoorNow: last(indoor),
    outdoorNow: last(outdoor),
  }
}

export function emptyTempHistory(): TempHistory {
  return {
    available: false,
    indoorName: null,
    outdoorName: null,
    unit: '',
    hours: HISTORY_HOURS,
    points: [],
    indoorNow: null,
    outdoorNow: null,
  }
}

async function fetchTempHistory(states: HAState[]): Promise<TempHistory> {
  if (historyCache && Date.now() - historyCache.fetchedAt < HISTORY_TTL_MS) {
    return historyCache.data
  }

  const picks = pickTempEntities(states)
  const ids = [picks.indoor, picks.outdoor].filter((id): id is string => !!id)
  if (ids.length === 0) return emptyTempHistory()

  const nowMs = Date.now()
  const start = new Date(nowMs - HISTORY_HOURS * 60 * 60 * 1000).toISOString()
  const params = new URLSearchParams({ filter_entity_id: ids.join(',') })
  // minimal_response + no_attributes keep 24h of readings small enough for the Pi
  const url = `${HA_URL()}/api/history/period/${encodeURIComponent(
    start
  )}?${params}&minimal_response&no_attributes`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${HA_TOKEN()}` },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`Home Assistant history error: ${res.status}`)
  const series = (await res.json()) as HistoryRow[][]

  const nameOf = (id: string | null) => {
    if (!id) return null
    const match = states.find((s) => s.entity_id === id)
    return match ? friendlyName(match) : prettifyEntityId(id)
  }
  const unitOf = (id: string | null) => {
    const match = id ? states.find((s) => s.entity_id === id) : undefined
    const u = match?.attributes.unit_of_measurement
    return typeof u === 'string' ? u : ''
  }

  const data = buildTempHistory(
    series,
    picks,
    { indoor: nameOf(picks.indoor), outdoor: nameOf(picks.outdoor) },
    unitOf(picks.outdoor) || unitOf(picks.indoor) || '°',
    nowMs
  )
  historyCache = { data, fetchedAt: nowMs }
  return data
}

export function buildSummary(states: HAState[]): HomeAssistantSummary {
  const devices: HomeDevice[] = []
  const sensors: HomeSensor[] = []
  const rooms = detectRooms(states)
  // Under a "KITCHEN" heading, a fixture also called "Kitchen" reads as a duplicate —
  // the room group light controls the whole room, so call it that
  const roomGroupIds = new Set(rooms.map((r) => `light.${r.slug}_${r.slug}`))

  for (const entity of states) {
    const domain = domainOf(entity.entity_id)
    const attrs = entity.attributes

    if (NOISE_RE.test(entity.entity_id)) continue

    if (DEVICE_DOMAINS.has(domain)) {
      devices.push({
        id: entity.entity_id,
        name: roomGroupIds.has(entity.entity_id) ? 'All fixtures' : friendlyName(entity),
        domain,
        state: entity.state,
        active: !isUnavailable(entity.state) && isActive(domain, entity.state),
        unavailable: isUnavailable(entity.state),
        detail: deviceDetail(domain, entity),
        room: roomOf(entity.entity_id, rooms),
      })
      continue
    }

    if (domain === 'binary_sensor') {
      const cls = typeof attrs.device_class === 'string' ? attrs.device_class : ''
      if (!BINARY_CLASSES.has(cls)) continue
      devices.push({
        id: entity.entity_id,
        name: friendlyName(entity),
        domain,
        state: entity.state,
        active: entity.state === 'on',
        unavailable: isUnavailable(entity.state),
        detail: cls,
        room: roomOf(entity.entity_id, rooms),
      })
      continue
    }

    if (domain === 'sensor') {
      const cls = typeof attrs.device_class === 'string' ? attrs.device_class : ''
      if (cls !== 'temperature' && cls !== 'humidity' && cls !== 'battery') continue
      const value = Number.parseFloat(entity.state)
      if (!Number.isFinite(value)) continue
      sensors.push({
        id: entity.entity_id,
        name: friendlyName(entity),
        kind: cls,
        // Whole degrees and whole percent — sub-unit precision is noise at dashboard scale
        value: Math.round(value),
        unit:
          typeof attrs.unit_of_measurement === 'string'
            ? attrs.unit_of_measurement
            : cls === 'battery'
              ? '%'
              : '',
      })
    }
  }

  const grouped = groupDevices(devices)
  devices.length = 0
  devices.push(...grouped)

  // Grouped by room, rooms with something switched on first so a trimmed list keeps the
  // interesting kit. Within a room: active, then idle, then faulty. Roomless gear last.
  const roomKey = (d: HomeDevice) => d.room ?? '￿'
  const roomsWithActivity = new Set(devices.filter((d) => d.active).map(roomKey))
  devices.sort((a, b) => {
    const roomRank = (d: HomeDevice) =>
      `${roomsWithActivity.has(roomKey(d)) ? 0 : 1}${d.room === null ? 1 : 0}${roomKey(d)}`
    const tier = (d: HomeDevice) => (d.active ? 0 : d.unavailable ? 2 : 1)
    return (
      roomRank(a).localeCompare(roomRank(b)) || tier(a) - tier(b) || a.name.localeCompare(b.name)
    )
  })

  // The readout strip is a fixed, labelled set — interior/exterior temperature then the
  // matching humidities — rather than whatever HA happens to name its entities. Humidity
  // comes from the same device as its temperature (…_temperature → …_humidity).
  const picks = pickTempEntities(states)
  const humidityCounterpart = (tempId: string | null) =>
    tempId && /_temperature$/.test(tempId) ? tempId.replace(/_temperature$/, '_humidity') : null

  const curated: { id: string | null; label: string }[] = [
    { id: picks.indoor, label: 'Interior' },
    { id: picks.outdoor, label: 'Exterior' },
    { id: humidityCounterpart(picks.indoor), label: 'Interior RH' },
    { id: humidityCounterpart(picks.outdoor), label: 'Exterior RH' },
  ]

  const byId = new Map(sensors.map((s) => [s.id, s]))
  const front: HomeSensor[] = []
  for (const { id, label } of curated) {
    const match = id ? byId.get(id) : undefined
    if (!match) continue
    front.push({ ...match, name: label })
    byId.delete(id!)
  }

  // Anything left over keeps its own name; low batteries first since they need action
  const rest = [...byId.values()].sort(
    (a, b) =>
      (a.kind === 'battery' ? 0 : 1) - (b.kind === 'battery' ? 0 : 1) ||
      (a.kind === 'battery' ? a.value - b.value : a.name.localeCompare(b.name))
  )
  sensors.length = 0
  sensors.push(...front, ...rest)

  const lights = devices.filter((d) => d.domain === 'light')

  return {
    configured: true,
    reachable: true,
    lightsOn: lights.filter((d) => d.active).length,
    lightsTotal: lights.length,
    devices: devices.slice(0, 32),
    sensors: sensors.slice(0, 16),
    unavailableCount: devices.filter((d) => d.unavailable).length,
    temps: emptyTempHistory(),
    updatedAt: new Date().toISOString(),
  }
}

function emptySummary(configured: boolean): HomeAssistantSummary {
  return {
    configured,
    reachable: false,
    lightsOn: 0,
    lightsTotal: 0,
    devices: [],
    sensors: [],
    unavailableCount: 0,
    temps: emptyTempHistory(),
    updatedAt: new Date().toISOString(),
  }
}

export async function fetchHomeAssistant(): Promise<HomeAssistantSummary> {
  if (!HA_URL() || !HA_TOKEN()) return emptySummary(false)

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data
  }

  try {
    const res = await fetch(`${HA_URL()}/api/states`, {
      headers: { Authorization: `Bearer ${HA_TOKEN()}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Home Assistant API error: ${res.status}`)
    const states = (await res.json()) as HAState[]

    const data = buildSummary(states)

    // The thermal profile is a bonus panel — a history failure must not blank the schedule
    try {
      data.temps = await fetchTempHistory(states)
    } catch (err) {
      console.error('[GBoard API] Home Assistant history fetch failed:', err)
      data.temps = historyCache?.data ?? emptyTempHistory()
    }

    cache = { data, fetchedAt: Date.now() }
    lastGood = data
    return data
  } catch (err) {
    if (lastGood) return { ...lastGood, reachable: false }
    console.error('[GBoard API] Home Assistant fetch failed:', err)
    return emptySummary(true)
  }
}
