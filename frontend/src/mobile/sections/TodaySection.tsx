import { useState } from 'react'
import { CalendarEvent, UpcomingItem, WordOfDay } from '../../types/index.js'
import { Label, Notice } from '../parts.js'
import { localDateKey, weekday } from '../status.js'

interface Props {
  events: CalendarEvent[] | null
  word: WordOfDay | null
  media: UpcomingItem[] | null
  now: Date
  failed: { events: boolean; word: boolean; media: boolean }
}

export function TodaySection({ events, word, media, now, failed }: Props) {
  return (
    <>
      <Calendar events={events} now={now} failed={failed.events} />
      {word ? (
        <Word word={word} />
      ) : (
        failed.word && <Notice status="bad" title="The word of the day didn't load" />
      )}
      <Media media={media} now={now} failed={failed.media} />
    </>
  )
}

function dayHeading(key: string, now: Date): string {
  const today = localDateKey(now)
  const tomorrow = localDateKey(new Date(now.getTime() + 86_400_000))
  if (key === today) return 'Today'
  if (key === tomorrow) return 'Tomorrow'
  return weekday(key)
}

function Calendar({
  events,
  now,
  failed,
}: {
  events: CalendarEvent[] | null
  now: Date
  failed: boolean
}) {
  if (!events) {
    return failed ? <Notice status="bad" title="The calendar didn't load" /> : null
  }
  const upcoming = events.filter((e) =>
    e.allDay
      ? localDateKey(new Date(e.start)) >= localDateKey(now)
      : Date.parse(e.end) > now.getTime()
  )
  const byDay = new Map<string, CalendarEvent[]>()
  for (const e of upcoming) {
    const k = localDateKey(new Date(e.start))
    byDay.set(k, [...(byDay.get(k) ?? []), e])
  }
  return (
    <div id="row-cal">
      <Label>Calendar</Label>
      {byDay.size === 0 && (
        <p className="gbm-muted gbm-small">Nothing on the calendar for the next few days.</p>
      )}
      {[...byDay.entries()].map(([k, list]) => (
        <div className="gbm-evs" key={k}>
          <p className="gbm-evday">{dayHeading(k, now)}</p>
          {list.map((e) => (
            <div className="gbm-ev" key={e.id}>
              <time dateTime={e.start}>
                {e.allDay
                  ? 'All day'
                  : new Date(e.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
              </time>
              <span>{e.title.trim() || 'Untitled'}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'es-MX'
    u.rate = 0.85
    const voice = speechSynthesis.getVoices().find((v) => /^es-MX/i.test(v.lang))
    if (voice) u.voice = voice
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  } catch {
    // No speech synthesis in this browser; the button simply does nothing
  }
}

function Word({ word }: { word: WordOfDay }) {
  const [showConj, setShowConj] = useState(false)
  const pos = word.gender
    ? `${word.partOfSpeech}, ${word.gender === 'm' ? 'masculine' : 'feminine'}`
    : word.partOfSpeech
  const hasConj = Boolean(word.conjugations?.length)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
  return (
    <div className="gbm-word" id="row-word" lang="es-MX">
      <p className="gbm-w">{word.word}</p>
      <p className="gbm-pr" lang="en">
        {word.pronunciation ? `${word.pronunciation}, ` : ''}
        {pos}
      </p>
      <p className="gbm-def" lang="en">
        {word.definition}
      </p>
      {word.spanishDefinition && <p className="gbm-def-es">{word.spanishDefinition}</p>}
      <p className="gbm-ex">
        {word.example}
        <small lang="en">{word.exampleTranslation}</small>
      </p>
      {word.note && (
        <p className="gbm-note" lang="en">
          {word.note}
        </p>
      )}
      {hasConj && showConj && (
        <table className="gbm-conj" id="conj">
          {word.conjugationTense && <caption lang="en">{word.conjugationTense}</caption>}
          <tbody>
            {word.conjugations!.map((c) => (
              <tr key={c.pronoun}>
                <td>{c.pronoun}</td>
                <td>{c.form}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(canSpeak || hasConj) && (
        <div className="gbm-wact" lang="en">
          {canSpeak && (
            <button className="gbm-btn" onClick={() => speak(`${word.word}. ${word.example}`)}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M11 5 6 9H3v6h3l5 4z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
              Hear it
            </button>
          )}
          {hasConj && (
            <button
              className="gbm-btn"
              aria-expanded={showConj}
              aria-controls="conj"
              onClick={() => setShowConj(!showConj)}
            >
              {showConj ? 'Hide conjugations' : 'Show conjugations'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const MEDIA_DAYS_SHOWN = 3

function Media({
  media,
  now,
  failed,
}: {
  media: UpcomingItem[] | null
  now: Date
  failed: boolean
}) {
  const [all, setAll] = useState(false)
  if (!media) return failed ? <Notice status="bad" title="Upcoming media didn't load" /> : null
  const byDay = new Map<string, UpcomingItem[]>()
  for (const m of media) byDay.set(m.date, [...(byDay.get(m.date) ?? []), m])
  const days = [...byDay.entries()]
  const shown = all ? days : days.slice(0, MEDIA_DAYS_SHOWN)
  return (
    <div id="row-media">
      <Label right={`${media.length} coming up`}>On Plex soon</Label>
      {media.length === 0 ? (
        <p className="gbm-muted gbm-small">Nothing new in the next two weeks.</p>
      ) : (
        <table className="gbm-mtable">
          {shown.map(([date, items]) => (
            <tbody key={date}>
              <tr>
                <th colSpan={2}>{dayHeading(date, now)}</th>
              </tr>
              {items.map((m) => (
                <tr key={`${m.title}-${m.subtitle}`}>
                  <td>
                    {m.title}
                    {m.type === 'movie' && <span className="gbm-tag">movie</span>}
                  </td>
                  <td>{m.type === 'movie' ? '' : m.subtitle}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}
      {days.length > MEDIA_DAYS_SHOWN && (
        <button className="gbm-link" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${media.length}`}
        </button>
      )}
    </div>
  )
}
