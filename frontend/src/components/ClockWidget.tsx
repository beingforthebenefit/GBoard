import { useClock } from '../hooks/useClock.js'

export function ClockWidget() {
  const now = useClock()

  const timeParts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
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
  })

  return (
    <div className="text-white text-center py-2">
      <div className="text-[clamp(3.6rem,5.9vw,5.5rem)] leading-none font-extralight tracking-[0.04em] tabular-nums drop-shadow-lg whitespace-nowrap inline-block relative">
        <span className="block">{timeStr}</span>
        <span className="text-xl leading-none tracking-normal absolute left-full top-2 ml-2">
          {dayPeriod}
        </span>
      </div>
      <div className="text-[clamp(1.2rem,2vw,1.7rem)] font-light mt-1 text-white/70 drop-shadow-md">
        {dateStr}
      </div>
    </div>
  )
}
