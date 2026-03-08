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
      <div className="text-7xl font-extralight tracking-wide tabular-nums drop-shadow-lg whitespace-nowrap inline-flex items-start">
        <span>{timeStr}</span>
        <span className="text-2xl leading-none align-super mt-2 ml-1 tracking-normal">{dayPeriod}</span>
      </div>
      <div className="text-3xl font-light mt-1 text-white/70 drop-shadow-md">{dateStr}</div>
    </div>
  )
}
