import { PiholeStats } from '../hooks/usePihole.js'
import { GlassPanel } from './GlassPanel.js'

interface PiholeWidgetProps {
  data: PiholeStats | null
  loading: boolean
}

function PiholeLogo() {
  return <img src="/pihole-logo.png" alt="Pi-hole" className="w-4 h-4 inline-block" />
}

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

export function PiholeWidget({ data, loading }: PiholeWidgetProps) {
  if (loading) {
    return (
      <GlassPanel className="p-3 animate-pulse">
        <div className="h-10 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!data) {
    return (
      <GlassPanel className="p-3 text-white/50 text-center">
        <div className="text-sm uppercase tracking-[0.14em] text-white/45">Pi-hole</div>
        <div className="text-xs mt-1">Unavailable</div>
      </GlassPanel>
    )
  }

  const statusColor = data.status === 'enabled' ? 'text-green-400' : 'text-red-400'

  return (
    <GlassPanel className="p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm uppercase tracking-[0.14em] text-white/45 flex items-center gap-1.5">
          <PiholeLogo />
          Pi-hole
        </div>
        <div className={`text-xs font-medium ${statusColor}`}>
          {data.status === 'enabled' ? '● Active' : '○ Disabled'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-2">
        <StatCell value={formatNumber(data.blockedLastHour)} label="Blk/hr" />
        <StatCell value={`${data.blockedPercentage.toFixed(1)}%`} label="Blk %" />
        <StatCell value={formatNumber(data.blockedQueries)} label="Blk total" />
        <StatCell value={formatNumber(data.totalQueries)} label="Req total" />
      </div>
      <div className="mt-3 pt-2 border-t border-white/10 text-center">
        <span className="text-xs text-white/40">
          {formatNumber(data.domainsOnBlocklist)} domains on blocklist
        </span>
      </div>
    </GlassPanel>
  )
}
