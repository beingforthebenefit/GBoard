export interface ZodiacSign {
  name: string
  glyph: string
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  element: 'Fire' | 'Earth' | 'Air' | 'Water'
  modality: 'Cardinal' | 'Fixed' | 'Mutable'
  ruler: string
  traits: string
}

interface WeekdayInfluence {
  dayName: string
  ruler: string
  tone: string
}

export interface MoonPhase {
  name: string
  emoji: string
  ageDays: number
  illumination: number
  cycleProgress: number
}

interface ConstellationPoint {
  x: number
  y: number
  size: number
}

export interface ConstellationPattern {
  name: string
  notable: string
  stars: ConstellationPoint[]
  lines: Array<[number, number]>
}

export interface AstrologySnapshot {
  sign: ZodiacSign
  signRange: string
  signIndex: number
  weekday: WeekdayInfluence
  moon: MoonPhase
  constellation: ConstellationPattern
  luckyWindow: string
  message: string
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const SIGNS: ZodiacSign[] = [
  {
    name: 'Aries',
    glyph: '♈',
    startMonth: 3,
    startDay: 21,
    endMonth: 4,
    endDay: 19,
    element: 'Fire',
    modality: 'Cardinal',
    ruler: 'Mars',
    traits: 'Courageous, direct, and energized by starting new things.',
  },
  {
    name: 'Taurus',
    glyph: '♉',
    startMonth: 4,
    startDay: 20,
    endMonth: 5,
    endDay: 20,
    element: 'Earth',
    modality: 'Fixed',
    ruler: 'Venus',
    traits: 'Grounded, steady, and focused on comfort and quality.',
  },
  {
    name: 'Gemini',
    glyph: '♊',
    startMonth: 5,
    startDay: 21,
    endMonth: 6,
    endDay: 20,
    element: 'Air',
    modality: 'Mutable',
    ruler: 'Mercury',
    traits: 'Curious, social, and quick to connect ideas.',
  },
  {
    name: 'Cancer',
    glyph: '♋',
    startMonth: 6,
    startDay: 21,
    endMonth: 7,
    endDay: 22,
    element: 'Water',
    modality: 'Cardinal',
    ruler: 'Moon',
    traits: 'Protective, intuitive, and tuned into emotional climate.',
  },
  {
    name: 'Leo',
    glyph: '♌',
    startMonth: 7,
    startDay: 23,
    endMonth: 8,
    endDay: 22,
    element: 'Fire',
    modality: 'Fixed',
    ruler: 'Sun',
    traits: 'Warm, creative, and expressive with a generous heart.',
  },
  {
    name: 'Virgo',
    glyph: '♍',
    startMonth: 8,
    startDay: 23,
    endMonth: 9,
    endDay: 22,
    element: 'Earth',
    modality: 'Mutable',
    ruler: 'Mercury',
    traits: 'Precise, practical, and strong at refining details.',
  },
  {
    name: 'Libra',
    glyph: '♎',
    startMonth: 9,
    startDay: 23,
    endMonth: 10,
    endDay: 22,
    element: 'Air',
    modality: 'Cardinal',
    ruler: 'Venus',
    traits: 'Diplomatic, aesthetic, and always balancing perspectives.',
  },
  {
    name: 'Scorpio',
    glyph: '♏',
    startMonth: 10,
    startDay: 23,
    endMonth: 11,
    endDay: 21,
    element: 'Water',
    modality: 'Fixed',
    ruler: 'Pluto',
    traits: 'Intense, strategic, and committed to depth over noise.',
  },
  {
    name: 'Sagittarius',
    glyph: '♐',
    startMonth: 11,
    startDay: 22,
    endMonth: 12,
    endDay: 21,
    element: 'Fire',
    modality: 'Mutable',
    ruler: 'Jupiter',
    traits: 'Adventurous, candid, and always looking past the horizon.',
  },
  {
    name: 'Capricorn',
    glyph: '♑',
    startMonth: 12,
    startDay: 22,
    endMonth: 1,
    endDay: 19,
    element: 'Earth',
    modality: 'Cardinal',
    ruler: 'Saturn',
    traits: 'Disciplined, patient, and built for long-term wins.',
  },
  {
    name: 'Aquarius',
    glyph: '♒',
    startMonth: 1,
    startDay: 20,
    endMonth: 2,
    endDay: 18,
    element: 'Air',
    modality: 'Fixed',
    ruler: 'Uranus',
    traits: 'Original, independent, and future-facing in approach.',
  },
  {
    name: 'Pisces',
    glyph: '♓',
    startMonth: 2,
    startDay: 19,
    endMonth: 3,
    endDay: 20,
    element: 'Water',
    modality: 'Mutable',
    ruler: 'Neptune',
    traits: 'Imaginative, empathic, and naturally intuitive.',
  },
]

const WEEKDAY_INFLUENCES: WeekdayInfluence[] = [
  { dayName: 'Sunday', ruler: 'Sun', tone: 'show confidence and lead with heart' },
  { dayName: 'Monday', ruler: 'Moon', tone: 'protect your energy and trust intuition' },
  { dayName: 'Tuesday', ruler: 'Mars', tone: 'take decisive action on one hard thing' },
  { dayName: 'Wednesday', ruler: 'Mercury', tone: 'talk it out, learn fast, and simplify' },
  { dayName: 'Thursday', ruler: 'Jupiter', tone: 'think bigger and bet on growth' },
  { dayName: 'Friday', ruler: 'Venus', tone: 'prioritize connection, beauty, and ease' },
  { dayName: 'Saturday', ruler: 'Saturn', tone: 'build structure and follow through' },
]

const ELEMENT_FOCUS: Record<ZodiacSign['element'], string> = {
  Fire: 'Momentum favors bold steps over overthinking.',
  Earth: 'Practical progress compounds fastest right now.',
  Air: 'Ideas and conversations unlock your next move.',
  Water: 'Emotional clarity is your strongest compass.',
}

const MODALITY_FOCUS: Record<ZodiacSign['modality'], string> = {
  Cardinal: 'Start something meaningful and keep it simple.',
  Fixed: 'Stay steady; consistency beats intensity today.',
  Mutable: 'Adapt quickly and leave room for pivots.',
}

const CONSTELLATIONS: Record<string, ConstellationPattern> = {
  Aries: {
    name: 'Aries',
    notable: 'Hamal',
    stars: [
      { x: 12, y: 42, size: 2.8 },
      { x: 26, y: 36, size: 2.4 },
      { x: 40, y: 30, size: 2.2 },
      { x: 58, y: 24, size: 2.4 },
      { x: 74, y: 20, size: 2.6 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  Taurus: {
    name: 'Taurus',
    notable: 'Aldebaran',
    stars: [
      { x: 14, y: 40, size: 2.6 },
      { x: 28, y: 30, size: 2.9 },
      { x: 40, y: 24, size: 2.3 },
      { x: 52, y: 18, size: 2.2 },
      { x: 44, y: 38, size: 2.1 },
      { x: 58, y: 42, size: 2.2 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 4],
      [4, 5],
    ],
  },
  Gemini: {
    name: 'Gemini',
    notable: 'Pollux',
    stars: [
      { x: 16, y: 18, size: 2.5 },
      { x: 28, y: 24, size: 2.3 },
      { x: 38, y: 34, size: 2.2 },
      { x: 50, y: 44, size: 2.1 },
      { x: 62, y: 18, size: 2.6 },
      { x: 72, y: 28, size: 2.2 },
      { x: 82, y: 40, size: 2.1 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
      [5, 6],
      [1, 5],
    ],
  },
  Cancer: {
    name: 'Cancer',
    notable: 'Acubens',
    stars: [
      { x: 18, y: 30, size: 2.2 },
      { x: 34, y: 20, size: 2.3 },
      { x: 50, y: 30, size: 2.4 },
      { x: 34, y: 42, size: 2.2 },
      { x: 62, y: 18, size: 2.1 },
      { x: 72, y: 30, size: 2.2 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
    ],
  },
  Leo: {
    name: 'Leo',
    notable: 'Regulus',
    stars: [
      { x: 16, y: 26, size: 2.7 },
      { x: 28, y: 20, size: 2.3 },
      { x: 40, y: 24, size: 2.2 },
      { x: 54, y: 30, size: 2.3 },
      { x: 66, y: 36, size: 2.4 },
      { x: 78, y: 44, size: 2.5 },
      { x: 64, y: 18, size: 2.1 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [3, 6],
    ],
  },
  Virgo: {
    name: 'Virgo',
    notable: 'Spica',
    stars: [
      { x: 14, y: 18, size: 2.3 },
      { x: 26, y: 28, size: 2.2 },
      { x: 36, y: 38, size: 2.2 },
      { x: 50, y: 46, size: 2.5 },
      { x: 64, y: 34, size: 2.2 },
      { x: 76, y: 24, size: 2.1 },
      { x: 88, y: 18, size: 2.0 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  Libra: {
    name: 'Libra',
    notable: 'Zubenelgenubi',
    stars: [
      { x: 20, y: 28, size: 2.4 },
      { x: 34, y: 18, size: 2.3 },
      { x: 48, y: 26, size: 2.2 },
      { x: 62, y: 18, size: 2.3 },
      { x: 76, y: 28, size: 2.2 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  Scorpio: {
    name: 'Scorpio',
    notable: 'Antares',
    stars: [
      { x: 14, y: 20, size: 2.2 },
      { x: 28, y: 24, size: 2.1 },
      { x: 42, y: 28, size: 2.9 },
      { x: 56, y: 34, size: 2.2 },
      { x: 70, y: 40, size: 2.1 },
      { x: 82, y: 48, size: 2.0 },
      { x: 90, y: 56, size: 1.9 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  Sagittarius: {
    name: 'Sagittarius',
    notable: 'Kaus Australis',
    stars: [
      { x: 18, y: 44, size: 2.1 },
      { x: 30, y: 32, size: 2.2 },
      { x: 44, y: 24, size: 2.3 },
      { x: 58, y: 30, size: 2.1 },
      { x: 70, y: 42, size: 2.2 },
      { x: 54, y: 48, size: 2.1 },
      { x: 40, y: 52, size: 2.0 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
    ],
  },
  Capricorn: {
    name: 'Capricorn',
    notable: 'Deneb Algedi',
    stars: [
      { x: 16, y: 30, size: 2.2 },
      { x: 30, y: 20, size: 2.1 },
      { x: 44, y: 26, size: 2.3 },
      { x: 58, y: 36, size: 2.2 },
      { x: 72, y: 42, size: 2.1 },
      { x: 84, y: 34, size: 2.0 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
  },
  Aquarius: {
    name: 'Aquarius',
    notable: 'Sadalmelik',
    stars: [
      { x: 14, y: 24, size: 2.2 },
      { x: 26, y: 20, size: 2.1 },
      { x: 38, y: 26, size: 2.2 },
      { x: 50, y: 22, size: 2.2 },
      { x: 62, y: 30, size: 2.1 },
      { x: 74, y: 26, size: 2.0 },
      { x: 86, y: 34, size: 2.0 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  Pisces: {
    name: 'Pisces',
    notable: 'Alrescha',
    stars: [
      { x: 12, y: 20, size: 2.2 },
      { x: 24, y: 30, size: 2.1 },
      { x: 38, y: 38, size: 2.2 },
      { x: 52, y: 34, size: 2.4 },
      { x: 64, y: 24, size: 2.1 },
      { x: 76, y: 18, size: 2.0 },
      { x: 74, y: 44, size: 2.0 },
      { x: 88, y: 52, size: 1.9 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [3, 6],
      [6, 7],
    ],
  },
}

function monthDayValue(month: number, day: number): number {
  return month * 100 + day
}

function isWithinRange(
  month: number,
  day: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const value = monthDayValue(month, day)
  const start = monthDayValue(startMonth, startDay)
  const end = monthDayValue(endMonth, endDay)

  if (start <= end) {
    return value >= start && value <= end
  }

  // Cross-year ranges (for Capricorn)
  return value >= start || value <= end
}

function formatMonthDay(month: number, day: number): string {
  return `${MONTHS_SHORT[month - 1]} ${day}`
}

export function formatSignRange(sign: ZodiacSign): string {
  return `${formatMonthDay(sign.startMonth, sign.startDay)} - ${formatMonthDay(sign.endMonth, sign.endDay)}`
}

export function getSunSign(date: Date): { sign: ZodiacSign; index: number } {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const index = SIGNS.findIndex((sign) =>
    isWithinRange(month, day, sign.startMonth, sign.startDay, sign.endMonth, sign.endDay)
  )

  const safeIndex = index >= 0 ? index : 0
  return {
    sign: SIGNS[safeIndex],
    index: safeIndex,
  }
}

export function getWeekdayInfluence(date: Date): WeekdayInfluence {
  return WEEKDAY_INFLUENCES[date.getDay()]
}

export function getMoonPhase(date: Date): MoonPhase {
  const synodicDays = 29.53058867
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0)
  const daysSinceReference = (date.getTime() - knownNewMoon) / 86_400_000
  const ageDays = ((daysSinceReference % synodicDays) + synodicDays) % synodicDays
  const cycleProgress = ageDays / synodicDays
  const phaseIndex = Math.floor(cycleProgress * 8 + 0.5) % 8

  const phases = [
    { name: 'New Moon', emoji: '🌑' },
    { name: 'Waxing Crescent', emoji: '🌒' },
    { name: 'First Quarter', emoji: '🌓' },
    { name: 'Waxing Gibbous', emoji: '🌔' },
    { name: 'Full Moon', emoji: '🌕' },
    { name: 'Waning Gibbous', emoji: '🌖' },
    { name: 'Last Quarter', emoji: '🌗' },
    { name: 'Waning Crescent', emoji: '🌘' },
  ]

  const illumination = Math.round(((1 - Math.cos(cycleProgress * Math.PI * 2)) / 2) * 100)
  const phase = phases[phaseIndex]

  return {
    name: phase.name,
    emoji: phase.emoji,
    ageDays,
    illumination,
    cycleProgress,
  }
}

export function getConstellationPattern(signName: string): ConstellationPattern {
  return CONSTELLATIONS[signName] ?? CONSTELLATIONS.Aries
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const normalized = hour % 12 || 12
  return `${normalized}${period}`
}

function getLuckyWindow(date: Date, signIndex: number): string {
  const seed =
    (date.getFullYear() * 31 + (date.getMonth() + 1) * 17 + date.getDate() * 13 + signIndex) % 24
  const start = seed
  const end = (start + 2) % 24
  return `${formatHour(start)} - ${formatHour(end)}`
}

export function getAstrologySnapshot(date: Date): AstrologySnapshot {
  const { sign, index } = getSunSign(date)
  const weekday = getWeekdayInfluence(date)
  const moon = getMoonPhase(date)
  const constellation = getConstellationPattern(sign.name)
  const signRange = formatSignRange(sign)
  const luckyWindow = getLuckyWindow(date, index)

  const message =
    `${weekday.dayName} is ruled by ${weekday.ruler}, so ${weekday.tone}. ` +
    `${ELEMENT_FOCUS[sign.element]} ${MODALITY_FOCUS[sign.modality]}`

  return {
    sign,
    signRange,
    signIndex: index,
    weekday,
    moon,
    constellation,
    luckyWindow,
    message,
  }
}
