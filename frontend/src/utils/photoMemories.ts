import { PhotoInfo } from '../types/index.js'

export interface Memory {
  photo: PhotoInfo
  taken: Date
  yearsAgo: number
}

/** Photos taken within `windowDays` of today's date in a previous year */
export function findMemories(photos: PhotoInfo[], now: Date, windowDays: number): Memory[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const memories: Memory[] = []
  for (const photo of photos) {
    if (!photo.dateTaken) continue
    const taken = new Date(photo.dateTaken)
    if (isNaN(taken.getTime()) || taken.getFullYear() >= now.getFullYear()) continue

    // Check the anniversary in adjacent years to handle the Dec/Jan wrap
    let best: { diff: number; year: number } | null = null
    for (const year of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
      const anniversary = new Date(year, taken.getMonth(), taken.getDate())
      const diff = Math.abs(Math.round((anniversary.getTime() - today.getTime()) / 86_400_000))
      if (best == null || diff < best.diff) best = { diff, year }
    }
    if (best && best.diff <= windowDays) {
      memories.push({ photo, taken, yearsAgo: best.year - taken.getFullYear() })
    }
  }
  return memories.sort((a, b) => b.taken.getTime() - a.taken.getTime())
}
