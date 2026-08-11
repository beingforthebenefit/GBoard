import { HomeAssistantSummary, HomeDevice, HomeSensor } from '../../types/index.js'

// Schedule "mark" glyphs, loosely after real electrical-plan symbols
// (⊗ is the drafting symbol for a luminaire; S for a switch)
const DOMAIN_MARKS: Record<string, string> = {
  light: '⊗',
  switch: 'S',
  media_player: '▸',
  climate: 'T',
  lock: 'K',
  cover: 'C',
  fan: 'F',
  vacuum: 'V',
  binary_sensor: '◇',
}

const MAX_ROWS = 20

function statusLabel(d: HomeDevice): string {
  if (d.unavailable) return 'FAULT'
  return d.state.replace(/_/g, ' ').toUpperCase()
}

function statusColor(d: HomeDevice): string {
  if (d.unavailable) return 'var(--bp-red)'
  return d.active ? 'var(--bp-bright)' : 'var(--bp-ink3)'
}

type Row =
  | { kind: 'room'; key: string; label: string; on: number; total: number }
  | {
      kind: 'device'
      key: string
      mark: string
      label: string
      detail?: string
      status: string
      color: string
      strong: boolean
    }

function toRow(d: HomeDevice): Row {
  return {
    kind: 'device',
    key: d.id,
    mark: DOMAIN_MARKS[d.domain] ?? '□',
    label: d.name,
    detail: d.detail,
    status: statusLabel(d),
    color: statusColor(d),
    strong: d.active,
  }
}

/** Devices arrive room-sorted; insert a heading each time the room changes */
function toRows(devices: HomeDevice[]): Row[] {
  const rows: Row[] = []
  let currentRoom: string | null | undefined
  for (const d of devices) {
    const room = d.room ?? null
    if (room !== currentRoom) {
      currentRoom = room
      const inRoom = devices.filter((x) => (x.room ?? null) === room)
      rows.push({
        kind: 'room',
        key: `room:${room ?? '__none__'}`,
        label: room ?? 'Elsewhere',
        on: inRoom.filter((x) => x.active).length,
        total: inRoom.length,
      })
    }
    rows.push(toRow(d))
  }
  return rows
}

/**
 * Deal the rows into `parts` columns, cutting at room headings rather than mid-room so a
 * room's fixtures stay under their own heading. Falls back to an even cut if a column would
 * otherwise have no boundary to break at.
 */
export function splitAtRooms(rows: Row[], parts: number): Row[][] {
  if (parts <= 1) return [rows]
  const boundaries = rows.flatMap((r, i) => (i > 0 && r.kind === 'room' ? [i] : []))

  const chunks: Row[][] = []
  let start = 0
  for (let k = 1; k < parts; k++) {
    // Re-aim after every cut: spreading what's *left* over the columns still to come
    // keeps a small first room from leaving one column near-empty and another overfull
    const target = start + Math.round((rows.length - start) / (parts - k + 1))
    const free = boundaries.filter((b) => b > start)
    if (free.length === 0) break
    const cut = free.reduce((best, i) =>
      Math.abs(i - target) < Math.abs(best - target) ? i : best
    )
    chunks.push(rows.slice(start, cut))
    start = cut
  }
  chunks.push(rows.slice(start))
  return chunks
}

function ScheduleTable({ rows }: { rows: Row[] }) {
  return (
    <div className="min-w-0">
      <div
        className="grid grid-cols-[18px_1fr_auto] gap-x-2 text-[9px] tracking-[0.2em] border-b pb-1"
        style={{ color: 'var(--bp-ink3)', borderColor: 'var(--bp-line)' }}
      >
        <span>MK</span>
        <span>DESCRIPTION</span>
        <span className="text-right">STATUS</span>
      </div>
      {rows.map((r) =>
        r.kind === 'room' ? (
          <div
            key={r.key}
            className="flex items-baseline justify-between gap-2 border-b pt-1.5 pb-[1px] text-[9px] tracking-[0.25em] uppercase"
            style={{ color: 'var(--bp-ink2)', borderColor: 'var(--bp-line)' }}
          >
            <span className="truncate">{r.label}</span>
            <span
              className="tabular-nums"
              style={{ color: r.on > 0 ? 'var(--bp-bright)' : 'var(--bp-ink3)' }}
            >
              {r.on}/{r.total}
            </span>
          </div>
        ) : (
          <div
            key={r.key}
            className="grid grid-cols-[18px_1fr_auto] gap-x-2 items-baseline border-b py-[2px] text-[11px]"
            style={{ borderColor: 'var(--bp-line-soft)' }}
          >
            <span style={{ color: 'var(--bp-ink3)' }}>{r.mark}</span>
            <span
              className="truncate uppercase tracking-[0.06em]"
              style={{ color: 'var(--bp-ink)' }}
            >
              {r.label}
              {r.detail && (
                <span style={{ color: 'var(--bp-ink3)' }}> — {r.detail.toUpperCase()}</span>
              )}
            </span>
            <span
              className="text-right tabular-nums tracking-[0.1em]"
              style={{ color: r.color, fontWeight: r.strong ? 600 : 400 }}
            >
              {r.status}
            </span>
          </div>
        )
      )}
    </div>
  )
}

function SensorReadout({ sensor }: { sensor: HomeSensor }) {
  const lowBattery = sensor.kind === 'battery' && sensor.value <= 25
  return (
    <div className="min-w-0">
      <div
        className="text-xl leading-none tabular-nums"
        style={{ color: lowBattery ? 'var(--bp-red)' : 'var(--bp-bright)' }}
      >
        {sensor.value}
        <span className="text-[10px] ml-0.5" style={{ color: 'var(--bp-ink3)' }}>
          {sensor.unit}
        </span>
      </div>
      <div
        className="text-[9px] tracking-[0.15em] uppercase truncate mt-1"
        style={{ color: 'var(--bp-ink3)' }}
      >
        {lowBattery && <span style={{ color: 'var(--bp-red)' }}>▲ </span>}
        {sensor.name}
      </div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border border-dashed px-3 py-2.5 text-[11px] leading-relaxed tracking-[0.08em]"
      style={{ borderColor: 'var(--bp-line)', color: 'var(--bp-ink2)' }}
    >
      {children}
    </div>
  )
}

interface Props {
  data: HomeAssistantSummary | null
  loading: boolean
  /** Continue the schedule across this many columns (for full-width panels) */
  columns?: 1 | 2 | 3
}

/** Home Assistant device statuses drafted as an electrical/systems schedule table */
export function SystemsSchedule({ data, loading, columns = 1 }: Props) {
  if (loading && !data) {
    return <Note>POLLING FIELD INSTRUMENTS…</Note>
  }

  if (!data || !data.configured) {
    return (
      <Note>
        <span style={{ color: 'var(--bp-red)' }}>NOTE 1 —</span> FIELD TELEMETRY NOT CONNECTED.
        ISSUE A LONG-LIVED ACCESS TOKEN (HOME ASSISTANT ▸ PROFILE ▸ SECURITY) AND ENTER IT UNDER
        ADMIN ▸ ADVANCED SETTINGS ▸ HOME ASSISTANT.
      </Note>
    )
  }

  if (!data.reachable && data.devices.length === 0) {
    return (
      <Note>
        <span style={{ color: 'var(--bp-red)' }}>LINK DOWN —</span> HOME ASSISTANT DID NOT ANSWER
        THE LAST SURVEY. CHECK THE CONTROLLER AND ACCESS TOKEN.
      </Note>
    )
  }

  // Devices arrive room-sorted with busy rooms first, so a cap only trims quiet kit
  const shown = data.devices.slice(0, MAX_ROWS)
  const omitted = data.devices.length - shown.length
  const rows = toRows(shown)

  // Don't spread a short list thinly across every available column
  const cols = Math.max(1, Math.min(columns, Math.ceil(rows.length / 4)))
  const chunks = splitAtRooms(rows, cols)

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      {/* Summary line */}
      <div
        className="flex items-baseline justify-between text-[10px] tracking-[0.18em]"
        style={{ color: 'var(--bp-ink2)' }}
      >
        <span>
          LUMINAIRES{' '}
          <span style={{ color: 'var(--bp-bright)' }}>
            {data.lightsOn}/{data.lightsTotal}
          </span>{' '}
          ENERGIZED
        </span>
        <span>
          {data.unavailableCount > 0 && (
            <span style={{ color: 'var(--bp-red)' }}>{data.unavailableCount} FAULT · </span>
          )}
          <span style={{ color: data.reachable ? 'var(--bp-ink2)' : 'var(--bp-red)' }}>
            LINK {data.reachable ? 'OK' : 'DOWN'}
          </span>
        </span>
      </div>

      {/* Site readings — interior/exterior temperature and humidity */}
      {data.sensors.length > 0 && (
        <div
          className={`grid gap-2 border-y py-2 ${columns > 1 ? 'grid-cols-4' : 'grid-cols-3'}`}
          style={{ borderColor: 'var(--bp-line-soft)' }}
        >
          {data.sensors.slice(0, columns > 1 ? 4 : 3).map((s) => (
            <SensorReadout key={s.id} sensor={s} />
          ))}
        </div>
      )}

      {/* The schedule table, continued into further columns when there's width for it */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          className="grid gap-x-5"
          style={{ gridTemplateColumns: `repeat(${chunks.length}, minmax(0, 1fr))` }}
        >
          {chunks.map((chunk, i) => (
            <ScheduleTable key={i} rows={chunk} />
          ))}
        </div>
        {omitted > 0 && (
          <div className="text-[9px] tracking-[0.2em] pt-1" style={{ color: 'var(--bp-ink3)' }}>
            + {omitted} FURTHER ITEMS NOT SHOWN
          </div>
        )}
      </div>
    </div>
  )
}
