import { PhotoBackground } from './components/PhotoBackground.js'
import { WeatherWidget } from './components/WeatherWidget.js'
// import { SunArcWidget } from './components/SunArcWidget.js'
import { ClockWidget } from './components/ClockWidget.js'
import { AstroWidget } from './components/AstroWidget.js'
import { SoberCounter } from './components/SoberCounter.js'
import { MediaWidget } from './components/MediaWidget.js'
import { PlexWidget } from './components/PlexWidget.js'
import { CalendarWidget } from './components/CalendarWidget.js'
import { PiholeWidget } from './components/PiholeWidget.js'
import { useWeather } from './hooks/useWeather.js'
import { useCalendar } from './hooks/useCalendar.js'
import { usePlex } from './hooks/usePlex.js'
import { usePihole } from './hooks/usePihole.js'
import { usePhotos } from './hooks/usePhotos.js'
import { useVersion } from './hooks/useVersion.js'
import { useMedia } from './hooks/useMedia.js'
import { RadarWidget } from './components/RadarWidget.js'
import { useRadar } from './hooks/useRadar.js'

const SOBRIETY_DATE = import.meta.env.VITE_SOBRIETY_DATE as string

export function App() {
  useVersion()
  const { data: weatherData, loading: weatherLoading } = useWeather()
  const { events, loading: calendarLoading } = useCalendar()
  const { sessions, loading: plexLoading } = usePlex()
  const { data: piholeData, loading: piholeLoading } = usePihole()
  const { photos } = usePhotos()
  const { items: mediaItems, loading: mediaLoading } = useMedia()
  const { data: radarData, loading: radarLoading } = useRadar()

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
            <RadarWidget data={radarData} loading={radarLoading} />
          </div>
          <div
            className="flex-1 min-w-0 pt-1 flex flex-col items-center gap-2 widget-enter"
            style={{ animationDelay: '60ms' }}
          >
            <ClockWidget />
            <SoberCounter sobrietyDate={SOBRIETY_DATE} />
            <div className="w-72">
              <PiholeWidget data={piholeData} loading={piholeLoading} />
            </div>
          </div>
          <div
            className="w-80 flex-shrink-0 flex flex-col gap-2 widget-enter"
            style={{ animationDelay: '110ms' }}
          >
            <MediaWidget items={mediaItems} loading={mediaLoading} />
            <PlexWidget sessions={sessions} loading={plexLoading} />
          </div>
        </div>

        {/* Middle spacer — photo breathes here */}
        <div className="flex-1" />

        {/* Bottom strip — calendar + astro */}
        <div
          className="flex-shrink-0 flex items-end gap-4 widget-enter"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex-1 min-w-0">
            <CalendarWidget events={events} loading={calendarLoading} />
          </div>
          <div className="w-72 flex-shrink-0">
            <AstroWidget />
          </div>
        </div>
      </div>
    </div>
  )
}
