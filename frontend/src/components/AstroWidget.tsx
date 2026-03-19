import { useEffect, useMemo, useState } from 'react'
import { getAstrologySnapshot } from '../utils/astrology.js'

export function AstroWidget() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const snapshot = useMemo(() => getAstrologySnapshot(now), [now])

  return (
    <div className="card rounded-xl px-4 py-3.5 flex gap-3.5 items-start">
      <div className="text-3xl flex-shrink-0" style={{ color: 'var(--astro-accent)' }}>
        {snapshot.sign.glyph}
      </div>
      <div className="flex-1 min-w-0 flex gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium" style={{ color: 'var(--text)' }}>
            {snapshot.sign.name}
          </div>
          <div className="text-[11px] font-light" style={{ color: 'var(--text-4)' }}>
            {snapshot.signRange} · {snapshot.moon.emoji} {snapshot.moon.name}
          </div>
          <div
            className="text-[11px] font-light leading-relaxed mt-1"
            style={{ color: 'var(--text-3)' }}
          >
            {snapshot.message}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0 items-end pt-0.5">
          {[
            snapshot.weekday.dayName,
            `${snapshot.sign.element} · ${snapshot.sign.modality}`,
            `Lucky ${snapshot.luckyWindow}`,
          ].map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-normal px-2.5 py-0.5 rounded-md"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--text-3)',
                border: '1px solid var(--border)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
