import { useEffect, useMemo, useRef, useState } from 'react'
import { useClock } from '../../hooks/useClock.js'
import { useElementSize } from '../../hooks/useElementSize.js'
import { buildThumborUrl } from '../../utils/thumbor.js'
import { AgendaList } from '../../components/AgendaList.js'
import { MilestoneWidget } from '../../components/MilestoneWidget.js'
import { OnThisDay } from '../../components/OnThisDay.js'
import { WordOfDayWidget } from '../../components/WordOfDay.js'
import { findMemories } from '../../utils/photoMemories.js'
import { RadarTiles } from '../../components/RadarTiles.js'
import { LayoutProps, shouldShowRadar } from '../index.js'

const HANDWRITING = { fontFamily: "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive" }
const MAGNET_COLORS = ['#e2574c', '#3f7cac', '#e8b94a', '#5ba36b', '#9b6bb3', '#e07b39']
const NOTE_COLORS = ['#fff6a8', '#ffd1dc', '#c9e4ff', '#d4f0c0']

// ── Magnet-letter clock ──

function MagnetClock() {
  const now = useClock()
  const h = now.getHours()
  const m = String(now.getMinutes()).padStart(2, '0')
  const chars = `${h % 12 || 12}:${m}`.split('')
  const ampm = h >= 12 ? 'pm' : 'am'

  return (
    <div className="flex items-end gap-1">
      {chars.map((char, i) => (
        <span
          key={`${i}-${char}`}
          className="inline-flex items-center justify-center w-[1.15em] h-[1.4em] rounded-lg text-white font-extrabold shadow-md text-[clamp(2rem,4.5vw,3rem)]"
          style={{
            background: char === ':' ? 'transparent' : MAGNET_COLORS[i % MAGNET_COLORS.length],
            color: char === ':' ? '#8a8071' : '#fff',
            boxShadow: char === ':' ? 'none' : undefined,
            transform: `rotate(${i % 2 === 0 ? -3 : 2.5}deg)`,
          }}
        >
          {char}
        </span>
      ))}
      <span className="text-lg font-bold ml-1 pb-1 text-[#8a8071]" style={HANDWRITING}>
        {ampm}
      </span>
    </div>
  )
}

// ── Polaroid photo ──

function PolaroidPhoto({ photos }: Pick<LayoutProps, 'photos'>) {
  const shuffled = useMemo(() => {
    const arr = [...photos]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [photos])
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(frameRef)

  useEffect(() => {
    if (shuffled.length < 2) return
    const id = setInterval(() => {
      setFade(true)
      setTimeout(() => {
        setIdx((i) => (i + 1) % shuffled.length)
        setFade(false)
      }, 600)
    }, 300_000)
    return () => clearInterval(id)
  }, [shuffled.length])

  const current = shuffled.length > 0 ? shuffled[idx % shuffled.length] : null
  const captionParts: string[] = []
  if (current?.location?.city) {
    captionParts.push(
      current.location.city + (current.location.state ? `, ${current.location.state}` : '')
    )
  }
  if (current?.dateTaken) {
    captionParts.push(
      new Date(current.dateTaken).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    )
  }

  const src =
    current && size ? buildThumborUrl(current.filename, size.width, size.height, 'cover') : null

  return (
    <div className="h-full flex items-center justify-center">
      <div
        className="bg-white p-3 pb-2 shadow-xl h-full w-full flex flex-col relative"
        style={{ transform: 'rotate(-1.2deg)' }}
      >
        {/* Tape strips */}
        <div className="absolute -top-2.5 left-10 w-20 h-5 bg-[#f7eecb]/80 shadow-sm rotate-[-4deg]" />
        <div className="absolute -top-2.5 right-10 w-20 h-5 bg-[#f7eecb]/80 shadow-sm rotate-[5deg]" />
        <div ref={frameRef} className="flex-1 min-h-0 relative overflow-hidden bg-[#eee]">
          {src ? (
            <img
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: fade ? 0 : 1 }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-[#b0a895] text-sm"
              style={HANDWRITING}
            >
              photos coming soon…
            </div>
          )}
        </div>
        <div
          className="flex-shrink-0 text-center text-sm text-[#6b6354] pt-1.5 truncate"
          style={HANDWRITING}
        >
          {captionParts.length > 0 ? captionParts.join(' · ') : '♥'}
        </div>
      </div>
    </div>
  )
}

// ── Weather magnets ──

function WeatherMagnets({
  weatherData: data,
  weatherLoading: loading,
}: Pick<LayoutProps, 'weatherData' | 'weatherLoading'>) {
  if (loading || !data) {
    return (
      <div className="text-sm text-[#a89f8d]" style={HANDWRITING}>
        checking the sky…
      </div>
    )
  }
  const { current, forecast } = data
  return (
    <div className="flex items-stretch gap-2">
      <div
        className="bg-white rounded-xl shadow-md px-3 py-2 flex items-center gap-2"
        style={{ transform: 'rotate(-1.5deg)' }}
      >
        <img
          src={`https://openweathermap.org/img/wn/${current.icon}@2x.png`}
          alt={current.description}
          className="w-10 h-10"
        />
        <div>
          <div className="text-2xl font-bold text-[#4a443a] leading-none tabular-nums">
            {current.temp}°
          </div>
          <div className="text-[10px] text-[#a89f8d] capitalize">{current.description}</div>
        </div>
      </div>
      {forecast.slice(1, 4).map((day, i) => (
        <div
          key={day.date}
          className="bg-white rounded-xl shadow-md px-2 py-1.5 text-center flex flex-col justify-center"
          style={{ transform: `rotate(${i % 2 === 0 ? 1.8 : -1.4}deg)` }}
        >
          <div className="text-[9px] uppercase font-bold text-[#a89f8d]">
            {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div className="text-xs font-semibold text-[#4a443a] tabular-nums">
            {day.high}°<span className="text-[#b8b0a0] font-normal"> {day.low}°</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── House notes scrap (Plex + Pi-hole) ──

function HouseNotes({ sessions, piholeData }: Pick<LayoutProps, 'sessions' | 'piholeData'>) {
  return (
    <div
      className="bg-white shadow-md px-3 py-2 text-[#5c5546]"
      style={{ transform: 'rotate(0.8deg)', ...HANDWRITING }}
    >
      <div className="text-[10px] uppercase tracking-wider text-[#a89f8d] font-bold mb-1">
        House notes
      </div>
      {sessions.length > 0 ? (
        sessions.map((s, i) => (
          <div key={i} className="text-xs truncate">
            📺 {s.userName} is watching {s.title}
            {s.playerState === 'paused' ? ' (paused)' : ''}
          </div>
        ))
      ) : (
        <div className="text-xs text-[#a89f8d]">📺 TV is quiet right now</div>
      )}
      {piholeData && (
        <div className="text-xs mt-0.5">
          🛡 blocked {piholeData.blockedPercentage.toFixed(0)}% of{' '}
          {piholeData.totalQueries.toLocaleString()} lookups today
        </div>
      )}
    </div>
  )
}

// ── TV guide scrap ──

function TvGuide({ mediaItems }: Pick<LayoutProps, 'mediaItems'>) {
  if (mediaItems.length === 0) return null
  return (
    <div
      className="bg-[#fdfbf4] shadow-md px-3 py-2 border-l-4 border-[#e2574c]"
      style={{ transform: 'rotate(-0.9deg)' }}
    >
      <div className="text-[10px] uppercase tracking-wider text-[#a89f8d] font-bold mb-1">
        Coming to the couch
      </div>
      {mediaItems.slice(0, 6).map((item, i) => {
        const d = new Date(item.date + 'T00:00:00')
        const isToday = d.toDateString() === new Date().toDateString()
        return (
          <div key={i} className="flex items-baseline gap-2 text-xs text-[#5c5546]">
            <span className="w-12 flex-shrink-0 text-[#a89f8d] tabular-nums">
              {isToday
                ? 'Today'
                : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className="truncate">
              {item.type === 'movie' ? '🎬' : '📺'} {item.title}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main layout ──

export function FridgeLayout({
  weatherData,
  weatherLoading,
  events,
  calendarLoading,
  sessions,
  piholeData,
  photos,
  mediaItems,
  radarData,
  radarMode,
  sobrietyDate,
  wordOfDay,
}: LayoutProps) {
  const now = useClock()
  const showRadar = shouldShowRadar(radarMode, radarData)
  const hasMemories = useMemo(() => findMemories(photos, new Date(), 3).length > 0, [photos])
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="h-screen w-full overflow-hidden flex flex-col p-5 gap-4"
      style={{
        background:
          'linear-gradient(165deg, #f4eee3 0%, #efe7d8 55%, #e9e0cf 100%), radial-gradient(circle at 20% 10%, rgba(255,255,255,0.5), transparent 50%)',
      }}
    >
      {/* Header: magnet clock + date */}
      <div className="flex-shrink-0 flex items-end justify-between gap-4">
        <MagnetClock />
        <div className="text-right">
          <div className="text-xl text-[#6b6354]" style={HANDWRITING}>
            {dateStr}
          </div>
        </div>
      </div>

      {/* Weather magnets */}
      <div className="flex-shrink-0">
        <WeatherMagnets weatherData={weatherData} weatherLoading={weatherLoading} />
      </div>

      {/* Main: polaroids left, notes right */}
      <div className="flex-1 min-h-0 grid grid-cols-[5fr_3fr] gap-5">
        <div className="min-h-0 flex flex-col gap-4">
          <div className="flex-[3] min-h-0">
            <PolaroidPhoto photos={photos} />
          </div>
          {hasMemories && (
            <div
              className="flex-[1] min-h-0 bg-white p-2 shadow-lg"
              style={{ transform: 'rotate(1.4deg)' }}
            >
              <OnThisDay photos={photos} className="text-[#6b6354]" />
            </div>
          )}
        </div>

        <div className="min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Gold-star milestone chip */}
          <div
            className="bg-white rounded-xl shadow-md px-3 py-2.5 flex-shrink-0"
            style={
              {
                transform: 'rotate(-1deg)',
                '--milestone-ring': '#d9a324',
                '--progress-bg': '#efe7d4',
                '--text': '#4a443a',
                '--text-3': '#a89f8d',
              } as React.CSSProperties
            }
          >
            <div className="text-[10px] uppercase tracking-wider text-[#a89f8d] font-bold mb-1">
              ⭐ Star chart
            </div>
            <MilestoneWidget sobrietyDate={sobrietyDate} />
          </div>

          {/* Sticky-note agenda */}
          <AgendaList
            events={events}
            loading={calendarLoading}
            maxItems={6}
            noteColors={NOTE_COLORS}
            className="flex-shrink-0"
          />

          {showRadar && radarData && (
            <div
              className="flex-shrink-0 bg-white p-1.5 shadow-md rounded-lg overflow-hidden h-40"
              style={{ transform: 'rotate(0.6deg)' }}
            >
              <RadarTiles data={radarData} fill />
            </div>
          )}

          <div className="mt-auto flex-shrink-0 flex flex-col gap-3">
            {wordOfDay && (
              <div
                className="bg-[#fff6a8] shadow-md px-3 py-2 text-[#5c5546]"
                style={{ transform: 'rotate(-1.1deg)' }}
              >
                <div className="text-[10px] uppercase tracking-wider text-[#a89f8d] font-bold mb-1">
                  Palabra del día
                </div>
                <WordOfDayWidget word={wordOfDay} compact label="" />
              </div>
            )}
            <TvGuide mediaItems={mediaItems} />
            <HouseNotes sessions={sessions} piholeData={piholeData} />
          </div>
        </div>
      </div>
    </div>
  )
}
