import { PhotoBackground } from '../components/PhotoBackground.js'
import { WeatherHeader, ForecastStrip } from '../components/WeatherWidget.js'
import { ClockWidget } from '../components/ClockWidget.js'
import { AstroWidget } from '../components/AstroWidget.js'
import { SoberCounter } from '../components/SoberCounter.js'
import { MediaWidget } from '../components/MediaWidget.js'
import { PlexWidget } from '../components/PlexWidget.js'
import { CalendarGrid } from '../components/CalendarGrid.js'
import { PiholeWidget } from '../components/PiholeWidget.js'
import { LayoutProps } from './index.js'

export function ZenLayout({
  weatherData,
  weatherLoading,
  events,
  calendarLoading,
  sessions,
  plexLoading,
  piholeData,
  piholeLoading,
  photos,
  mediaItems,
  mediaLoading,
  sobrietyDate,
}: LayoutProps) {
  return (
    <div className="h-screen w-full overflow-hidden flex flex-col p-5 gap-4">
      {/* Top bar: Clock left, Weather right */}
      <div className="flex-shrink-0 flex items-start justify-between gap-4">
        <ClockWidget />
        <WeatherHeader data={weatherData} loading={weatherLoading} />
      </div>

      {/* Forecast strip */}
      <div className="flex-shrink-0">
        <ForecastStrip data={weatherData} loading={weatherLoading} />
      </div>

      {/* Sober + Pihole row */}
      <div className="flex-shrink-0 flex gap-3 items-stretch">
        <SoberCounter sobrietyDate={sobrietyDate} className="flex-1" />
        <PiholeWidget data={piholeData} loading={piholeLoading} className="flex-1" />
      </div>

      {/* Photo — takes all remaining space */}
      <div className="flex-1 min-h-0">
        <PhotoBackground photos={photos} />
      </div>

      {/* Plex now playing */}
      <div className="flex-shrink-0">
        <PlexWidget sessions={sessions} loading={plexLoading} />
      </div>

      {/* Upcoming + Calendar side by side */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-4">
        <MediaWidget
          items={mediaItems}
          loading={mediaLoading}
          className="card rounded-xl px-4 py-3"
        />
        <CalendarGrid
          events={events}
          loading={calendarLoading}
          numDays={4}
          hourHeight={28}
          className="card rounded-xl px-4 py-3"
        />
      </div>

      {/* Astrology */}
      <div className="flex-shrink-0">
        <AstroWidget />
      </div>
    </div>
  )
}
