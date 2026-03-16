import { useEffect, useRef, useState } from 'react'
import { UpcomingItem } from '../types/index.js'

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

/** Merge same-show episodes on the same date */
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

const HEADER_HEIGHT = 32
const DATE_HEADER_HEIGHT = 24
const ITEM_ROW_HEIGHT = 26

interface CalcResult {
  visibleItems: CombinedItem[]
  truncatedMessage: string | null
  useMarquee: boolean
}

function calcVisibleItems(items: CombinedItem[], containerHeight: number): CalcResult {
  if (containerHeight <= 0)
    return { visibleItems: items, truncatedMessage: null, useMarquee: false }

  const grouped = groupByDate(items)
  let budget = containerHeight - HEADER_HEIGHT
  const visibleItems: CombinedItem[] = []
  let truncatedMessage: string | null = null

  for (const [date, dateItems] of grouped) {
    if (isToday(date) || isTomorrow(date)) {
      visibleItems.push(...dateItems)
      budget -= DATE_HEADER_HEIGHT + dateItems.length * ITEM_ROW_HEIGHT
    }
  }

  const useMarquee = budget < 0

  if (!useMarquee) {
    for (const [date, dateItems] of grouped) {
      if (isToday(date) || isTomorrow(date)) continue

      if (budget >= DATE_HEADER_HEIGHT + ITEM_ROW_HEIGHT) {
        const availableRows = Math.floor((budget - DATE_HEADER_HEIGHT) / ITEM_ROW_HEIGHT)
        const rowsToShow = Math.min(availableRows, dateItems.length)
        visibleItems.push(...dateItems.slice(0, rowsToShow))
        budget -= DATE_HEADER_HEIGHT + rowsToShow * ITEM_ROW_HEIGHT

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
    <div className="flex items-baseline gap-2">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
        style={{
          backgroundColor: item.type === 'movie' ? 'var(--accent)' : 'var(--text-4)',
        }}
      />
      <span className="text-sm font-normal truncate flex-1" style={{ color: 'var(--text-2)' }}>
        {item.title}
      </span>
      <span
        className="text-[11px] font-light flex-shrink-0 ml-auto"
        style={{ color: 'var(--text-4)' }}
      >
        {item.subtitle}
      </span>
    </div>
  )
}

function MarqueeList({ items }: { items: CombinedItem[] }) {
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
        <div className="space-y-2">
          {Array.from(grouped.entries()).map(([date, dateItems]) => (
            <div key={date}>
              <div
                className="text-[10px] font-medium tracking-wider uppercase mb-1"
                style={{ color: 'var(--text-4)' }}
              >
                {formatDate(date)}
              </div>
              <div className="space-y-0.5">
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (loading) return null
  if (items.length === 0) return null

  const combined = combineEpisodes(items)
  const { visibleItems, truncatedMessage, useMarquee } = calcVisibleItems(combined, containerHeight)

  return (
    <div ref={containerRef} className={className}>
      <div
        className="text-[11px] font-medium uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-3)' }}
      >
        Upcoming
      </div>
      {useMarquee ? (
        <MarqueeList items={visibleItems} />
      ) : (
        <div className="space-y-2">
          {Array.from(groupByDate(visibleItems).entries()).map(([date, dateItems]) => (
            <div key={date}>
              <div
                className="text-[10px] font-medium tracking-wider uppercase mb-1"
                style={{ color: 'var(--text-4)' }}
              >
                {formatDate(date)}
              </div>
              <div className="space-y-0.5">
                {dateItems.map((item, i) => (
                  <ItemRow key={`${item.title}-${i}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {truncatedMessage && (
        <div className="text-center text-[11px] mt-2" style={{ color: 'var(--text-4)' }}>
          {truncatedMessage}
        </div>
      )}
    </div>
  )
}
