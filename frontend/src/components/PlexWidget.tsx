import { PlexSession } from '../types/index.js'

interface PlexWidgetProps {
  sessions: PlexSession[]
  loading: boolean
}

function SessionCard({ session }: { session: PlexSession }) {
  const thumbUrl = session.thumbPath
    ? `/api/plex/thumb?path=${encodeURIComponent(session.thumbPath)}`
    : null
  const pct = session.duration > 0 ? Math.round((session.viewOffset / session.duration) * 100) : 0

  return (
    <div className="card rounded-xl px-4 py-3 flex items-center gap-3">
      {thumbUrl && (
        <img src={thumbUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] uppercase tracking-widest font-medium"
          style={{ color: 'var(--accent-2)' }}
        >
          Now Playing
        </div>
        <div className="text-base font-medium truncate" style={{ color: 'var(--text)' }}>
          {session.title}
        </div>
        <div className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          {session.subtitle && <>{session.subtitle} · </>}
          {session.userName}
        </div>
        <div
          className="h-1 rounded-full mt-2 overflow-hidden"
          style={{ backgroundColor: 'var(--progress-bg)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: 'var(--progress-fill)' }}
          />
        </div>
      </div>
    </div>
  )
}

export function PlexWidget({ sessions, loading }: PlexWidgetProps) {
  if (loading) {
    return <div className="card rounded-xl animate-pulse p-3" style={{ minHeight: 48 }} />
  }

  if (!sessions.length) return null

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((session, idx) => (
        <SessionCard key={`${session.userName}-${session.title}-${idx}`} session={session} />
      ))}
    </div>
  )
}
