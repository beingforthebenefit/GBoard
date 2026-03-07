import { PhotoBackground } from './components/PhotoBackground.js'
import { WeatherWidget } from './components/WeatherWidget.js'
import { ClockWidget } from './components/ClockWidget.js'
import { SoberCounter } from './components/SoberCounter.js'
import { PlexWidget } from './components/PlexWidget.js'
import { CalendarWidget } from './components/CalendarWidget.js'
import { useWeather } from './hooks/useWeather.js'
import { useCalendar } from './hooks/useCalendar.js'
import { usePlex } from './hooks/usePlex.js'
import { usePhotos } from './hooks/usePhotos.js'

const SOBRIETY_DATE = import.meta.env.VITE_SOBRIETY_DATE as string

export function App() {
  const { data: weatherData, loading: weatherLoading } = useWeather()
  const { events, loading: calendarLoading } = useCalendar()
  const { session, loading: plexLoading } = usePlex()
  const { photos } = usePhotos()

  return (
    <div className="min-h-screen w-full relative overflow-hidden font-sans">
      <PhotoBackground photos={photos} />

      <div className="relative z-10 min-h-screen p-4 flex flex-col gap-4">
        {/* Top section: weather left, clock+sober+plex right */}
        <div className="flex gap-4 flex-1">
          {/* Left column — Weather */}
          <div className="flex-1">
            <WeatherWidget data={weatherData} loading={weatherLoading} />
          </div>

          {/* Right column — Clock, Sober Counter, Plex */}
          <div className="flex-1 flex flex-col gap-4">
            <ClockWidget />
            <SoberCounter sobrietyDate={SOBRIETY_DATE} />
            <PlexWidget session={session} loading={plexLoading} />
          </div>
        </div>

        {/* Bottom section — Calendar */}
        <div className="flex-shrink-0">
          <CalendarWidget events={events} loading={calendarLoading} />
        </div>
      </div>
    </div>
  )
}
