import {
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  differenceInHours,
  addYears,
  addMonths,
  addDays,
} from 'date-fns'
import { SoberDuration } from '../types/index.js'

export function computeSoberDuration(sobrietyDate: Date, now: Date): SoberDuration {
  if (now <= sobrietyDate) {
    return { years: 0, months: 0, days: 0, hours: 0 }
  }

  const years = differenceInYears(now, sobrietyDate)
  const afterYears = addYears(sobrietyDate, years)

  const months = differenceInMonths(now, afterYears)
  const afterMonths = addMonths(afterYears, months)

  const days = differenceInDays(now, afterMonths)
  const afterDays = addDays(afterMonths, days)

  const hours = differenceInHours(now, afterDays)

  return { years, months, days, hours }
}
