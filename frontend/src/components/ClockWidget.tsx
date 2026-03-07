import { useClock } from '../hooks/useClock.js'
import { GlassPanel } from './GlassPanel.js'

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
    <GlassPanel className="p-6 text-white text-center">
      <div className="text-6xl font-light tracking-widest tabular-nums">{timeStr}</div>
      <div className="text-xl font-light mt-2 text-white/80">{dateStr}</div>
    </GlassPanel>
  )
}
