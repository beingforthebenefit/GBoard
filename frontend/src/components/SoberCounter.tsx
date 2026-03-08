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
      <div className="text-center text-white/50 text-xs font-semibold tracking-widest mb-2 uppercase">
        Sober Time
      </div>
      <div className="flex justify-center gap-4">
        {cells.map(({ value, label }) => (
          <div key={label} className="text-center">
            <div className="text-3xl font-light text-white tabular-nums leading-none">{value}</div>
            <div className="text-[10px] text-white/50 tracking-widest mt-1">{label}</div>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
