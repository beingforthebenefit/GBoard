import { UpcomingItem } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface MediaWidgetProps {
  items: UpcomingItem[]
  loading: boolean
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

function groupByDate(items: UpcomingItem[]): Map<string, UpcomingItem[]> {
  const groups = new Map<string, UpcomingItem[]>()
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

export function MediaWidget({ items, loading }: MediaWidgetProps) {
  if (loading) {
    return (
      <GlassPanel className="p-4 animate-pulse">
        <div className="h-20 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (items.length === 0) return null

  const grouped = groupByDate(items)

  return (
    <GlassPanel className="p-4">
      <div className="text-center text-white/50 text-sm font-semibold tracking-widest mb-3 uppercase">
        Upcoming
      </div>
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([date, dateItems]) => (
          <div key={date}>
            <div className="text-xs text-white/40 font-semibold tracking-wider uppercase mb-1">
              {formatDate(date)}
            </div>
            <div className="space-y-1">
              {dateItems.map((item, i) => (
                <div key={`${item.title}-${i}`} className="flex items-center gap-2">
                  <span className="text-xs text-white/30 w-4 flex-shrink-0">
                    {item.type === 'episode' ? '📺' : '🎬'}
                  </span>
                  <span className="text-sm text-white truncate">{item.title}</span>
                  <span className="text-xs text-white/40 flex-shrink-0 ml-auto">
                    {item.subtitle}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
