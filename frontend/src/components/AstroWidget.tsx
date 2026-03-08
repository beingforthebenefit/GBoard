import { useEffect, useMemo, useState } from 'react'
import { getAstrologySnapshot } from '../utils/astrology.js'

export function AstroWidget() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const snapshot = useMemo(() => getAstrologySnapshot(now), [now])
  const constellation = snapshot.constellation

  return (
    <div className="relative overflow-hidden px-4 py-3 text-white bg-slate-900/65 border border-white/24 rounded-2xl shadow-xl isolate">
      <div className="absolute inset-0 bg-gradient-to-r from-sky-400/15 via-indigo-400/10 to-amber-300/10" />
      <div className="absolute inset-0 astro-stars opacity-70" />

      <div className="relative">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
            Cosmic Snapshot
          </div>
          <div className="flex items-end gap-2 leading-none">
            <span className="text-[clamp(1.4rem,2.3vw,1.85rem)] font-semibold tracking-[0.02em]">
              {snapshot.sign.name}
            </span>
            <span className="text-sm text-white/70">{snapshot.signRange}</span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-white/85">
            <div className="rounded-lg bg-white/12 px-2 py-1">
              <span className="text-white/55">Today</span> {snapshot.weekday.dayName} ·{' '}
              {snapshot.weekday.ruler}
            </div>
            <div className="rounded-lg bg-white/12 px-2 py-1">
              <span className="text-white/55">Moon</span> {snapshot.moon.emoji} {snapshot.moon.name}
            </div>
            <div className="rounded-lg bg-white/12 px-2 py-1">
              <span className="text-white/55">Vibe</span> {snapshot.sign.element} ·{' '}
              {snapshot.sign.modality}
            </div>
            <div className="rounded-lg bg-white/12 px-2 py-1">
              <span className="text-white/55">Lucky</span> {snapshot.luckyWindow}
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-white/15 bg-slate-950/35 px-3 py-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-white/65">
              <span>Constellation</span>
              <span>{constellation.name}</span>
            </div>
            <svg viewBox="0 0 100 62" className="w-full h-20 mt-1">
              <rect x="0" y="0" width="100" height="62" rx="8" fill="rgba(2,6,23,0.35)" />
              {constellation.lines.map(([a, b], idx) => {
                const start = constellation.stars[a]
                const end = constellation.stars[b]
                return (
                  <line
                    key={`${a}-${b}-${idx}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="rgba(147,197,253,0.55)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                )
              })}
              {constellation.stars.map((star, idx) => (
                <circle
                  key={`${star.x}-${star.y}-${idx}`}
                  cx={star.x}
                  cy={star.y}
                  r={star.size}
                  className="astro-twinkle"
                  style={{ animationDelay: `${idx * 120}ms` }}
                  fill={idx === 0 ? '#facc15' : '#f8fafc'}
                />
              ))}
            </svg>
            <div className="text-[11px] text-white/70 -mt-1">
              Notable star: {constellation.notable}
            </div>
          </div>

          <div className="mt-2 text-sm leading-snug text-white/90">{snapshot.message}</div>
          <div className="text-xs mt-1 text-white/70">
            {snapshot.sign.traits} Moon illumination: {snapshot.moon.illumination}%.
          </div>
        </div>
      </div>
    </div>
  )
}
