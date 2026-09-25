import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useMobileData } from './useMobileData.js'
import {
  Attention,
  GlanceGroup,
  SectionId,
  attention,
  glance,
  soberLine,
  summary,
} from './status.js'
import { Glyph, Section } from './parts.js'
import { useSectionOpen } from './useSectionOpen.js'
import { HealthSection } from './sections/HealthSection.js'
import { TodaySection } from './sections/TodaySection.js'
import { HomeSection } from './sections/HomeSection.js'
import { InfraSection } from './sections/InfraSection.js'
import { ExploreId } from './explorerData.js'

// ECharts is most of the weight; nobody pays for it until they open a chart
const Explorer = lazy(() => import('./Explorer.js'))

const SOBRIETY_DATE = import.meta.env.VITE_SOBRIETY_DATE as string | undefined

// Nothing on this page shows seconds; re-rendering every second would only cost battery
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function updatedLabel(at: Date | null, now: Date, loading: boolean): string {
  if (loading) return 'Updating'
  if (!at) return 'Not updated yet'
  const mins = Math.floor((now.getTime() - at.getTime()) / 60000)
  if (mins < 1) return 'Updated just now'
  if (mins < 60) return `Updated ${mins} min ago`
  return `Updated at ${at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

function usePullToRefresh(onRefresh: () => void, disabled: boolean) {
  const [pulled, setPulled] = useState(0)
  const start = useRef<number | null>(null)
  const dist = useRef(0)
  useEffect(() => {
    const down = (e: TouchEvent) => {
      start.current = !disabled && window.scrollY <= 0 ? e.touches[0].clientY : null
    }
    const move = (e: TouchEvent) => {
      if (start.current === null) return
      dist.current = Math.max(0, Math.min(90, (e.touches[0].clientY - start.current) * 0.5))
      setPulled(dist.current)
    }
    const up = () => {
      if (start.current === null) return
      if (dist.current > 60) onRefresh()
      start.current = null
      dist.current = 0
      setPulled(0)
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [onRefresh, disabled])
  return pulled
}

const SECTIONS: { id: SectionId; title: string; defaultOpen: boolean }[] = [
  { id: 'health', title: 'Health', defaultOpen: true },
  { id: 'today', title: 'Today', defaultOpen: false },
  { id: 'home', title: 'Home', defaultOpen: false },
  { id: 'infra', title: 'Infra', defaultOpen: false },
]

export function MobileApp() {
  const now = useMinuteClock()
  const { data, errors, loading, updatedAt, refresh } = useMobileData()
  const [exploring, setExploring] = useState<ExploreId | null>(null)
  const pulled = usePullToRefresh(refresh, exploring !== null)

  const open = {
    health: useSectionOpen('health', true),
    today: useSectionOpen('today', false),
    home: useSectionOpen('home', false),
    infra: useSectionOpen('infra', false),
  }

  const jump = (section: SectionId, row?: string) => {
    open[section][1](true)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // Wait for the section to finish opening before scrolling to the row inside it
    window.setTimeout(() => {
      const el =
        (row && document.getElementById(`row-${row}`)) || document.getElementById(`sec-${section}`)
      el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    }, 320)
  }

  // Focus goes back to whatever opened the explorer, as a dialog should
  const opener = useRef<HTMLElement | null>(null)
  const openExplorer = useCallback((id: ExploreId) => {
    opener.current = document.activeElement as HTMLElement | null
    setExploring(id)
  }, [])

  const closeExplorer = useCallback(() => {
    setExploring(null)
    window.setTimeout(() => opener.current?.focus(), 0)
  }, [])

  const items = attention(data, errors, now)
  const groups = glance(data, errors, now)
  const sober = soberLine(SOBRIETY_DATE, now)
  const failed = (k: keyof typeof data) => Boolean(errors[k])

  return (
    <div className="gbm-page">
      <header className="gbm-top">
        <div>
          <span className="gbm-date">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          {sober && <span className="gbm-sober">{sober}</span>}
        </div>
        <button
          className={`gbm-refresh${loading ? ' spinning' : ''}`}
          onClick={() => refresh()}
          aria-label="Refresh"
        >
          <span>{updatedLabel(updatedAt, now, loading)}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
          </svg>
        </button>
      </header>
      <div className="gbm-pull" style={{ height: pulled }} aria-hidden="true">
        <span>{pulled > 60 ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>

      <div className="gbm-layout">
        <aside className="gbm-rail">
          <AttentionStrip items={items} onJump={jump} />
          <Board groups={groups} onJump={jump} />
        </aside>
        <main>
          {SECTIONS.map((s) => {
            const [isOpen, setOpen] = open[s.id]
            return (
              <Section
                key={s.id}
                id={s.id}
                title={s.title}
                summary={summary(s.id, data, errors, now)}
                open={isOpen}
                onToggle={() => setOpen(!isOpen)}
              >
                {s.id === 'health' && (
                  <HealthSection
                    f={data.fitness}
                    failed={failed('fitness')}
                    onExplore={openExplorer}
                  />
                )}
                {s.id === 'today' && (
                  <TodaySection
                    events={data.events}
                    word={data.word}
                    media={data.media}
                    now={now}
                    failed={{
                      events: failed('events'),
                      word: failed('word'),
                      media: failed('media'),
                    }}
                  />
                )}
                {s.id === 'home' && (
                  <HomeSection
                    weather={data.weather}
                    ha={data.ha}
                    failed={{ weather: failed('weather'), ha: failed('ha') }}
                    onExplore={openExplorer}
                  />
                )}
                {s.id === 'infra' && (
                  <InfraSection
                    pihole={errors.pihole ? null : data.pihole}
                    plex={data.plex}
                    failed={{ pihole: failed('pihole'), plex: failed('plex') }}
                  />
                )}
              </Section>
            )
          })}
          <footer className="gbm-foot">
            Read-only. Everything here comes from GBoard on popos.
          </footer>
        </main>
      </div>

      {exploring && (
        <Suspense
          fallback={
            <div className="gbm-sheet" role="dialog" aria-label="Loading chart">
              <p className="gbm-sh-msg">Loading…</p>
            </div>
          }
        >
          <Explorer id={exploring} temps={data.ha?.temps ?? null} onClose={closeExplorer} />
        </Suspense>
      )}
    </div>
  )
}

function AttentionStrip({
  items,
  onJump,
}: {
  items: Attention[]
  onJump: (s: SectionId, row?: string) => void
}) {
  if (!items.length) return null
  return (
    <div className="gbm-attn" role="region" aria-label="Needs attention">
      {items.map((a) => (
        <button key={a.title} className={`s-${a.status}`} onClick={() => onJump(a.section, a.row)}>
          <Glyph status={a.status} />
          <span>
            <strong>{a.title}</strong>
            <span className="gbm-sub">{a.detail}</span>
          </span>
          <span className="gbm-go" aria-hidden="true">
            ›
          </span>
        </button>
      ))}
    </div>
  )
}

function Board({
  groups,
  onJump,
}: {
  groups: GlanceGroup[]
  onJump: (s: SectionId, row?: string) => void
}) {
  if (!groups.length) return null
  return (
    <div className="gbm-board" role="region" aria-label="Today at a glance">
      {groups.map((g) => (
        <div className={`gbm-bgroup c-${g.section}`} key={g.section}>
          <div className="gbm-bhead">{g.title}</div>
          {g.rows.map((r) => (
            <button className="gbm-brow" key={r.key} onClick={() => onJump(g.section, r.row)}>
              <Glyph status={r.status} />
              <span className="gbm-k">{r.label}</span>
              <span className="gbm-v">
                {r.value}
                {r.note && <small>{r.note}</small>}
                {r.cells && (
                  <span className="gbm-minicells" aria-hidden="true">
                    {r.cells.map((c, i) => (
                      <i key={i} className={c.on ? 'on' : c.due ? 'due' : ''} />
                    ))}
                  </span>
                )}
              </span>
              {r.bar !== undefined ? (
                <span className="gbm-minibar" aria-hidden="true">
                  <i style={{ width: `${r.bar * 100}%` }} />
                </span>
              ) : (
                <span className={`gbm-x s-${r.status}${r.plainAside ? ' plain' : ''}`}>
                  {r.aside}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
