import { PiholeStats } from '../hooks/usePihole.js'
import { GlassPanel } from './GlassPanel.js'
import { useAvailableHeight } from '../hooks/useAvailableHeight.js'

interface PiholeWidgetProps {
  data: PiholeStats | null
  loading: boolean
  className?: string
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

// Height thresholds for layout modes (including p-3 padding = 24px)
// Compact: header(~36) + inline stats row(~44) + padding(24) ≈ 104px
const COMPACT_THRESHOLD = 140
// Full: header(~36) + 2x2 grid(~90) + blocklist(~32) + padding(24) ≈ 182px
const FULL_THRESHOLD = 182
// Each client row is approximately 24px
const CLIENT_ROW_HEIGHT = 24
// Client section header is approximately 28px
const CLIENT_HEADER_HEIGHT = 28

export function PiholeWidget({ data, loading, className = '' }: PiholeWidgetProps) {
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

  // Calculate how many client rows fit in remaining space
  const availableForClients = containerHeight - FULL_THRESHOLD - CLIENT_HEADER_HEIGHT
  const maxClients = Math.max(0, Math.floor(availableForClients / CLIENT_ROW_HEIGHT))
  const showClients = mode === 'expanded' && maxClients > 0 && data.clients.length > 0
  const visibleClients = data.clients.slice(0, maxClients)

  return (
    <div ref={ref} className={className}>
      <GlassPanel className="p-3 text-white h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm uppercase tracking-[0.14em] text-white/45 flex items-center gap-1.5">
            <PiholeLogo />
            Pi-hole
          </div>
          <div className={`text-xs font-medium ${statusColor}`}>
            {data.status === 'enabled' ? '● Active' : '○ Disabled'}
          </div>
        </div>

        {/* Compact: two key stats in a row */}
        {mode === 'compact' && (
          <div className="flex justify-around">
            <StatCell value={formatNumber(data.blockedLastHour)} label="Blk/hr" />
            <StatCell value={`${data.blockedPercentage.toFixed(1)}%`} label="Blk %" />
          </div>
        )}

        {/* Standard/Expanded: full 2x2 grid + blocklist */}
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

        {/* Expanded: per-client breakdown */}
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
