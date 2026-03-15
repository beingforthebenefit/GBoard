import { useEffect, useRef, useState } from 'react'
import { UpcomingItem } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'
import { useAvailableHeight } from '../hooks/useAvailableHeight.js'

interface MediaWidgetProps {
  items: UpcomingItem[]
  loading: boolean
  className?: string
}

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
  const date = new Date(dateStr + 'T00:00:00')
  return date.getTime() === today.getTime()
}

function isTomorrow(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const date = new Date(dateStr + 'T00:00:00')
  return date.getTime() === tomorrow.getTime()
}

/** Merge same-show episodes on the same date: "Family Guy S24E08" + "S24E09" → "Family Guy — E08, E09" */
function combineEpisodes(items: UpcomingItem[]): CombinedItem[] {
  const result: CombinedItem[] = []
  const seen = new Map<string, CombinedItem>()

  for (const item of items) {
    const key = `${item.date}:${item.title}`
    const existing = seen.get(key)
    if (existing && item.type === 'episode') {
      // Strip the season prefix (e.g. "S24E09" → "E09")
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
    const key = item.date
    const group = groups.get(key)
    if (group) {
      group.push(item)
    } else {
      groups.set(key, [item])
    }
  }
  return groups
}

// Header "UPCOMING" ~36px, date headers ~22px each, item rows ~24px each, footer ~24px, padding ~32px
const HEADER_HEIGHT = 36
const DATE_HEADER_HEIGHT = 22
const ITEM_ROW_HEIGHT = 24
const FOOTER_HEIGHT = 24
const PADDING = 32

interface CalcResult {
  visibleItems: CombinedItem[]
  /** Message like "& 3 more on Wed, Mar 18" — only when a day is partially truncated */
  truncatedMessage: string | null
  /** Whether the marquee should be used (today+tomorrow don't fit statically) */
  useMarquee: boolean
}

function calcVisibleItems(items: CombinedItem[], containerHeight: number): CalcResult {
  if (containerHeight <= 0)
    return { visibleItems: items, truncatedMessage: null, useMarquee: false }

  const grouped = groupByDate(items)
  let budget = containerHeight - HEADER_HEIGHT - PADDING
  const visibleItems: CombinedItem[] = []
  let truncatedMessage: string | null = null

  // Phase 1: Always include ALL today + tomorrow items
  for (const [date, dateItems] of grouped) {
    if (isToday(date) || isTomorrow(date)) {
      visibleItems.push(...dateItems)
      budget -= DATE_HEADER_HEIGHT + dateItems.length * ITEM_ROW_HEIGHT
    }
  }

  // If today+tomorrow overflow the container, use marquee (no room for more days)
  const useMarquee = budget < 0

  // Phase 2: Fill remaining space with subsequent days (only if budget remains)
  if (!useMarquee) {
    // Reserve space for potential footer
    budget -= FOOTER_HEIGHT
    for (const [date, dateItems] of grouped) {
      if (isToday(date) || isTomorrow(date)) continue

      if (budget >= DATE_HEADER_HEIGHT + ITEM_ROW_HEIGHT) {
        const availableRows = Math.floor((budget - DATE_HEADER_HEIGHT) / ITEM_ROW_HEIGHT)
        const rowsToShow = Math.min(availableRows, dateItems.length)
        visibleItems.push(...dateItems.slice(0, rowsToShow))
        budget -= DATE_HEADER_HEIGHT + rowsToShow * ITEM_ROW_HEIGHT

        // If this day was partially truncated, show how many are hidden from it
        if (rowsToShow < dateItems.length) {
          const remaining = dateItems.length - rowsToShow
          truncatedMessage = `& ${remaining} more on ${formatDate(date)}`
          break
        }
      } else {
        break
      }
    }
  }

  return { visibleItems, truncatedMessage, useMarquee }
}

function ItemRow({ item }: { item: CombinedItem }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/30 w-4 flex-shrink-0">
        {item.type === 'episode' ? '📺' : '🎬'}
      </span>
      <span className="text-sm text-white truncate">{item.title}</span>
      <span className="text-xs text-white/40 flex-shrink-0 ml-auto">{item.subtitle}</span>
    </div>
  )
}

/** Auto-scrolling container that shows all items with date headers, scrolling when they overflow */
function MarqueeList({ items }: { items: CombinedItem[] }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scrollDistance, setScrollDistance] = useState(0)

  // Use ResizeObserver so we recalculate after flexbox layout settles
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
                  <ItemRow key={`${item.title}-${i}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MediaWidget({ items, loading, className = '' }: MediaWidgetProps) {
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
          <MarqueeList items={visibleItems} />
        ) : (
          <div className="space-y-3 flex-1 min-h-0">
            {Array.from(groupByDate(visibleItems).entries()).map(([date, dateItems]) => (
              <div key={date}>
                <div className="text-xs text-white/40 font-semibold tracking-wider uppercase mb-1">
                  {formatDate(date)}
                </div>
                <div className="space-y-1">
                  {dateItems.map((item, i) => (
                    <ItemRow key={`${item.title}-${i}`} item={item} />
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
