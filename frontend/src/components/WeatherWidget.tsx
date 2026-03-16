import { WeatherData } from '../types/index.js'

interface WeatherHeaderProps {
  data: WeatherData | null
  loading: boolean
}

/** Compact weather display for the top-right corner: just temp + condition */
export function WeatherHeader({ data, loading }: WeatherHeaderProps) {
  if (loading || !data) {
    return (
      <div className="text-right" style={{ color: 'var(--text-3)' }}>
        <div className="text-4xl font-extralight">—°</div>
      </div>
    )
  }

  const { current } = data

  return (
    <div className="text-right">
      <div
        className="text-[clamp(2.8rem,6.5vw,3.6rem)] font-extralight leading-none tabular-nums"
        style={{ color: 'var(--text)' }}
      >
        {current.temp}
        <span className="text-lg font-light" style={{ color: 'var(--text-4)' }}>
          °
        </span>
      </div>
      <div className="text-sm font-light capitalize" style={{ color: 'var(--text-3)' }}>
        {current.description}
      </div>
      <div className="text-xs font-light mt-0.5" style={{ color: 'var(--text-4)' }}>
        Feels {current.feelsLike}° · {current.humidity}% · {current.windSpeed} mph{' '}
        {current.windDirection}
      </div>
    </div>
  )
}

interface ForecastStripProps {
  data: WeatherData | null
  loading: boolean
}

function WeatherIcon({
  icon,
  alt = '',
  className = 'w-8 h-8',
}: {
  icon: string
  alt?: string
  className?: string
}) {
  return (
    <img src={`https://openweathermap.org/img/wn/${icon}@2x.png`} alt={alt} className={className} />
  )
}

/** Horizontal forecast strip as separate pill cards */
export function ForecastStrip({ data, loading }: ForecastStripProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card animate-pulse rounded-xl p-3" style={{ minHeight: 80 }} />
        ))}
      </div>
    )
  }

  const cols = data.forecast.length || 4

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {data.forecast.map((day, i) => {
        const label =
          i === 0
            ? 'Today'
            : new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
              })
        return (
          <div key={day.date} className="card rounded-xl py-2.5 px-1.5 text-center">
            <div
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-3)' }}
            >
              {label}
            </div>
            <WeatherIcon icon={day.icon} alt={day.description} className="w-8 h-8 mx-auto" />
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {day.high}°{' '}
              <span style={{ color: 'var(--text-4)' }} className="font-light">
                {day.low}°
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Keep backward-compat export name
export function WeatherWidget({
  data,
  loading,
}: {
  data: WeatherData | null
  loading: boolean
  hourlyForecast?: unknown
}) {
  return (
    <div className="flex flex-col gap-3">
      <WeatherHeader data={data} loading={loading} />
      <ForecastStrip data={data} loading={loading} />
    </div>
  )
}
