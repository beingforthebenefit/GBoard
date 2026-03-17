import { useEffect, useState } from 'react'
import { useWeather } from './hooks/useWeather.js'
import { useCalendar } from './hooks/useCalendar.js'
import { usePlex } from './hooks/usePlex.js'
import { usePihole } from './hooks/usePihole.js'
import { usePhotos } from './hooks/usePhotos.js'
import { useVersion } from './hooks/useVersion.js'
import { useMedia } from './hooks/useMedia.js'
import { useRadar } from './hooks/useRadar.js'
import { useDayNight } from './hooks/useDayNight.js'
import { getLayout, DEFAULT_LAYOUT } from './layouts/index.js'

const SOBRIETY_DATE = import.meta.env.VITE_SOBRIETY_DATE as string

function useLayoutPreference() {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const res = await fetch('/admin/theme', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { layout?: string }
        if (data.layout) setLayout(data.layout)
      } catch {
        // Ignore — will retry
      }
    }
    fetchLayout()
    const id = setInterval(fetchLayout, 10_000)
    return () => clearInterval(id)
  }, [])

  return layout
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

  // Day/night theme (zen layout uses this; classic ignores it)
  useDayNight(weatherData)

  const layoutName = useLayoutPreference()
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
      sobrietyDate={SOBRIETY_DATE}
    />
  )
}
