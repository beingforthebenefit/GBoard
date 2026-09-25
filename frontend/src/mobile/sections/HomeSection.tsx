import { HomeAssistantSummary, WeatherData } from '../../types/index.js'
import { Glyph, Label, Notice, Sparkline } from '../parts.js'
import { indoorHumidity, weekday } from '../status.js'
import { ExploreId, Pt } from '../explorerData.js'

interface Props {
  weather: WeatherData | null
  ha: HomeAssistantSummary | null
  failed: { weather: boolean; ha: boolean }
  onExplore: (id: ExploreId) => void
}

export function HomeSection({ weather, ha, failed, onExplore }: Props) {
  return (
    <>
      {weather ? (
        <Weather w={weather} />
      ) : (
        failed.weather && <Notice status="bad" title="The weather didn't load" />
      )}
      <Thermal ha={ha} failed={failed.ha} weather={weather} onExplore={onExplore} />
    </>
  )
}

function Weather({ w }: { w: WeatherData }) {
  const days = w.forecast.slice(0, 5)
  const lo = Math.min(...days.map((d) => d.low))
  const hi = Math.max(...days.map((d) => d.high))
  const span = hi - lo || 1
  const c = w.current
  return (
    <div id="row-wx">
      <div className="gbm-wx">
        <span className="gbm-big gbm-wx-temp">{Math.round(c.temp)}°</span>
        <span>
          <span className="gbm-strong gbm-cap">{c.description}</span>
          <br />
          <span className="gbm-muted gbm-small">
            Feels like {Math.round(c.feelsLike)}°, wind {c.windDirection} {Math.round(c.windSpeed)}{' '}
            mph, humidity {c.humidity}%
          </span>
        </span>
      </div>
      <table className="gbm-fc">
        <tbody>
          {days.map((d, i) => (
            <tr key={d.date}>
              <td>{i === 0 ? 'Today' : weekday(d.date, 'short')}</td>
              <td>
                <div
                  className="gbm-range"
                  role="img"
                  aria-label={`Low ${Math.round(d.low)}°, high ${Math.round(d.high)}°`}
                >
                  <i
                    style={{
                      left: `${((d.low - lo) / span) * 100}%`,
                      right: `${100 - ((d.high - lo) / span) * 100}%`,
                    }}
                  />
                </div>
              </td>
              <td>
                <span className="gbm-muted">{Math.round(d.low)}°</span> {Math.round(d.high)}°
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Thermal({
  ha,
  failed,
  weather,
  onExplore,
}: {
  ha: HomeAssistantSummary | null
  failed: boolean
  weather: WeatherData | null
  onExplore: (id: ExploreId) => void
}) {
  if (!ha) return failed ? <Notice status="bad" title="Home Assistant data didn't load" /> : null
  if (!ha.configured) {
    return (
      <Notice status="none" title="Home Assistant isn't connected">
        Set HOMEASSISTANT_URL and HOMEASSISTANT_TOKEN in GBoard's .env to show indoor temperatures.
      </Notice>
    )
  }
  const t = ha.temps
  const inside: Pt[] = t.points
    .filter((p) => p.indoor !== null)
    .map((p) => [p.t * 1000, p.indoor as number])
  const outside: Pt[] = t.points
    .filter((p) => p.outdoor !== null)
    .map((p) => [p.t * 1000, p.outdoor as number])
  const inRH = indoorHumidity(ha)
  const outRH = ha.sensors.find(
    (s) => s.kind === 'humidity' && /exterior|outdoor|outside/i.test(s.name)
  )?.value
  const outNow = t.outdoorNow ?? weather?.current.temp ?? null
  return (
    <>
      <button
        className="gbm-plain"
        id="row-temps"
        onClick={() => onExplore('temps')}
        disabled={!t.available}
      >
        <Label right={t.available ? 'tap to explore' : undefined}>
          Inside and outside, last {t.hours} hours
        </Label>
        <div className="gbm-pair">
          <div>
            <span className="gbm-muted gbm-small">Inside</span>
            <br />
            <span className="gbm-mid" style={{ color: 'var(--home)' }}>
              {t.indoorNow !== null ? `${Math.round(t.indoorNow)}°` : '—'}
            </span>
            {inRH !== null && <span className="gbm-unit">{Math.round(inRH)}% RH</span>}
          </div>
          <div>
            <span className="gbm-muted gbm-small">Outside</span>
            <br />
            <span className="gbm-mid">{outNow !== null ? `${Math.round(outNow)}°` : '—'}</span>
            {outRH !== undefined && <span className="gbm-unit">{Math.round(outRH)}% RH</span>}
          </div>
        </div>
        {t.available ? (
          <span className="gbm-block" style={{ marginBlockStart: 10 }}>
            <Sparkline data={inside} second={outside} width={400} height={70} fill />
          </span>
        ) : (
          <span className="gbm-small gbm-muted gbm-block">
            Temperature history isn't available from Home Assistant.
          </span>
        )}
      </button>
      <div className="gbm-status">
        <Glyph status={ha.reachable ? 'good' : 'warn'} />
        {ha.reachable
          ? 'Home Assistant connected'
          : "Home Assistant isn't answering; showing its last readings"}
      </div>
    </>
  )
}
