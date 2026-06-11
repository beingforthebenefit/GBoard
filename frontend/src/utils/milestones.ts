import { addDays, addMonths, addYears, differenceInDays } from 'date-fns'

export interface Milestone {
  /** e.g. "90 days", "6 months", "5 years" */
  label: string
  date: Date
}

export interface MilestoneProgress {
  next: Milestone
  daysRemaining: number
  /** Days sober so far (whole days) */
  totalDays: number
  /** 0..1 progress from the previous milestone to the next */
  progress: number
}

function buildMilestones(sobrietyDate: Date, until: Date): Milestone[] {
  const milestones: Milestone[] = [
    { label: '24 hours', date: addDays(sobrietyDate, 1) },
    { label: '1 week', date: addDays(sobrietyDate, 7) },
    { label: '30 days', date: addDays(sobrietyDate, 30) },
    { label: '60 days', date: addDays(sobrietyDate, 60) },
    { label: '90 days', date: addDays(sobrietyDate, 90) },
    { label: '6 months', date: addMonths(sobrietyDate, 6) },
    { label: '9 months', date: addMonths(sobrietyDate, 9) },
  ]
  // Yearly anniversaries until we pass `until`
  for (let year = 1; ; year++) {
    const date = addYears(sobrietyDate, year)
    milestones.push({ label: year === 1 ? '1 year' : `${year} years`, date })
    if (date > until) break
  }
  return milestones.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function computeMilestoneProgress(sobrietyDate: Date, now: Date): MilestoneProgress {
  const milestones = buildMilestones(sobrietyDate, now)
  const next = milestones.find((m) => m.date > now) ?? milestones[milestones.length - 1]
  const passed = milestones.filter((m) => m.date <= now)
  const prevDate = passed.length > 0 ? passed[passed.length - 1].date : sobrietyDate

  const span = next.date.getTime() - prevDate.getTime()
  const elapsed = now.getTime() - prevDate.getTime()
  const progress = span > 0 ? Math.min(Math.max(elapsed / span, 0), 1) : 1

  return {
    next,
    daysRemaining: Math.max(differenceInDays(next.date, now), 0),
    totalDays: Math.max(differenceInDays(now, sobrietyDate), 0),
    progress,
  }
}
