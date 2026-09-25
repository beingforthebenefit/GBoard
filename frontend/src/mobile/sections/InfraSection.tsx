import { PlexSession } from '../../types/index.js'
import { PiholeStats } from '../../hooks/usePihole.js'
import { Label, Meter, Notice } from '../parts.js'
import { fmt } from '../status.js'

interface Props {
  pihole: PiholeStats | null
  plex: PlexSession[] | null
  failed: { pihole: boolean; plex: boolean }
}

// A client blocking this share of its queries is worth a glance (an ad-heavy TV, say)
const HOT_CLIENT_PCT = 30

export function InfraSection({ pihole, plex, failed }: Props) {
  return (
    <>
      <Pihole p={pihole} failed={failed.pihole} />
      <Plex sessions={plex} failed={failed.plex} />
    </>
  )
}

function Pihole({ p, failed }: { p: PiholeStats | null; failed: boolean }) {
  if (failed) {
    // Deliberately no numbers: an old count shown as current is the failure this avoids
    return (
      <div id="row-pihole">
        <Notice status="bad" title="Pi-hole isn't answering">
          GBoard couldn't reach Pi-hole on lepotato. Check it with ssh pi.hole.
        </Notice>
      </div>
    )
  }
  if (!p) return null
  return (
    <div id="row-pihole">
      {p.status !== 'enabled' && (
        <Notice status="warn" title="Blocking is off">
          Pi-hole reports "{p.status}".
        </Notice>
      )}
      <div className="gbm-pair">
        <div>
          <Label>Blocked today</Label>
          <span className="gbm-big" style={{ color: 'var(--infra)' }}>
            {p.blockedPercentage.toFixed(1)}
          </span>
          <span className="gbm-unit">%</span>
        </div>
        <div>
          <Label>Last hour</Label>
          <span className="gbm-big">{fmt(p.blockedLastHour)}</span>
          <span className="gbm-unit">blocked</span>
        </div>
      </div>
      <p className="gbm-small gbm-muted" style={{ margin: '6px 0 10px' }}>
        {fmt(p.blockedQueries)} of {fmt(p.totalQueries)} queries today
      </p>
      {p.clients.length > 0 && (
        <table className="gbm-clients">
          <thead>
            <tr>
              <th>Client</th>
              <th>Queries</th>
              <th>Blocked</th>
            </tr>
          </thead>
          <tbody>
            {p.clients.map((c) => {
              const hot = c.blockedPercentage >= HOT_CLIENT_PCT
              return (
                <tr key={c.ip}>
                  <td>{c.name}</td>
                  <td className="gbm-muted">{fmt(c.queries)}</td>
                  <td>
                    <span className={`gbm-pct s-${hot ? 'warn' : 'none'}`}>
                      {c.blockedPercentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function minutes(ms: number) {
  return Math.round(ms / 60000)
}

function Plex({ sessions, failed }: { sessions: PlexSession[] | null; failed: boolean }) {
  if (!sessions) return failed ? <Notice status="bad" title="Plex didn't answer" /> : null
  return (
    <div id="row-plex">
      <Label>Now playing on Plex</Label>
      {sessions.length === 0 && (
        <p className="gbm-muted gbm-small" style={{ margin: 0 }}>
          Nothing is playing.
        </p>
      )}
      {sessions.map((s) => (
        <div className="gbm-plex" key={`${s.userName}-${s.title}-${s.subtitle}`}>
          {s.thumbPath ? (
            <img
              className="gbm-poster"
              src={`/api/plex/thumb?path=${encodeURIComponent(s.thumbPath)}`}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className="gbm-poster" aria-hidden="true" />
          )}
          <div>
            <div className="gbm-strong">{s.title}</div>
            {s.subtitle && <div className="gbm-small gbm-muted">{s.subtitle}</div>}
            <div className="gbm-small gbm-muted">
              {s.userName}, {minutes(s.viewOffset)} of {minutes(s.duration)} min
              {s.playerState !== 'playing' ? `, ${s.playerState}` : ''}
            </div>
            <span className="gbm-block" style={{ marginBlockStart: 8 }}>
              <Meter value={s.duration ? s.viewOffset / s.duration : 0} height={5} />
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
