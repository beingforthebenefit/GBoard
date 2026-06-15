import { CSSProperties } from 'react'
import { WordOfDay } from '../types/index.js'

const POS_ABBR: Record<WordOfDay['partOfSpeech'], string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  interjection: 'interj.',
  phrase: 'phr.',
}

/** Short part-of-speech label, e.g. "n. f." for a feminine noun */
export function formatPartOfSpeech(word: WordOfDay): string {
  const pos = POS_ABBR[word.partOfSpeech] ?? word.partOfSpeech
  if (word.partOfSpeech === 'noun' && word.gender) return `${pos} ${word.gender}.`
  return pos
}

interface Props {
  word: WordOfDay | null
  /** Tighter spacing/size and drops the usage note + pronunciation (for cramped layouts) */
  compact?: boolean
  /** Section heading; pass '' when the surrounding container already supplies a title */
  label?: string
  className?: string
  style?: CSSProperties
}

// A theme-agnostic "Spanish word of the day" card. It renders in the current text
// colour (currentColor) with opacity tiers, so it adopts whatever palette/font the
// surrounding container provides — each layout just drops it into its own chrome.
export function WordOfDayWidget({
  word,
  compact = false,
  label = 'Palabra del Día',
  className = '',
  style,
}: Props) {
  if (!word) return null
  const conj = word.conjugations

  return (
    <div className={className} style={style}>
      {label !== '' && (
        <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60">{label}</div>
      )}

      <div className="flex items-baseline gap-2 flex-wrap leading-tight">
        <span className={`${compact ? 'text-lg' : 'text-2xl'} font-semibold`}>{word.word}</span>
        <span className="text-xs italic opacity-60">{formatPartOfSpeech(word)}</span>
        {word.pronunciation && <span className="text-xs opacity-45">[{word.pronunciation}]</span>}
      </div>

      <div className={`${compact ? 'text-xs' : 'text-sm'} opacity-90 mt-0.5`}>
        {word.definition}
      </div>

      {!compact && word.note && <div className="text-xs opacity-55 mt-1">{word.note}</div>}

      {conj && conj.length > 0 && (
        <div className="text-[11px] opacity-75 mt-1 leading-snug">
          {!compact && word.conjugationTense && (
            <span className="mr-1 uppercase tracking-wide opacity-70">
              {word.conjugationTense}:
            </span>
          )}
          {conj.map((c, i) => (
            <span key={c.pronoun} className="tabular-nums">
              {i > 0 && <span className="opacity-40"> · </span>}
              {!compact && <span className="opacity-55">{c.pronoun} </span>}
              {c.form}
            </span>
          ))}
        </div>
      )}

      <div className={`${compact ? 'text-xs' : 'text-sm'} italic mt-1.5`}>
        <span className="opacity-85">“{word.example}”</span>
        <span className="opacity-55"> — {word.exampleTranslation}</span>
      </div>
    </div>
  )
}
