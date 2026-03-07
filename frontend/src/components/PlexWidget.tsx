import { PlexSession } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface PlexWidgetProps {
  session: PlexSession | null
  loading: boolean
}

function ProgressBar({ viewOffset, duration }: { viewOffset: number; duration: number }) {
  const pct = duration > 0 ? Math.round((viewOffset / duration) * 100) : 0
  return (
    <div className="w-full bg-white/20 rounded-full h-1 mt-2">
      <div className="bg-yellow-400 h-1 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function PlexWidget({ session, loading }: PlexWidgetProps) {
  // Hide entirely when not playing
  if (!loading && !session) return null

  if (loading) {
    return (
      <GlassPanel className="p-4 animate-pulse">
        <div className="h-10 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!session) return null

  const thumbUrl = session.thumbPath ? `/api/plex/thumb?path=${encodeURIComponent(session.thumbPath)}` : null

  return (
    <GlassPanel className="p-4 text-white">
      <div className="flex gap-3 items-start">
        {thumbUrl && (
          <img src={thumbUrl} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{session.title}</div>
          <div className="text-white/60 text-sm truncate">{session.subtitle}</div>
          <div className="flex items-center gap-2 mt-1">
            {session.userAvatar ? (
              <img src={session.userAvatar} alt="" className="w-4 h-4 rounded-full" />
            ) : null}
            <span className="text-white/50 text-xs">{session.userName}</span>
            {session.playerState === 'paused' && (
              <span className="text-white/40 text-xs">⏸ Paused</span>
            )}
          </div>
          <ProgressBar viewOffset={session.viewOffset} duration={session.duration} />
        </div>
      </div>
    </GlassPanel>
  )
}
