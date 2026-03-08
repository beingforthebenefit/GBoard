import { useClock } from '../hooks/useClock.js'

export function ClockWidget() {
  const now = useClock()

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="text-white text-center py-2">
      <div className="text-7xl font-extralight tracking-widest tabular-nums drop-shadow-lg">
        {timeStr}
      </div>
      <div className="text-2xl font-light mt-1 text-white/70 drop-shadow-md">{dateStr}</div>
    </div>
  )
}
