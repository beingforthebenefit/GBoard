import { useClock } from './useClock.js'
import { computeSoberDuration } from '../utils/soberCounter.js'
import { SoberDuration } from '../types/index.js'

export function useSoberCounter(sobrietyDateStr: string): SoberDuration {
  const now = useClock()
  const sobrietyDate = new Date(sobrietyDateStr)
  return computeSoberDuration(sobrietyDate, now)
}
