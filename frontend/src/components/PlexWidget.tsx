import { PlexSession } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface PlexWidgetProps {
  sessions: PlexSession[]
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

function stateIcon(state: PlexSession['playerState']): string {
  if (state === 'paused') return '⏸'
  if (state === 'buffering') return '⟳'
  return '▶'
}

function SessionCard({ session }: { session: PlexSession }) {
  const thumbUrl = session.thumbPath
    ? `/api/plex/thumb?path=${encodeURIComponent(session.thumbPath)}`
    : null
  const pct = session.duration > 0 ? Math.round((session.viewOffset / session.duration) * 100) : 0

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
            {session.userAvatar ? (
              <img src={session.userAvatar} alt="" className="w-5 h-5 rounded-full" />
            ) : null}
            <span className="text-white/50 text-sm">{stateIcon(session.playerState)}</span>
            <span className="text-white/40 text-sm">{session.userName}</span>
          </div>
        </div>
      </div>
      {/* Progress */}
      <div className="mt-2">
        <div className="w-full bg-white/20 rounded-full h-1.5">
          <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-sm text-white/40 mt-0.5 tabular-nums">
          <span>{formatMs(session.viewOffset)}</span>
          <span>{formatMs(session.duration)}</span>
        </div>
      </div>
    </GlassPanel>
  )
}

export function PlexWidget({ sessions, loading }: PlexWidgetProps) {
  if (loading) {
    return (
      <GlassPanel className="p-3 animate-pulse">
        <div className="h-10 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!sessions.length) {
    return (
      <GlassPanel className="p-4 text-white/60 text-center">
        <div className="text-sm uppercase tracking-[0.14em] text-white/45">Plex</div>
        <div className="text-base mt-1">No one is streaming</div>
      </GlassPanel>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((session, idx) => (
        <SessionCard key={`${session.userName}-${session.title}-${idx}`} session={session} />
      ))}
    </div>
  )
}
