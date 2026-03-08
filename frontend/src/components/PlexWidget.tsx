import { PlexSession } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface PlexWidgetProps {
  session: PlexSession | null
  loading: boolean
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function PlexWidget({ session, loading }: PlexWidgetProps) {
  // Hide entirely when not playing
  if (!loading && !session) return null

  if (loading) {
    return (
      <GlassPanel className="p-3 animate-pulse">
        <div className="h-10 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!session) return null

  const thumbUrl = session.thumbPath
    ? `/api/plex/thumb?path=${encodeURIComponent(session.thumbPath)}`
    : null
  const pct = session.duration > 0 ? Math.round((session.viewOffset / session.duration) * 100) : 0

  return (
    <GlassPanel className="p-3 text-white">
      <div className="flex gap-3 items-start">
        {thumbUrl && (
          <img src={thumbUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{session.title}</div>
          {session.subtitle && (
            <div className="text-white/50 text-xs truncate">{session.subtitle}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            {session.userAvatar ? (
              <img src={session.userAvatar} alt="" className="w-4 h-4 rounded-full" />
            ) : null}
            <span className="text-white/40 text-xs">{session.userName}</span>
            {session.playerState === 'paused' && <span className="text-white/30 text-xs">⏸</span>}
          </div>
        </div>
      </div>
      {/* Progress */}
      <div className="mt-2">
        <div className="w-full bg-white/20 rounded-full h-1">
          <div className="bg-yellow-400 h-1 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/40 mt-0.5 tabular-nums">
          <span>{formatMs(session.viewOffset)}</span>
          <span>{formatMs(session.duration)}</span>
        </div>
      </div>
    </GlassPanel>
  )
}
