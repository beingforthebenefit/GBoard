import { WeatherData } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface WeatherWidgetProps {
  data: WeatherData | null
  loading: boolean
}

function WeatherIcon({
  icon,
  alt = '',
  className = 'w-12 h-12',
}: {
  icon: string
  alt?: string
  className?: string
}) {
  return (
    <img src={`https://openweathermap.org/img/wn/${icon}@2x.png`} alt={alt} className={className} />
  )
}

export function WeatherWidget({ data, loading }: WeatherWidgetProps) {
  if (loading) {
    return (
      <GlassPanel className="p-4 text-white animate-pulse">
        <div className="h-24 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!data) {
    return (
      <GlassPanel className="p-4 text-white/70 min-h-[170px] flex flex-col items-center justify-center gap-2 text-center">
        <div className="text-3xl leading-none">☁</div>
        <p className="text-base font-medium">Weather temporarily unavailable</p>
        <p className="text-sm text-white/50">Retrying automatically...</p>
      </GlassPanel>
    )
  }

  const { current, forecast } = data

  return (
    <GlassPanel className="p-4 text-white flex flex-col gap-2">
      {/* Current: centered icon + temp, with description beneath */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center gap-2">
          <WeatherIcon icon={current.icon} alt={current.description} className="w-16 h-16" />
          <div className="text-6xl font-light leading-none">{current.temp}°</div>
        </div>
        <div className="text-white/70 capitalize text-base text-center">{current.description}</div>
      </div>

      {/* Details row */}
      <div className="text-base text-white/60 flex flex-wrap justify-center gap-x-3 text-center">
        <span>Feels {current.feelsLike}°</span>
        <span>{current.humidity}%</span>
        <span>{current.windSpeed} mph</span>
      </div>

      {/* Forecast row */}
      <div className="flex justify-between pt-1 border-t border-white/10">
        {forecast.map((day, i) => {
          const label =
            i === 0 && day.date === new Date().toISOString().slice(0, 10)
              ? 'Today'
              : new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                })
          return (
            <div key={day.date} className="text-center">
              <div className="text-white/70 text-xs font-medium">{label}</div>
              <WeatherIcon icon={day.icon} alt={day.description} className="w-8 h-8 mx-auto" />
              <div className="text-xs">
                <span className="font-medium">{day.high}°</span>
                <span className="text-white/40"> {day.low}°</span>
              </div>
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}
