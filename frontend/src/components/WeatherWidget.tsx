import { WeatherData } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface WeatherWidgetProps {
  data: WeatherData | null
  loading: boolean
}

function WeatherIcon({ icon, alt = '' }: { icon: string; alt?: string }) {
  return (
    <img src={`https://openweathermap.org/img/wn/${icon}@2x.png`} alt={alt} className="w-12 h-12" />
  )
}

function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function WeatherWidget({ data, loading }: WeatherWidgetProps) {
  if (loading) {
    return (
      <GlassPanel className="p-3 text-white animate-pulse">
        <div className="h-12 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!data) {
    return (
      <GlassPanel className="p-3 text-white/50 text-sm">
        <p>Weather unavailable</p>
      </GlassPanel>
    )
  }

  const { current, forecast } = data

  return (
    <GlassPanel className="p-4 text-white flex flex-col gap-2">
      {/* Current: centered icon + temp, with description beneath */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center gap-2">
          <WeatherIcon icon={current.icon} alt={current.description} />
          <div className="text-5xl font-light leading-none">{current.temp}°</div>
        </div>
        <div className="text-white/70 capitalize text-sm text-center">{current.description}</div>
      </div>

      {/* Details row */}
      <div className="text-sm text-white/60 flex flex-wrap gap-x-3">
        <span>Feels {current.feelsLike}°</span>
        <span>{current.humidity}%</span>
        <span>{current.windSpeed} mph</span>
      </div>

      {/* Sunrise / Sunset */}
      <div className="flex gap-3 text-sm text-white/60">
        <span>🌅 {formatTime(current.sunrise)}</span>
        <span>🌇 {formatTime(current.sunset)}</span>
      </div>

      {/* Forecast row */}
      <div className="flex justify-between pt-1 border-t border-white/10">
        {forecast.map((day) => {
          const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
          })
          return (
            <div key={day.date} className="text-center">
              <div className="text-white/50 text-xs">{label}</div>
              <WeatherIcon icon={day.icon} alt={day.description} />
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
