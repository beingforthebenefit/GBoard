import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WeatherData,
  CalendarEvent,
  PlexSession,
  UpcomingItem,
  WeatherForecastHour,
} from '../../types/index.js'
import { PiholeStats } from '../../hooks/usePihole.js'
import { useSoberCounter } from '../../hooks/useSoberCounter.js'
import { useClock } from '../../hooks/useClock.js'
import { useAvailableHeight } from '../../hooks/useAvailableHeight.js'
import { getAstrologySnapshot } from '../../utils/astrology.js'
import { GlassPanel } from './GlassPanel.js'
import { LayoutProps } from '../index.js'
import { ClassicPhotoBackground } from './ClassicPhotoBackground.js'
import { ClassicRadarWidget } from './ClassicRadarWidget.js'

// ── Clock ──

function ClassicClock() {
  const now = useClock()

  const timeParts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(now)
  const dayPeriod = timeParts.find((part) => part.type === 'dayPeriod')?.value ?? ''
  const timeStr = timeParts
    .filter((part) => part.type !== 'dayPeriod')
    .map((part) => part.value)
    .join('')
    .replace(/\s+/g, '')

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="text-white text-center py-2">
      <div className="text-[clamp(3.6rem,5.9vw,5.5rem)] leading-none font-extralight tracking-[0.04em] tabular-nums drop-shadow-lg whitespace-nowrap inline-block relative">
        <span className="block">{timeStr}</span>
        <span className="text-xl leading-none tracking-normal absolute left-full top-2 ml-2">
          {dayPeriod}
        </span>
      </div>
      <div className="text-[clamp(1.2rem,2vw,1.7rem)] font-light mt-1 text-white/70 drop-shadow-md">
        {dateStr}
      </div>
    </div>
  )
}

// ── Weather ──

function WeatherIcon({
  icon,
  alt = '',
  className = 'w-12 h-12',
}: {
  icon: string
  alt?: string
  className?: string
}) {
  return (
    <img src={`https://openweathermap.org/img/wn/${icon}@2x.png`} alt={alt} className={className} />
  )
}

function formatTime(unix: number): string {
  const d = new Date(unix * 1000)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${m}${ampm}`
}

function formatHourLabel(unix: number): string {
  const d = new Date(unix * 1000)
  const h = d.getHours()
  const ampm = h >= 12 ? 'p' : 'a'
  return `${h % 12 || 12}${ampm}`
}

function ClassicWeather({
  data,
  loading,
  hourlyForecast,
}: {
  data: WeatherData | null
  loading: boolean
  hourlyForecast?: WeatherForecastHour[]
}) {
  if (loading) {
    return (
      <GlassPanel className="p-4 text-white animate-pulse">
        <div className="h-24 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!data) {
    return (
      <GlassPanel className="p-4 text-white/70 min-h-[170px] flex flex-col items-center justify-center gap-2 text-center">
        <div className="text-3xl leading-none">&cloud;</div>
        <p className="text-base font-medium">Weather temporarily unavailable</p>
        <p className="text-sm text-white/50">Retrying automatically...</p>
      </GlassPanel>
    )
  }

  const { current, forecast } = data

  return (
    <GlassPanel className="p-4 text-white flex flex-col gap-2">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center gap-2">
          <WeatherIcon icon={current.icon} alt={current.description} className="w-16 h-16" />
          <div className="text-6xl font-light leading-none">{current.temp}&deg;</div>
        </div>
        <div className="text-white/70 capitalize text-base text-center">{current.description}</div>
      </div>
      <div className="text-sm text-white/60 flex justify-center gap-x-3 text-center">
        <span>Feels {current.feelsLike}&deg;</span>
        <span>{current.humidity}%</span>
        <span>
          {current.windSpeed} mph {current.windDirection}
          {current.windGust != null && ` (${current.windGust}g)`}
        </span>
      </div>
      <div className="text-xs text-white/45 flex justify-center gap-x-3 text-center tabular-nums">
        <span>Dew {current.dewPoint}&deg;</span>
        <span>{current.pressure} hPa</span>
        <span>Vis {current.visibility} mi</span>
      </div>
      <div className="flex justify-center gap-x-4 text-sm text-white/50 tabular-nums">
        <span>&sun; {formatTime(current.sunrise)}</span>
        <span>&moon; {formatTime(current.sunset)}</span>
      </div>
      <div className="flex justify-between pt-1 border-t border-white/10">
        {forecast.slice(0, 5).map((day, i) => {
          const label =
            i === 0
              ? 'Today'
              : new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                })
          return (
            <div key={day.date} className="text-center">
              <div className="text-white/70 text-xs font-medium">{label}</div>
              <WeatherIcon icon={day.icon} alt={day.description} className="w-8 h-8 mx-auto" />
              <div className="text-xs">
                <span className="font-medium">{day.high}&deg;</span>
                <span className="text-white/40"> {day.low}&deg;</span>
              </div>
            </div>
          )
        })}
      </div>
      {hourlyForecast && hourlyForecast.length > 0 && (
        <div className="flex justify-between pt-1 border-t border-white/10">
          {hourlyForecast.slice(0, 6).map((hour) => (
            <div key={hour.time} className="text-center">
              <div className="text-white/50 text-xs">{formatHourLabel(hour.time)}</div>
              <WeatherIcon icon={hour.icon} className="w-7 h-7 mx-auto" />
              <div className="text-xs font-medium">{hour.temp}&deg;</div>
              {hour.pop > 0 && <div className="text-[10px] text-blue-300/60">{hour.pop}%</div>}
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  )
}

// ── Sober Counter ──

function ClassicSoberCounter({ sobrietyDate }: { sobrietyDate: string }) {
  const { years, months, days, hours } = useSoberCounter(sobrietyDate)
  const cells = [
    { value: years, label: 'YEARS' },
    { value: months, label: 'MONTHS' },
    { value: days, label: 'DAYS' },
    { value: hours, label: 'HOURS' },
  ]

  return (
    <GlassPanel className="p-4">
      <div className="text-center text-white/50 text-sm font-semibold tracking-widest mb-2 uppercase">
        Sober Time
      </div>
      <div className="flex justify-center gap-5">
        {cells.map(({ value, label }) => (
          <div key={label} className="text-center">
            <div className="text-4xl font-light text-white tabular-nums leading-none">{value}</div>
            <div className="text-xs text-white/50 tracking-widest mt-1">{label}</div>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}

// ── Pi-hole ──

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-light text-white tabular-nums leading-none">{value}</div>
      <div className="text-[10px] text-white/45 tracking-wider mt-1 uppercase">{label}</div>
    </div>
  )
}

const COMPACT_THRESHOLD = 140
const FULL_THRESHOLD = 182
const CLIENT_ROW_HEIGHT = 24
const CLIENT_HEADER_HEIGHT = 28

function ClassicPihole({
  data,
  loading,
  className = '',
}: {
  data: PiholeStats | null
  loading: boolean
  className?: string
}) {
  const { ref, height: containerHeight } = useAvailableHeight<HTMLDivElement>()

  if (loading) {
    return (
      <div ref={ref} className={className}>
        <GlassPanel className="p-3 animate-pulse h-full">
          <div className="h-10 bg-white/10 rounded" />
        </GlassPanel>
      </div>
    )
  }

  if (!data) {
    return (
      <div ref={ref} className={className}>
        <GlassPanel className="p-3 text-white/50 text-center h-full">
          <div className="text-sm uppercase tracking-[0.14em] text-white/45">Pi-hole</div>
          <div className="text-xs mt-1">Unavailable</div>
        </GlassPanel>
      </div>
    )
  }

  const statusColor = data.status === 'enabled' ? 'text-green-400' : 'text-red-400'
  const mode =
    containerHeight > 0 && containerHeight < COMPACT_THRESHOLD
      ? 'compact'
      : containerHeight > 0 && containerHeight < FULL_THRESHOLD
        ? 'standard'
        : 'expanded'

  const availableForClients = containerHeight - FULL_THRESHOLD - CLIENT_HEADER_HEIGHT
  const maxClients = Math.max(0, Math.floor(availableForClients / CLIENT_ROW_HEIGHT))
  const showClients = mode === 'expanded' && maxClients > 0 && data.clients.length > 0
  const visibleClients = data.clients.slice(0, maxClients)

  return (
    <div ref={ref} className={className}>
      <GlassPanel className="p-3 text-white h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm uppercase tracking-[0.14em] text-white/45">Pi-hole</div>
          <div className={`text-xs font-medium ${statusColor}`}>
            {data.status === 'enabled' ? '\u25cf Active' : '\u25cb Disabled'}
          </div>
        </div>

        {mode === 'compact' && (
          <div className="flex justify-around">
            <StatCell value={formatNumber(data.blockedLastHour)} label="Blk/hr" />
            <StatCell value={`${data.blockedPercentage.toFixed(1)}%`} label="Blk %" />
          </div>
        )}

        {mode !== 'compact' && (
          <>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <StatCell value={formatNumber(data.blockedLastHour)} label="Blk/hr" />
              <StatCell value={`${data.blockedPercentage.toFixed(1)}%`} label="Blk %" />
              <StatCell value={formatNumber(data.blockedQueries)} label="Blk total" />
              <StatCell value={formatNumber(data.totalQueries)} label="Req total" />
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 text-center">
              <span className="text-xs text-white/40">
                {formatNumber(data.domainsOnBlocklist)} domains on blocklist
              </span>
            </div>
          </>
        )}

        {showClients && (
          <div className="mt-2 pt-2 border-t border-white/10 flex-1 min-h-0">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Clients</div>
            <div className="space-y-0.5">
              {visibleClients.map((client) => (
                <div
                  key={client.ip}
                  className="flex items-center justify-between text-xs leading-tight"
                >
                  <span className="text-white/70 truncate flex-1 min-w-0 mr-2">
                    {client.name || client.ip}
                  </span>
                  <span className="text-white/40 tabular-nums flex-shrink-0">
                    {formatNumber(client.queries)}
                  </span>
                  <span className="text-white/30 tabular-nums flex-shrink-0 w-10 text-right">
                    {client.blockedPercentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  )
}

// ── Plex ──

function stateIcon(state: PlexSession['playerState']): string {
  if (state === 'paused') return '\u23f8'
  if (state === 'buffering') return '\u27f3'
  return '\u25b6'
}

function ClassicSessionCard({ session, compact }: { session: PlexSession; compact?: boolean }) {
  const thumbUrl = session.thumbPath
    ? `/api/plex/thumb?path=${encodeURIComponent(session.thumbPath)}`
    : null
  const pct = session.duration > 0 ? Math.round((session.viewOffset / session.duration) * 100) : 0

  if (compact) {
    return (
      <GlassPanel className="p-2.5 text-white">
        <div className="flex gap-2.5 items-center">
          {thumbUrl && (
            <img src={thumbUrl} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{session.title}</div>
            <div className="flex items-center gap-1.5 text-xs text-white/50 whitespace-nowrap">
              <span className="flex-shrink-0">{stateIcon(session.playerState)}</span>
              <span className="text-white/40 flex-shrink-0">{session.userName}</span>
              {session.subtitle && (
                <span className="text-white/30 truncate ml-auto">{session.subtitle}</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-1.5">
          <div className="w-full bg-white/20 rounded-full h-1">
            <div className="bg-yellow-400 h-1 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel className="p-4 text-white">
      <div className="flex gap-3 items-start">
        {thumbUrl && (
          <img src={thumbUrl} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold truncate">{session.title}</div>
          {session.subtitle && (
            <div className="text-white/50 text-sm truncate">{session.subtitle}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/50 text-sm">{stateIcon(session.playerState)}</span>
            <span className="text-white/40 text-sm">{session.userName}</span>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <div className="w-full bg-white/20 rounded-full h-1.5">
          <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </GlassPanel>
  )
}

function ClassicPlex({ sessions, loading }: { sessions: PlexSession[]; loading: boolean }) {
  if (loading) {
    return (
      <GlassPanel className="p-3 animate-pulse">
        <div className="h-10 bg-white/10 rounded" />
      </GlassPanel>
    )
  }
  if (!sessions.length) return null
  const compact = sessions.length >= 2

  return (
    <div className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {sessions.map((session, idx) => (
        <ClassicSessionCard
          key={`${session.userName}-${session.title}-${idx}`}
          session={session}
          compact={compact}
        />
      ))}
    </div>
  )
}

// ── Media ──

interface CombinedItem {
  title: string
  type: 'episode' | 'movie'
  date: string
  subtitle: string
}

function formatDate(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr + 'T00:00:00').getTime() === today.getTime()
}

function isTomorrow(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return new Date(dateStr + 'T00:00:00').getTime() === tomorrow.getTime()
}

function combineEpisodes(items: UpcomingItem[]): CombinedItem[] {
  const result: CombinedItem[] = []
  const seen = new Map<string, CombinedItem>()
  for (const item of items) {
    const key = `${item.date}:${item.title}`
    const existing = seen.get(key)
    if (existing && item.type === 'episode') {
      const ep = item.subtitle.replace(/^S\d+/, '')
      existing.subtitle = `${existing.subtitle}, ${ep}`
    } else {
      const copy: CombinedItem = { ...item }
      seen.set(key, copy)
      result.push(copy)
    }
  }
  return result
}

function groupByDate(items: CombinedItem[]): Map<string, CombinedItem[]> {
  const groups = new Map<string, CombinedItem[]>()
  for (const item of items) {
    const group = groups.get(item.date)
    if (group) group.push(item)
    else groups.set(item.date, [item])
  }
  return groups
}

const M_HEADER_HEIGHT = 36
const M_DATE_HEADER_HEIGHT = 22
const M_ITEM_ROW_HEIGHT = 24
const M_FOOTER_HEIGHT = 24
const M_PADDING = 32

function calcVisibleItems(
  items: CombinedItem[],
  containerHeight: number
): { visibleItems: CombinedItem[]; truncatedMessage: string | null; useMarquee: boolean } {
  if (containerHeight <= 0)
    return { visibleItems: items, truncatedMessage: null, useMarquee: false }

  const grouped = groupByDate(items)
  let budget = containerHeight - M_HEADER_HEIGHT - M_PADDING
  const visibleItems: CombinedItem[] = []
  let truncatedMessage: string | null = null

  for (const [date, dateItems] of grouped) {
    if (isToday(date) || isTomorrow(date)) {
      visibleItems.push(...dateItems)
      budget -= M_DATE_HEADER_HEIGHT + dateItems.length * M_ITEM_ROW_HEIGHT
    }
  }

  const useMarquee = budget < 0

  if (!useMarquee) {
    budget -= M_FOOTER_HEIGHT
    for (const [date, dateItems] of grouped) {
      if (isToday(date) || isTomorrow(date)) continue
      if (budget >= M_DATE_HEADER_HEIGHT + M_ITEM_ROW_HEIGHT) {
        const availableRows = Math.floor((budget - M_DATE_HEADER_HEIGHT) / M_ITEM_ROW_HEIGHT)
        const rowsToShow = Math.min(availableRows, dateItems.length)
        visibleItems.push(...dateItems.slice(0, rowsToShow))
        budget -= M_DATE_HEADER_HEIGHT + rowsToShow * M_ITEM_ROW_HEIGHT
        if (rowsToShow < dateItems.length) {
          truncatedMessage = `& ${dateItems.length - rowsToShow} more on ${formatDate(date)}`
          break
        }
      } else break
    }
  }

  return { visibleItems, truncatedMessage, useMarquee }
}

function MediaItemRow({ item }: { item: CombinedItem }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/30 w-4 flex-shrink-0">
        {item.type === 'episode' ? '\ud83d\udcfa' : '\ud83c\udfac'}
      </span>
      <span className="text-sm text-white truncate">{item.title}</span>
      <span className="text-xs text-white/40 flex-shrink-0 ml-auto">{item.subtitle}</span>
    </div>
  )
}

function MediaMarqueeList({ items }: { items: CombinedItem[] }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scrollDistance, setScrollDistance] = useState(0)

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    const recalc = () => {
      const overflow = outer.scrollHeight - outer.clientHeight
      setScrollDistance(outer.clientHeight > 0 && overflow > 0 ? overflow : 0)
    }
    const ro = new ResizeObserver(recalc)
    ro.observe(outer)
    recalc()
    return () => ro.disconnect()
  }, [items])

  const grouped = groupByDate(items)

  return (
    <div ref={outerRef} className="overflow-hidden flex-1 min-h-0">
      <div
        className={scrollDistance > 0 ? 'media-marquee' : ''}
        style={
          scrollDistance > 0
            ? ({ '--marquee-distance': `${scrollDistance}px` } as React.CSSProperties)
            : undefined
        }
      >
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([date, dateItems]) => (
            <div key={date}>
              <div className="text-xs text-white/40 font-semibold tracking-wider uppercase mb-1">
                {formatDate(date)}
              </div>
              <div className="space-y-1">
                {dateItems.map((item, i) => (
                  <MediaItemRow key={`${item.title}-${i}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ClassicMedia({
  items,
  loading,
  className = '',
}: {
  items: UpcomingItem[]
  loading: boolean
  className?: string
}) {
  const { ref, height: containerHeight } = useAvailableHeight<HTMLDivElement>()

  if (loading) {
    return (
      <div ref={ref} className={className}>
        <GlassPanel className="p-4 animate-pulse h-full">
          <div className="h-20 bg-white/10 rounded" />
        </GlassPanel>
      </div>
    )
  }
  if (items.length === 0) return null

  const combined = combineEpisodes(items)
  const { visibleItems, truncatedMessage, useMarquee } = calcVisibleItems(combined, containerHeight)

  return (
    <div ref={ref} className={className}>
      <GlassPanel className="p-4 h-full flex flex-col">
        <div className="text-center text-white/50 text-sm font-semibold tracking-widest mb-3 uppercase">
          Upcoming
        </div>
        {useMarquee ? (
          <MediaMarqueeList items={visibleItems} />
        ) : (
          <div className="space-y-3 flex-1 min-h-0">
            {Array.from(groupByDate(visibleItems).entries()).map(([date, dateItems]) => (
              <div key={date}>
                <div className="text-xs text-white/40 font-semibold tracking-wider uppercase mb-1">
                  {formatDate(date)}
                </div>
                <div className="space-y-1">
                  {dateItems.map((item, i) => (
                    <MediaItemRow key={`${item.title}-${i}`} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {truncatedMessage && (
          <div className="text-center text-xs text-white/30 mt-3">{truncatedMessage}</div>
        )}
      </GlassPanel>
    </div>
  )
}

// ── Calendar ──

const CAL_COLORS = ['#60a5fa', '#6366f1', '#a78bfa', '#f472b6', '#fb923c', '#94a3b8']
const HOUR_START = 9
const HOUR_END = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const HOUR_PX = 32
const GUTTER_W = 44
const NUM_DAYS = 5

function calDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalDays(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: NUM_DAYS }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatDayHeader(d: Date, _isToday: boolean): string {
  if (_isToday) return 'Today'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
}

function formatHour(h: number): string {
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function eventLayout(start: Date, end: Date): { top: number; height: number } | null {
  const startH = start.getHours() + start.getMinutes() / 60
  const endH = end.getHours() + end.getMinutes() / 60
  if (endH <= HOUR_START || startH >= HOUR_END) return null
  const clampedStart = Math.max(startH, HOUR_START)
  const clampedEnd = Math.min(endH, HOUR_END)
  return {
    top: (clampedStart - HOUR_START) * HOUR_PX,
    height: Math.max((clampedEnd - clampedStart) * HOUR_PX, 20),
  }
}

function ClassicCalendar({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <GlassPanel className="p-4 animate-pulse">
        <div className="h-40 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  const days = getCalDays()
  const todayKey = calDayKey(days[0])
  const now = new Date()
  const nowH = now.getHours() + now.getMinutes() / 60
  const nowPct =
    nowH >= HOUR_START && nowH < HOUR_END ? ((nowH - HOUR_START) / TOTAL_HOURS) * 100 : null
  const gridHeight = TOTAL_HOURS * HOUR_PX

  return (
    <GlassPanel className="flex flex-col h-full p-3 overflow-hidden">
      <div className="flex flex-shrink-0 mb-1" style={{ paddingLeft: GUTTER_W }}>
        {days.map((d) => {
          const key = calDayKey(d)
          return (
            <div
              key={key}
              className="flex-1 text-center text-sm font-semibold truncate px-0.5"
              style={{ color: key === todayKey ? '#fde047' : 'rgba(255,255,255,0.6)' }}
            >
              {formatDayHeader(d, key === todayKey)}
            </div>
          )
        })}
      </div>
      <div className="flex flex-shrink-0 mb-1" style={{ paddingLeft: GUTTER_W }}>
        {days.map((d) => {
          const key = calDayKey(d)
          const allDay = events.filter((e) => e.allDay && calDayKey(new Date(e.start)) === key)
          return (
            <div key={key} className="flex-1 px-0.5 min-h-[16px]">
              {allDay.map((e) => (
                <div
                  key={e.id}
                  className="text-white rounded-md px-1 text-xs truncate mb-0.5"
                  style={{
                    backgroundColor: CAL_COLORS[(e.calendarIndex ?? 0) % CAL_COLORS.length],
                  }}
                >
                  {e.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: gridHeight }}>
          <div className="flex-shrink-0 relative" style={{ width: GUTTER_W }}>
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-1 text-sm leading-none"
                style={{ top: i * HOUR_PX - 6, color: 'rgba(255,255,255,0.28)' }}
              >
                {formatHour(HOUR_START + i)}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const key = calDayKey(d)
            const _isToday = key === todayKey
            const timed = events.filter((e) => !e.allDay && calDayKey(new Date(e.start)) === key)
            return (
              <div
                key={key}
                className="flex-1 relative border-l"
                style={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  backgroundColor: _isToday ? 'rgba(255,255,255,0.03)' : undefined,
                }}
              >
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-t"
                    style={{
                      top: i * HOUR_PX,
                      borderColor: i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                    }}
                  />
                ))}
                {_isToday && nowPct !== null && (
                  <div
                    className="absolute w-full z-10"
                    style={{ top: `${nowPct}%`, height: 2, backgroundColor: '#fbbf24' }}
                  />
                )}
                {timed.map((e) => {
                  const layout = eventLayout(new Date(e.start), new Date(e.end))
                  if (!layout) return null
                  const color = CAL_COLORS[(e.calendarIndex ?? 0) % CAL_COLORS.length]
                  return (
                    <div
                      key={e.id}
                      className="absolute left-0.5 right-0.5 rounded-xl px-1.5 py-0.5 overflow-hidden z-20"
                      style={{
                        top: layout.top + 1,
                        height: layout.height - 2,
                        backgroundColor: color + 'b3',
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div className="text-white text-sm leading-tight font-medium truncate">
                        {e.title}
                      </div>
                      {layout.height > 28 && (
                        <div className="text-white/60 text-xs leading-tight truncate">
                          {formatTime(new Date(e.start).getTime() / 1000)} &ndash;{' '}
                          {formatTime(new Date(e.end).getTime() / 1000)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </GlassPanel>
  )
}

// ── Astro ──

function ClassicAstro() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const snapshot = useMemo(() => getAstrologySnapshot(now), [now])
  const constellation = snapshot.constellation

  return (
    <div className="relative overflow-hidden px-4 py-4 text-white bg-slate-900/80 border border-white/24 rounded-2xl shadow-xl isolate [backface-visibility:hidden]">
      <div className="absolute inset-0 bg-gradient-to-r from-sky-400/15 via-indigo-400/10 to-amber-300/10" />
      <div className="absolute inset-0 astro-stars opacity-70" />
      <div className="relative">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
            Cosmic Snapshot
          </div>
          <div className="flex items-end gap-2 leading-none">
            <span className="text-[clamp(1.4rem,2.3vw,1.85rem)] font-semibold tracking-[0.02em]">
              {snapshot.sign.name}
            </span>
            <span className="text-sm text-white/70">{snapshot.signRange}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-white/85">
            <div className="rounded-lg bg-white/12 px-2 py-1">
              <span className="text-white/55">Today</span> {snapshot.weekday.dayName} &middot;{' '}
              {snapshot.weekday.ruler}
            </div>
            <div className="rounded-lg bg-white/12 px-2 py-1">
              <span className="text-white/55">Moon</span> {snapshot.moon.emoji} {snapshot.moon.name}
            </div>
            <div className="rounded-lg bg-white/12 px-2 py-1">
              <span className="text-white/55">Vibe</span> {snapshot.sign.element} &middot;{' '}
              {snapshot.sign.modality}
            </div>
            <div className="rounded-lg bg-white/12 px-2 py-1">
              <span className="text-white/55">Lucky</span> {snapshot.luckyWindow}
            </div>
          </div>
          <div className="mt-2 rounded-xl border border-white/15 bg-slate-950/35 px-3 py-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-white/65">
              <span>Constellation</span>
              <span>{constellation.name}</span>
            </div>
            <svg viewBox="0 0 100 62" className="w-full h-28 mt-1">
              <rect x="0" y="0" width="100" height="62" rx="8" fill="rgba(2,6,23,0.35)" />
              {constellation.lines.map(([a, b], idx) => {
                const start = constellation.stars[a]
                const end = constellation.stars[b]
                return (
                  <line
                    key={`${a}-${b}-${idx}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="rgba(147,197,253,0.55)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                )
              })}
              {constellation.stars.map((star, idx) => (
                <circle
                  key={`${star.x}-${star.y}-${idx}`}
                  cx={star.x}
                  cy={star.y}
                  r={star.size}
                  className="astro-twinkle"
                  style={{ animationDelay: `${idx * 120}ms` }}
                  fill={idx === 0 ? '#facc15' : '#f8fafc'}
                />
              ))}
            </svg>
            <div className="text-[11px] text-white/70 -mt-1">
              Notable star: {constellation.notable}
            </div>
          </div>
          <div className="mt-2 text-sm leading-snug text-white/90">{snapshot.message}</div>
          <div className="text-xs mt-1 text-white/70">
            {snapshot.sign.traits} Moon illumination: {snapshot.moon.illumination}%.
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Layout ──

export function ClassicLayout({
  weatherData,
  weatherLoading,
  events,
  calendarLoading,
  sessions,
  plexLoading,
  piholeData,
  piholeLoading,
  photos,
  mediaItems,
  mediaLoading,
  radarData,
  sobrietyDate,
}: LayoutProps) {
  const { ref: leftColRef, height: leftColHeight } = useAvailableHeight<HTMLDivElement>()

  const showRadar = radarData?.hasPrecipitation === true
  const hourlyForecast = !showRadar ? weatherData?.hourly : undefined
  const colStyle = leftColHeight > 0 ? { height: leftColHeight } : undefined

  return (
    <div className="h-screen w-full relative overflow-hidden font-sans flex flex-col">
      <ClassicPhotoBackground photos={photos} />

      <div className="relative z-10 flex flex-col h-full p-4">
        <div className="flex-shrink-0 flex items-start gap-4">
          <div
            ref={leftColRef}
            className="w-80 flex-shrink-0 flex flex-col gap-2 widget-enter"
            style={{ animationDelay: '0ms' }}
          >
            <ClassicWeather
              data={weatherData}
              loading={weatherLoading}
              hourlyForecast={hourlyForecast}
            />
            {showRadar && <ClassicRadarWidget data={radarData} />}
          </div>

          <div
            className="flex-1 min-w-0 pt-1 flex flex-col items-center gap-2 overflow-hidden widget-enter"
            style={{ animationDelay: '60ms', ...colStyle }}
          >
            <ClassicClock />
            <ClassicSoberCounter sobrietyDate={sobrietyDate} />
            <ClassicPihole
              data={piholeData}
              loading={piholeLoading}
              className="w-72 flex-1 min-h-0"
            />
          </div>

          <div
            className="w-80 flex-shrink-0 flex flex-col gap-2 overflow-hidden widget-enter"
            style={{ animationDelay: '110ms', ...colStyle }}
          >
            <ClassicMedia items={mediaItems} loading={mediaLoading} className="flex-1 min-h-0" />
            <ClassicPlex sessions={sessions} loading={plexLoading} />
          </div>
        </div>

        <div className="flex-1" />

        <div
          className="flex-shrink-0 flex items-end gap-4 widget-enter"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex-1 min-w-0">
            <ClassicCalendar events={events} loading={calendarLoading} />
          </div>
          <div className="w-72 flex-shrink-0">
            <ClassicAstro />
          </div>
        </div>
      </div>
    </div>
  )
}
