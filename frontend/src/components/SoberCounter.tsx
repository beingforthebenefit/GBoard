import { useSoberCounter } from '../hooks/useSoberCounter.js'
import { GlassPanel } from './GlassPanel.js'

interface SoberCounterProps {
  sobrietyDate: string
}

export function SoberCounter({ sobrietyDate }: SoberCounterProps) {
  const { years, months, days, hours } = useSoberCounter(sobrietyDate)

  const cells = [
    { value: years, label: 'YEARS' },
    { value: months, label: 'MONTHS' },
    { value: days, label: 'DAYS' },
    { value: hours, label: 'HOURS' },
  ]

  return (
    <GlassPanel className="p-4">
      <div className="text-center text-white/60 text-xs font-semibold tracking-widest mb-3 uppercase">
        Sober Time
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cells.map(({ value, label }) => (
          <div key={label} className="text-center">
            <div className="text-4xl font-light text-white tabular-nums">{value}</div>
            <div className="text-xs text-white/60 tracking-widest mt-1">{label}</div>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
