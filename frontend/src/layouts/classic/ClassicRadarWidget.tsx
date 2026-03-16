import { RadarData } from '../../types/index.js'
import { GlassPanel } from './GlassPanel.js'

const GRID = 3

export function ClassicRadarWidget({ data }: { data: RadarData | null }) {
  if (!data) return null

  const { zoom, centerX, centerY, locX, locY } = data
  const offset = Math.floor(GRID / 2)

  const tiles: { x: number; y: number }[] = []
  for (let dy = -offset; dy <= offset; dy++) {
    for (let dx = -offset; dx <= offset; dx++) {
      tiles.push({ x: centerX + dx, y: centerY + dy })
    }
  }

  return (
    <GlassPanel className="p-0 overflow-hidden rounded-xl">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
        <div
          className="absolute left-0 w-full"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID}, 1fr)`,
            aspectRatio: '1',
          }}
        >
          {tiles.map(({ x, y }) => (
            <div key={`${x}-${y}`} className="relative" style={{ aspectRatio: '1' }}>
              <img
                src={`/api/weather/radar/base/${zoom}/${x}/${y}`}
                alt=""
                className="absolute inset-0 w-full h-full block"
              />
              <img
                src={`/api/weather/radar/overlay/${zoom}/${x}/${y}`}
                alt=""
                className="absolute inset-0 w-full h-full block"
                style={{ opacity: 0.7 }}
              />
            </div>
          ))}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute w-2 h-2 rounded-full bg-blue-400/80 ring-2 ring-blue-400/40"
              style={{
                left: `${locX * 100}%`,
                top: `${locY * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
