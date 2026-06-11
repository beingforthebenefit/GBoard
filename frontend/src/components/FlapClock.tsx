import { useClock } from '../hooks/useClock.js'
import { Flap, FlapChar } from './SplitFlapBoard.js'

interface FlapClockProps {
  className?: string
}

/** Big split-flap clock: digits spin on rollover, seconds flip every second */
export function FlapClock({ className = '' }: FlapClockProps) {
  const now = useClock()
  const h = now.getHours()
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const chars = `${h % 12 || 12}:${m}`.split('')

  return (
    <div className={`flex items-end gap-2 font-mono ${className}`}>
      <span className="text-[clamp(2.2rem,5vw,3.4rem)] leading-none" style={{ color: '#e7b75f' }}>
        {chars.map((char, i) =>
          char === ':' ? (
            <Flap key={`colon-${i}`} char=":" />
          ) : (
            <FlapChar key={i} char={char} delayMs={i * 40} />
          )
        )}
      </span>
      <span className="text-xl leading-none pb-1" style={{ color: 'rgba(231, 183, 95, 0.75)' }}>
        {s.split('').map((char, i) => (
          // Keyed by value so each second remounts the tile and replays the flip
          <Flap key={`s${i}-${char}`} char={char} />
        ))}
      </span>
      <span className="text-sm pb-1 tracking-[0.2em]" style={{ color: 'rgba(231, 183, 95, 0.6)' }}>
        {ampm}
      </span>
    </div>
  )
}
