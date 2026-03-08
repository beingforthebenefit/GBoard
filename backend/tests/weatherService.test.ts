import { describe, it, expect } from 'vitest'
import { buildForecast } from '../src/services/weatherService.js'

const makeSlot = (
  dt_txt: string,
  temp_max: number,
  temp_min: number,
  icon = '01d',
  description = 'clear sky'
) => ({
  dt: Math.floor(Date.parse(dt_txt.replace(' ', 'T') + 'Z') / 1000),
  dt_txt,
  main: { temp_max, temp_min },
  weather: [{ icon, description }],
})

describe('buildForecast', () => {
  it('skips today and returns 3 future days', () => {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const day2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    const day3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

    const slots = [
      makeSlot(`${today} 12:00:00`, 80, 60),
      makeSlot(`${tomorrow} 09:00:00`, 75, 55),
      makeSlot(`${tomorrow} 12:00:00`, 78, 57, '02d', 'partly cloudy'),
      makeSlot(`${day2} 12:00:00`, 85, 65),
      makeSlot(`${day3} 12:00:00`, 90, 70),
    ]

    const result = buildForecast(slots)
    expect(result).toHaveLength(3)
    expect(result[0].date).toBe(tomorrow)
    expect(result[1].date).toBe(day2)
    expect(result[2].date).toBe(day3)
  })

  it('computes correct high and low from multiple slots', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const slots = [
      makeSlot(`${tomorrow} 06:00:00`, 70, 55),
      makeSlot(`${tomorrow} 12:00:00`, 80, 60),
      makeSlot(`${tomorrow} 18:00:00`, 75, 58),
    ]

    const result = buildForecast(slots)
    expect(result[0].high).toBe(80)
    expect(result[0].low).toBe(55)
  })

  it('prefers midday slot icon and description', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const slots = [
      makeSlot(`${tomorrow} 06:00:00`, 70, 55, '01n', 'clear night'),
      makeSlot(`${tomorrow} 12:00:00`, 78, 60, '10d', 'light rain'),
    ]

    const result = buildForecast(slots)
    expect(result[0].icon).toBe('10d')
    expect(result[0].description).toBe('light rain')
  })

  it('falls back to first slot when no midday slot', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const slots = [makeSlot(`${tomorrow} 06:00:00`, 70, 55, '01d', 'sunny')]

    const result = buildForecast(slots)
    expect(result[0].icon).toBe('01d')
  })

  it('returns empty array when no future slots', () => {
    const today = new Date().toISOString().slice(0, 10)
    const slots = [makeSlot(`${today} 12:00:00`, 75, 55)]
    const result = buildForecast(slots)
    expect(result).toHaveLength(0)
  })

  it('uses forecast timezone when skipping today (prevents Sunday from being dropped)', () => {
    // Saturday 11:30 PM PST (UTC-8) => Sunday 07:30 UTC.
    // If "today" is computed in UTC, Sunday would be incorrectly skipped.
    const nowMs = Date.parse('2026-03-08T07:30:00Z')
    const pstOffset = -8 * 3600
    const slots = [
      makeSlot('2026-03-08 18:00:00', 65, 53, '02d', 'few clouds'), // Sunday local
      makeSlot('2026-03-09 18:00:00', 66, 54, '03d', 'cloudy'), // Monday local
      makeSlot('2026-03-10 18:00:00', 67, 55, '04d', 'overcast'), // Tuesday local
    ]

    const result = buildForecast(slots, pstOffset, nowMs)
    expect(result).toHaveLength(3)
    expect(result[0].date).toBe('2026-03-08') // Sunday must be present
    expect(result[1].date).toBe('2026-03-09')
    expect(result[2].date).toBe('2026-03-10')
  })
})
