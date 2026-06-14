import { WordOfDay } from '../types/index.js'
import { WORDS } from './wordData.js'

const MS_PER_DAY = 86_400_000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local YYYY-MM-DD for a given date */
function localDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Today's Mexican-Spanish word of the day. Deterministic by local calendar date:
 * the same day always yields the same word, and it advances once per day, cycling
 * through the curated list.
 */
export function getWordOfDay(now: Date = new Date()): WordOfDay {
  // Day index from local midnight so the word flips at the viewer's local midnight
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayNumber = Math.floor(localMidnight.getTime() / MS_PER_DAY)
  const idx = ((dayNumber % WORDS.length) + WORDS.length) % WORDS.length
  return { ...WORDS[idx], date: localDateString(now) }
}
