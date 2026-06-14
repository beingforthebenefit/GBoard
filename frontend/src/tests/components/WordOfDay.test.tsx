import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { WordOfDayWidget, formatPartOfSpeech } from '../../components/WordOfDay.js'
import { WordOfDay } from '../../types/index.js'

const verb: WordOfDay = {
  word: 'tener',
  partOfSpeech: 'verb',
  pronunciation: 'te-NEHR',
  definition: 'to have',
  note: 'Irregular: "yo tengo."',
  conjugationTense: 'Present',
  conjugations: [
    { pronoun: 'yo', form: 'tengo' },
    { pronoun: 'tú', form: 'tienes' },
    { pronoun: 'él/ella', form: 'tiene' },
    { pronoun: 'nosotros', form: 'tenemos' },
    { pronoun: 'ellos/ellas', form: 'tienen' },
  ],
  example: 'Tengo hambre.',
  exampleTranslation: "I'm hungry.",
  date: '2026-06-14',
}

const noun: WordOfDay = {
  word: 'chamba',
  partOfSpeech: 'noun',
  gender: 'f',
  definition: 'job, work',
  example: 'Tengo mucha chamba.',
  exampleTranslation: 'I have a lot of work.',
  date: '2026-06-14',
}

describe('formatPartOfSpeech', () => {
  it('appends gender for nouns', () => {
    expect(formatPartOfSpeech(noun)).toBe('n. f.')
  })

  it('abbreviates other parts of speech', () => {
    expect(formatPartOfSpeech(verb)).toBe('v.')
    expect(formatPartOfSpeech({ ...noun, partOfSpeech: 'interjection', gender: undefined })).toBe(
      'interj.'
    )
  })
})

describe('WordOfDayWidget', () => {
  it('renders nothing when there is no word', () => {
    const { container } = render(<WordOfDayWidget word={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the word, definition, example and translation', () => {
    const { getByText } = render(<WordOfDayWidget word={noun} />)
    expect(getByText('chamba')).toBeTruthy()
    expect(getByText('job, work')).toBeTruthy()
    expect(getByText(/Tengo mucha chamba/)).toBeTruthy()
    expect(getByText(/I have a lot of work/)).toBeTruthy()
  })

  it('shows conjugations and the tense label for irregular verbs', () => {
    const { container } = render(<WordOfDayWidget word={verb} />)
    expect(container.textContent).toContain('tengo')
    expect(container.textContent).toContain('tienen')
    expect(container.textContent).toContain('Present')
  })

  it('hides the usage note in compact mode', () => {
    const { queryByText } = render(<WordOfDayWidget word={verb} compact />)
    expect(queryByText(/yo tengo/)).toBeNull()
  })

  it('renders the default label', () => {
    const { getByText } = render(<WordOfDayWidget word={noun} />)
    expect(getByText('Palabra del Día')).toBeTruthy()
  })

  it('omits the label when blank', () => {
    const { queryByText } = render(<WordOfDayWidget word={noun} label="" />)
    expect(queryByText('Palabra del Día')).toBeNull()
  })
})
