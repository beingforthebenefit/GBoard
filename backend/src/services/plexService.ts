import { PlexSession } from '../types/index.js'

interface PlexMetadata {
  type: string
  title: string
  grandparentTitle?: string
  parentTitle?: string
  parentIndex?: number
  index?: number
  thumb?: string
  grandparentThumb?: string
  duration?: number
  viewOffset?: number
  Player?: { state?: string }
  User?: { title?: string; thumb?: string }
}

interface PlexMediaContainer {
  size?: number
  Metadata?: PlexMetadata[]
}

interface PlexApiResponse {
  MediaContainer?: PlexMediaContainer
}

export async function fetchPlexSessions(): Promise<PlexSession[]> {
  const plexUrl = process.env.PLEX_URL
  const plexToken = process.env.PLEX_TOKEN

  if (!plexUrl || !plexToken) {
    throw new Error('Missing PLEX_URL or PLEX_TOKEN env vars')
  }

  let res: Response
  try {
    res = await fetch(`${plexUrl}/status/sessions?X-Plex-Token=${plexToken}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Plex unreachable — return empty gracefully
    return []
  }

  if (!res.ok) return []

  const json = (await res.json()) as PlexApiResponse
  const container = json?.MediaContainer
  if (!container || !container.size || !container.Metadata?.length) {
    return []
  }

  return mapMetadataList(container.Metadata)
}

// Backward-compatible helper if needed by older callers.
export async function fetchPlexSession(): Promise<PlexSession | null> {
  const sessions = await fetchPlexSessions()
  return sessions[0] ?? null
}

export function mapMetadata(meta: PlexMetadata): PlexSession {
  const type = meta.type === 'episode' ? 'episode' : meta.type === 'track' ? 'track' : 'movie'
  let subtitle = ''

  if (type === 'episode') {
    const s = meta.parentIndex ?? 0
    const e = meta.index ?? 0
    subtitle = `S${String(s).padStart(2, '0')}E${String(e).padStart(2, '0')} – ${meta.title}`
  } else if (type === 'track') {
    subtitle = `${meta.grandparentTitle ?? ''} – ${meta.parentTitle ?? ''}`
  } else {
    subtitle = meta.parentTitle ?? ''
  }

  const rawState = meta.Player?.state ?? 'playing'
  const playerState: PlexSession['playerState'] =
    rawState === 'paused' ? 'paused' : rawState === 'buffering' ? 'buffering' : 'playing'

  return {
    title: type === 'episode' ? (meta.grandparentTitle ?? meta.title) : meta.title,
    type,
    subtitle,
    thumbPath: meta.thumb ?? meta.grandparentThumb ?? null,
    userName: meta.User?.title ?? 'Unknown',
    userAvatar: meta.User?.thumb ?? null,
    viewOffset: meta.viewOffset ?? 0,
    duration: meta.duration ?? 0,
    playerState,
  }
}

export function mapMetadataList(metadata: PlexMetadata[]): PlexSession[] {
  return metadata.map(mapMetadata)
}
