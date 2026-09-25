import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { FitnessHistory, TempHistory } from '../types/index.js'
import { ExploreId, changeTone, exploreSpec, valuesAt, windowStats } from './explorerData.js'
import { fmt } from './status.js'

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  CanvasRenderer,
])

const DAY = 86_400_000

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

interface Props {
  id: ExploreId
  temps: TempHistory | null
  onClose: () => void
}

/**
 * Full-screen chart explorer. Tap or drag along the chart for a reading, pinch or use
 * the slider to zoom, and the stats underneath follow whatever is in view.
 *
 * History comes from /api/fitness/history — every recorded day — fetched when the
 * explorer opens, so the main page never pays for it.
 */
export default function Explorer({ id, temps, onClose }: Props) {
  const [history, setHistory] = useState<FitnessHistory | null>(null)
  const [histError, setHistError] = useState<string | null>(null)
  const needsHistory = id !== 'temps'

  useEffect(() => {
    if (!needsHistory) return
    let cancelled = false
    fetch('/api/fitness/history', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`history answered ${r.status}`)
        return r.json() as Promise<FitnessHistory>
      })
      .then((h) => !cancelled && setHistory(h))
      .catch((e) => !cancelled && setHistError(e instanceof Error ? e.message : 'failed'))
    return () => {
      cancelled = true
    }
  }, [needsHistory])

  // Only the temperature chart reads HA; a background refresh must not rebuild (and
  // un-zoom) a health chart just because a new HA object arrived
  const tempsForSpec = id === 'temps' ? temps : null
  const spec = useMemo(() => exploreSpec(id, history, tempsForSpec), [id, history, tempsForSpec])
  const primary = useMemo(() => spec.series[0]?.data ?? [], [spec])
  const ready = needsHistory ? history !== null : true
  const empty = ready && primary.length === 0

  const box = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const [view, setView] = useState<[number, number] | null>(null)

  // Esc closes; focus starts on the close button and body scroll is locked underneath
  useEffect(() => {
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const initialWindow = useCallback((): [number, number] => {
    const t0 = primary[0][0]
    const t1 = primary[primary.length - 1][0]
    return [spec.defaultRange ? Math.max(t0, t1 - (spec.defaultRange - 1) * DAY) : t0, t1]
  }, [primary, spec.defaultRange])

  useEffect(() => {
    if (!ready || empty || spec.held || !box.current) return
    const el = box.current
    const c = echarts.init(el, undefined, { renderer: 'canvas' })
    chart.current = c

    const sec = cssVar(`--${spec.section}`)
    const ink = cssVar('--ink')
    const ink2 = cssVar('--ink-2')
    const rule = cssVar('--rule')
    const surface = cssVar('--surface')
    const sem = { good: cssVar('--good'), warn: cssVar('--warn') }
    const [start, end] = initialWindow()

    const series = spec.series.map((s, i) => ({
      name: s.name,
      type: s.kind,
      data: s.data,
      showSymbol: Boolean(s.points),
      symbolSize: 5,
      itemStyle: {
        color: s.secondary ? ink2 : sec,
        borderRadius: s.kind === 'bar' ? [3, 3, 0, 0] : 0,
      },
      lineStyle: {
        width: s.secondary ? 1.6 : 2.2,
        type: s.dashed ? 'dashed' : 'solid',
        color: s.secondary ? ink2 : sec,
      },
      areaStyle: i === 0 && s.kind === 'line' ? { color: sec, opacity: 0.12 } : undefined,
      barMaxWidth: 14,
      emphasis: { disabled: true },
      ...(i === 0
        ? {
            markArea: spec.bands.length
              ? {
                  silent: true,
                  data: spec.bands.map((b) => [
                    { yAxis: b.from, itemStyle: { color: sem[b.status], opacity: 0.09 } },
                    { yAxis: b.to },
                  ]),
                }
              : undefined,
            markLine: spec.lines.length
              ? {
                  silent: true,
                  symbol: 'none',
                  label: { color: ink2, fontSize: 11, position: 'insideEndTop', formatter: '{b}' },
                  data: spec.lines.map((l) => ({
                    yAxis: l.at,
                    name: l.label,
                    lineStyle: { color: sem[l.status], type: 'dashed', width: 1.2 },
                  })),
                }
              : undefined,
          }
        : {}),
    }))

    const option: EChartsCoreOption = {
      animation: false,
      textStyle: { fontFamily: 'Barlow, sans-serif', color: ink2 },
      grid: { left: 44, right: 12, top: 14, bottom: 84 },
      legend:
        spec.series.length > 1
          ? {
              bottom: 0,
              itemWidth: 16,
              itemHeight: 3,
              icon: 'rect',
              textStyle: { color: ink2, fontSize: 12 },
            }
          : { show: false },
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove|click',
        showContent: false,
        axisPointer: {
          type: 'line',
          snap: true,
          lineStyle: { color: ink, width: 1 },
          label: { show: false },
        },
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: rule } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: ink2,
          fontSize: 11,
          hideOverlap: true,
          formatter: spec.hours ? '{h}:{mm}' : '{MMM} {d}',
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitNumber: 4,
        axisLabel: { color: ink2, fontSize: 11 },
        splitLine: { lineStyle: { color: rule, opacity: 0.7 } },
      },
      dataZoom: [
        {
          type: 'inside',
          startValue: start,
          endValue: end,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          minValueSpan: spec.hours ? 2 * 3600e3 : 3 * DAY,
        },
        {
          type: 'slider',
          height: 18,
          bottom: 30,
          startValue: start,
          endValue: end,
          borderColor: 'transparent',
          backgroundColor: surface,
          fillerColor: `${sec}33`,
          handleStyle: { color: sec, borderColor: sec },
          moveHandleSize: 0,
          showDetail: false,
          dataBackground: {
            lineStyle: { color: ink2, opacity: 0.5 },
            areaStyle: { color: ink2, opacity: 0.12 },
          },
          selectedDataBackground: {
            lineStyle: { color: sec },
            areaStyle: { color: sec, opacity: 0.2 },
          },
        },
      ],
      series,
    }
    c.setOption(option)
    setView([start, end])
    setCursor(primary[primary.length - 1][0])

    c.on('updateAxisPointer', (ev: unknown) => {
      const info = (ev as { axesInfo?: { value: number }[] }).axesInfo?.[0]
      if (info) setCursor(info.value)
    })
    c.on('datazoom', () => {
      const dz = (c.getOption() as { dataZoom: { startValue?: number; endValue?: number }[] })
        .dataZoom[0]
      if (typeof dz.startValue === 'number' && typeof dz.endValue === 'number')
        setView([dz.startValue, dz.endValue])
    })
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el)
    return () => {
      ro.disconnect()
      c.dispose()
      chart.current = null
    }
  }, [ready, empty, spec, primary, initialWindow])

  const setRange = (days: number) => {
    const c = chart.current
    if (!c || !primary.length) return
    const t1 = primary[primary.length - 1][0]
    const t0 = days ? Math.max(primary[0][0], t1 - (days - 1) * DAY) : primary[0][0]
    c.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, startValue: t0, endValue: t1 })
    c.dispatchAction({ type: 'dataZoom', dataZoomIndex: 1, startValue: t0, endValue: t1 })
    setView([t0, t1])
  }

  const stats = view ? windowStats(primary, view[0], view[1]) : null
  const span = view ? Math.round((view[1] - view[0]) / DAY) + 1 : 0
  const allSpan = primary.length
    ? Math.round((primary[primary.length - 1][0] - primary[0][0]) / DAY) + 1
    : 0
  const f = (n: number) => (spec.decimals ? n.toFixed(spec.decimals) : fmt(n))
  const readout = cursor !== null ? spec.read(valuesAt(spec, cursor)) : ''
  const when =
    cursor === null
      ? ''
      : spec.hours
        ? new Date(cursor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : new Date(cursor).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
  const tone = stats ? changeTone(stats.change, spec.better) : 'none'

  return (
    <div
      className={`gbm-sheet c-${spec.section}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gbm-sh-title"
    >
      <div className="gbm-sheet-in">
        <div className="gbm-sh-top">
          <h3 id="gbm-sh-title">{spec.title}</h3>
          <button className="gbm-close" ref={closeBtn} onClick={onClose} aria-label="Close">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {histError && needsHistory && !history ? (
          <p className="gbm-sh-msg">The history didn't load ({histError}). Close and try again.</p>
        ) : !ready ? (
          <p className="gbm-sh-msg">Loading the full history…</p>
        ) : spec.held ? (
          <div className="gbm-sh-msg gbm-heldrow">
            <div>
              <strong>{spec.title} is held</strong>
              <span>
                Its units changed. The series is paused until the change is confirmed on the health
                service.
              </span>
            </div>
            <span className="gbm-hbox" aria-hidden="true" />
          </div>
        ) : empty ? (
          <p className="gbm-sh-msg">No readings recorded yet.</p>
        ) : (
          <>
            <div className="gbm-readout" aria-live="polite">
              <span className="gbm-val">
                {readout} <span className="gbm-unit">{spec.unit}</span>
              </span>
              <span className="gbm-when">{when}</span>
            </div>
            {spec.ranges.length > 0 && (
              <div className="gbm-ranges" role="group" aria-label="Range">
                {spec.ranges
                  .filter((r) => r === 0 || r < allSpan + 7)
                  .map((r) => {
                    const active = r
                      ? Math.abs(span - Math.min(r, allSpan)) <= 1
                      : Math.abs(span - allSpan) <= 1
                    return (
                      <button key={r} aria-pressed={active} onClick={() => setRange(r)}>
                        {r ? `${r} days` : 'All'}
                      </button>
                    )
                  })}
              </div>
            )}
            <div className="gbm-chartbox" ref={box} />
            <p className="gbm-hint">Tap for a value. Drag to pan. Pinch to zoom.</p>
            {stats && (
              <table className="gbm-stats">
                <tbody>
                  <tr>
                    <th>Readings in view</th>
                    <td>
                      {stats.count}
                      {spec.hours
                        ? ''
                        : `, over ${stats.spanDays} ${stats.spanDays === 1 ? 'day' : 'days'}`}
                    </td>
                  </tr>
                  <tr>
                    <th>Low</th>
                    <td>{f(stats.low)}</td>
                  </tr>
                  <tr>
                    <th>High</th>
                    <td>{f(stats.high)}</td>
                  </tr>
                  <tr>
                    <th>Average</th>
                    <td>{f(stats.average)}</td>
                  </tr>
                  <tr>
                    <th>Change, first to last</th>
                    <td className={`gbm-tone-${tone}`}>
                      {stats.change > 0 ? '▲ +' : stats.change < 0 ? '▼ −' : ''}
                      {f(Math.abs(stats.change))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
