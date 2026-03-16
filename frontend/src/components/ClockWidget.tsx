import { useClock } from '../hooks/useClock.js'

export function ClockWidget() {
  const now = useClock()

  const timeParts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(now)
  const dayPeriod = timeParts.find((part) => part.type === 'dayPeriod')?.value ?? ''
  const timeStr = timeParts
    .filter((part) => part.type !== 'dayPeriod')
    .map((part) => part.value)
    .join('')
    .replace(/\s+/g, '')

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div>
      <div
        className="text-[clamp(3.5rem,8vw,5rem)] leading-none font-extralight tracking-tight tabular-nums whitespace-nowrap inline-block relative"
        style={{ color: 'var(--text)' }}
      >
        <span>{timeStr}</span>
        <span
          className="text-lg leading-none tracking-normal absolute left-full top-1 ml-1.5 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          {dayPeriod}
        </span>
      </div>
      <div className="text-sm font-light mt-1 tracking-wide" style={{ color: 'var(--text-3)' }}>
        {dateStr}
      </div>
    </div>
  )
}
