import { GlassPanel } from './GlassPanel.js'

interface SunArcWidgetProps {
  sunrise: number | null
  sunset: number | null
  loading: boolean
}

function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function normalize(value: number): number {
  return ((value % 1) + 1) % 1
}

function dayNightProgress(now: number, sunrise: number, sunset: number): number {
  const dayDuration = Math.max(sunset - sunrise, 1)
  const nightDuration = Math.max(86400 - dayDuration, 1)

  if (now >= sunrise && now < sunset) {
    return ((now - sunrise) / dayDuration) * 0.5
  }

  // Night segment:
  // - after sunset: run from sunset -> next sunrise
  // - before sunrise: run from previous sunset -> sunrise
  const sunsetAnchor = now >= sunset ? sunset : sunset - 86400
  return 0.5 + ((now - sunsetAnchor) / nightDuration) * 0.5
}

export function SunArcWidget({ sunrise, sunset, loading }: SunArcWidgetProps) {
  if (loading) {
    return (
      <GlassPanel className="p-3 text-white animate-pulse">
        <div className="h-16 bg-white/10 rounded" />
      </GlassPanel>
    )
  }

  if (!sunrise || !sunset || sunset <= sunrise) {
    return (
      <GlassPanel className="p-3 text-white/60 text-sm text-center">
        Sun data unavailable
      </GlassPanel>
    )
  }

  const now = Date.now() / 1000
  const cycleProgress = normalize(dayNightProgress(now, sunrise, sunset))
  const theta = Math.PI - cycleProgress * Math.PI * 2

  // A) Wide horizon track (continuous day/night motion)
  const wideCx = 160
  const wideCy = 40
  const wideRx = 146
  const wideRy = 28
  const wideSun = {
    x: wideCx + wideRx * Math.cos(theta),
    y: wideCy - wideRy * Math.sin(theta),
  }
  const wideMoon = {
    x: wideCx + wideRx * Math.cos(theta + Math.PI),
    y: wideCy - wideRy * Math.sin(theta + Math.PI),
  }

  // B) Earth + orbital representation
  const cx = 160
  const cy = 42
  const orbitR = 35
  const sunX = cx + orbitR * Math.cos(theta)
  const sunY = cy - orbitR * Math.sin(theta)
  const moonX = cx + orbitR * Math.cos(theta + Math.PI)
  const moonY = cy - orbitR * Math.sin(theta + Math.PI)
  // Keep the local marker fixed; flip lit hemisphere based on local day/night phase.
  const dayOnRight = cycleProgress < 0.5
  const markerX = cx + 10
  const markerY = cy - 2

  return (
    <GlassPanel className="p-3 text-white">
      <div className="text-[11px] text-white/55 tracking-[0.2em] uppercase text-center mb-1">
        Sun Views
      </div>
      <div className="text-[10px] text-white/55 uppercase tracking-[0.14em] mb-1">
        Horizon Track
      </div>
      <svg viewBox="0 0 320 72" className="w-full h-16">
        <path
          d="M 14 56 Q 160 10 306 56"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
        />
        <path
          d="M 306 56 Q 160 72 14 56"
          fill="none"
          stroke="rgba(219,234,254,0.2)"
          strokeWidth="1.5"
          strokeDasharray="3 6"
        />
        <circle cx={wideMoon.x} cy={wideMoon.y} r="3.5" fill="rgba(219,234,254,0.9)" />
        <circle cx={wideSun.x} cy={wideSun.y} r="6.2" fill="#fcd34d" />
        <circle cx={wideSun.x} cy={wideSun.y} r="11" fill="rgba(252,211,77,0.2)" />
      </svg>

      <div className="text-[10px] text-white/55 uppercase tracking-[0.14em] mb-1 mt-1">
        Orbital Earth View
      </div>
      <svg viewBox="0 0 320 88" className="w-full h-16">
        <circle
          cx={cx}
          cy={cy}
          r={orbitR}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
        />
        <circle cx={sunX} cy={sunY} r="6" fill="#fcd34d" />
        <circle cx={sunX} cy={sunY} r="10" fill="rgba(252,211,77,0.16)" />
        <circle cx={moonX} cy={moonY} r="4.2" fill="rgba(219,234,254,0.9)" />

        <defs>
          <clipPath id="earth-clip">
            <circle cx={cx} cy={cy} r="16" />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r="16" fill="#111827" />
        <rect
          x={dayOnRight ? cx : cx - 16}
          y={cy - 16}
          width="16"
          height="32"
          fill="#d1fae5"
          clipPath="url(#earth-clip)"
          opacity="0.95"
        />
        <circle cx={markerX} cy={markerY} r="2.8" fill="#ef4444" />
      </svg>

      <div className="flex justify-between text-xs text-white/65 mt-1 tabular-nums">
        <span>🌅 {formatTime(sunrise)}</span>
        <span>🌇 {formatTime(sunset)}</span>
      </div>
    </GlassPanel>
  )
}
