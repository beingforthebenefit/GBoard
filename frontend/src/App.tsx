import { PhotoBackground } from './components/PhotoBackground.js'
import { WeatherWidget } from './components/WeatherWidget.js'
import { SunArcWidget } from './components/SunArcWidget.js'
import { ClockWidget } from './components/ClockWidget.js'
import { SoberCounter } from './components/SoberCounter.js'
import { PlexWidget } from './components/PlexWidget.js'
import { CalendarWidget } from './components/CalendarWidget.js'
import { useWeather } from './hooks/useWeather.js'
import { useCalendar } from './hooks/useCalendar.js'
import { usePlex } from './hooks/usePlex.js'
import { usePhotos } from './hooks/usePhotos.js'
import { useVersion } from './hooks/useVersion.js'

const SOBRIETY_DATE = import.meta.env.VITE_SOBRIETY_DATE as string

export function App() {
  useVersion()
  const { data: weatherData, loading: weatherLoading } = useWeather()
  const { events, loading: calendarLoading } = useCalendar()
  const { sessions, loading: plexLoading } = usePlex()
  const { photos } = usePhotos()

  return (
    <div className="h-screen w-full relative overflow-hidden font-sans flex flex-col">
      <PhotoBackground photos={photos} />

      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Top strip */}
        <div className="flex-shrink-0 flex items-start gap-4">
          <div
            className="w-80 flex-shrink-0 flex flex-col gap-2 widget-enter"
            style={{ animationDelay: '0ms' }}
          >
            <WeatherWidget data={weatherData} loading={weatherLoading} />
            <SunArcWidget
              sunrise={weatherData?.current.sunrise ?? null}
              sunset={weatherData?.current.sunset ?? null}
              loading={weatherLoading}
            />
          </div>
          <div className="flex-1 min-w-0 pt-1 widget-enter" style={{ animationDelay: '60ms' }}>
            <ClockWidget />
          </div>
          <div
            className="w-72 flex-shrink-0 flex flex-col gap-2 widget-enter"
            style={{ animationDelay: '110ms' }}
          >
            <SoberCounter sobrietyDate={SOBRIETY_DATE} />
            <PlexWidget sessions={sessions} loading={plexLoading} />
          </div>
        </div>

        {/* Middle spacer — photo breathes here */}
        <div className="flex-1" />

        {/* Bottom strip — calendar */}
        <div className="flex-shrink-0 widget-enter" style={{ animationDelay: '160ms' }}>
          <CalendarWidget events={events} loading={calendarLoading} />
        </div>
      </div>
    </div>
  )
}
