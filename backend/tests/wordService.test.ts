import { describe, it, expect, vi } from 'vitest'
import { getWordOfDay } from '../src/services/wordService.js'
import { WORDS } from '../src/services/wordData.js'
import wordRouter from '../src/routes/word.js'

/* eslint-disable @typescript-eslint/no-explicit-any */
function getHandler(router: any, method: string, path: string) {
  const layer = router.stack.find((l: any) => l.route?.path === path && l.route?.methods[method])
  if (!layer) throw new Error(`No ${method} handler for ${path}`)
  return layer.route.stack[0].handle
}

describe('getWordOfDay', () => {
  it('returns a word with a local YYYY-MM-DD date', () => {
    const w = getWordOfDay(new Date(2026, 5, 14, 9, 30))
    expect(w.word).toBeTruthy()
    expect(w.date).toBe('2026-06-14')
    expect(w.definition).toBeTruthy()
    expect(w.example).toBeTruthy()
    expect(w.exampleTranslation).toBeTruthy()
  })

  it('is deterministic — the same calendar day yields the same word', () => {
    const a = getWordOfDay(new Date(2026, 0, 1, 0, 5))
    const b = getWordOfDay(new Date(2026, 0, 1, 23, 55))
    expect(a.word).toBe(b.word)
  })

  it('advances to a different word on the next day', () => {
    const a = getWordOfDay(new Date(2026, 0, 1, 12))
    const b = getWordOfDay(new Date(2026, 0, 2, 12))
    expect(a.word).not.toBe(b.word)
  })

  it('cycles through the list every WORDS.length days', () => {
    const a = getWordOfDay(new Date(2026, 0, 1, 12))
    const later = new Date(2026, 0, 1 + WORDS.length, 12)
    const b = getWordOfDay(later)
    expect(a.word).toBe(b.word)
  })
})

describe('WORDS dataset integrity', () => {
  it('has a healthy number of unique entries', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(30)
    const unique = new Set(WORDS.map((w) => w.word))
    expect(unique.size).toBe(WORDS.length)
  })

  it('every entry has the required display fields', () => {
    for (const w of WORDS) {
      expect(w.word, w.word).toBeTruthy()
      expect(w.partOfSpeech, w.word).toBeTruthy()
      expect(w.definition, w.word).toBeTruthy()
      expect(w.example, w.word).toBeTruthy()
      expect(w.exampleTranslation, w.word).toBeTruthy()
    }
  })

  it('nouns carry a gender', () => {
    for (const w of WORDS) {
      if (w.partOfSpeech === 'noun') expect(['m', 'f'], w.word).toContain(w.gender)
    }
  })

  it('only verbs carry conjugations, and they are complete', () => {
    for (const w of WORDS) {
      if (w.conjugations) {
        expect(w.partOfSpeech, w.word).toBe('verb')
        expect(w.conjugationTense, w.word).toBeTruthy()
        expect(w.conjugations.length, w.word).toBe(5)
        for (const c of w.conjugations) {
          expect(c.pronoun, w.word).toBeTruthy()
          expect(c.form, w.word).toBeTruthy()
        }
      }
    }
  })
})

describe('GET /api/word', () => {
  it('responds with the word of the day', () => {
    const handler = getHandler(wordRouter, 'get', '/')
    const json = vi.fn()
    handler({} as any, { json } as any)
    expect(json).toHaveBeenCalledOnce()
    const payload = json.mock.calls[0][0]
    expect(payload.word).toBeTruthy()
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
