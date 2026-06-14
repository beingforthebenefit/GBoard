import { useEffect, useState } from 'react'
import { useWeather } from './hooks/useWeather.js'
import { useCalendar } from './hooks/useCalendar.js'
import { usePlex } from './hooks/usePlex.js'
import { usePihole } from './hooks/usePihole.js'
import { usePhotos } from './hooks/usePhotos.js'
import { useVersion } from './hooks/useVersion.js'
import { useMedia } from './hooks/useMedia.js'
import { useRadar } from './hooks/useRadar.js'
import { useWordOfDay } from './hooks/useWordOfDay.js'
import { useDayNight } from './hooks/useDayNight.js'
import { getLayout, DEFAULT_LAYOUT } from './layouts/index.js'

const SOBRIETY_DATE = import.meta.env.VITE_SOBRIETY_DATE as string

export type RadarMode = 'adaptive' | 'on' | 'off'

function usePrefs() {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [radarMode, setRadarMode] = useState<RadarMode>('adaptive')

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch('/admin/theme', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { layout?: string; radarMode?: RadarMode }
        if (data.layout) setLayout(data.layout)
        if (data.radarMode && ['adaptive', 'on', 'off'].includes(data.radarMode)) {
          setRadarMode(data.radarMode)
        }
      } catch {
        // Ignore — will retry
      }
    }
    fetchPrefs()
    const id = setInterval(fetchPrefs, 10_000)
    return () => clearInterval(id)
  }, [])

  return { layout, radarMode }
}

export function App() {
  useVersion()
  const { data: weatherData, loading: weatherLoading } = useWeather()
  const { events, loading: calendarLoading } = useCalendar()
  const { sessions, loading: plexLoading } = usePlex()
  const { data: piholeData, loading: piholeLoading } = usePihole()
  const { photos } = usePhotos()
  const { items: mediaItems, loading: mediaLoading } = useMedia()
  const { data: radarData, loading: radarLoading } = useRadar()
  const { word: wordOfDay, loading: wordLoading } = useWordOfDay()

  // Day/night theme (zen layout uses this; classic ignores it)
  useDayNight(weatherData)

  const { layout: layoutName, radarMode } = usePrefs()
  const { component: LayoutComponent } = getLayout(layoutName)

  return (
    <LayoutComponent
      weatherData={weatherData}
      weatherLoading={weatherLoading}
      events={events}
      calendarLoading={calendarLoading}
      sessions={sessions}
      plexLoading={plexLoading}
      piholeData={piholeData}
      piholeLoading={piholeLoading}
      photos={photos}
      mediaItems={mediaItems}
      mediaLoading={mediaLoading}
      radarData={radarData}
      radarLoading={radarLoading}
      radarMode={radarMode}
      sobrietyDate={SOBRIETY_DATE}
      wordOfDay={wordOfDay}
      wordLoading={wordLoading}
    />
  )
}
