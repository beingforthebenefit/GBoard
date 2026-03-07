import { WeatherData } from '../types/index.js'
import { GlassPanel } from './GlassPanel.js'

interface WeatherWidgetProps {
  data: WeatherData | null
  loading: boolean
}

function WeatherIcon({ icon, alt = '' }: { icon: string; alt?: string }) {
  return (
    <img
      src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
      alt={alt}
      className="w-12 h-12"
    />
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
      <GlassPanel className="p-6 text-white animate-pulse">
        <div className="h-16 bg-white/10 rounded mb-4" />
        <div className="h-8 bg-white/10 rounded mb-2" />
        <div className="h-8 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!data) {
    return (
      <GlassPanel className="p-6 text-white/50 text-center">
        <p>Weather unavailable</p>
      </GlassPanel>
    )
  }

  const { current, forecast } = data

  return (
    <GlassPanel className="p-6 text-white flex flex-col gap-4">
      {/* Current conditions */}
      <div className="flex items-center gap-3">
        <WeatherIcon icon={current.icon} alt={current.description} />
        <div>
          <div className="text-6xl font-light">{current.temp}°</div>
          <div className="text-white/70 capitalize text-sm">{current.description}</div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-1 text-sm text-white/70">
        <span>Feels like {current.feelsLike}°</span>
        <span>Humidity {current.humidity}%</span>
        <span>Wind {current.windSpeed} mph</span>
        <span className="col-span-1" />
      </div>

      {/* Sunrise / Sunset */}
      <div className="flex gap-4 text-sm text-white/70">
        <span>🌅 {formatTime(current.sunrise)}</span>
        <span>🌇 {formatTime(current.sunset)}</span>
      </div>

      {/* 3-day forecast */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
        {forecast.map((day) => {
          const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
          })
          return (
            <div key={day.date} className="text-center">
              <div className="text-white/60 text-xs mb-1">{label}</div>
              <WeatherIcon icon={day.icon} alt={day.description} />
              <div className="text-sm">
                <span className="font-medium">{day.high}°</span>
                <span className="text-white/50 ml-1">{day.low}°</span>
              </div>
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}
