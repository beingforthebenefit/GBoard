import { PiholeStats } from '../hooks/usePihole.js'

interface PiholeWidgetProps {
  data: PiholeStats | null
  loading: boolean
  className?: string
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function PiholeWidget({ data, loading, className = '' }: PiholeWidgetProps) {
  if (loading || !data) {
    return null
  }

  return (
    <div className={`card rounded-xl px-4 py-3 flex items-center gap-2.5 ${className}`}>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          backgroundColor: data.status === 'enabled' ? 'var(--green)' : 'var(--accent)',
          boxShadow:
            data.status === 'enabled'
              ? '0 0 6px color-mix(in srgb, var(--green), transparent 60%)'
              : 'none',
        }}
      />
      <div className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
        <span
          className="text-[11px] font-medium uppercase tracking-wider mr-1.5"
          style={{ color: 'var(--text-3)' }}
        >
          Pi-hole
        </span>
        <span className="font-medium" style={{ color: 'var(--text-2)' }}>
          {formatNumber(data.blockedLastHour)}
        </span>
        /hr ·{' '}
        <span className="font-medium" style={{ color: 'var(--text-2)' }}>
          {data.blockedPercentage.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
