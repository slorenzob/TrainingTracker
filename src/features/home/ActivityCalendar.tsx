import { IonIcon } from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { checkmark } from 'ionicons/icons'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../../db/schema'
import type { Dog, IsoDate } from '../../db/types'
import { formatDate, parseIsoDate } from '../../i18n/format'
import { WEEK } from '../reminders/reminderLogic'
import { ACTIVITY_WEEKS, activityDays, activityLevel } from './homeLogic'

/** Sessions per day over the last weeks, for every dog or the one picked. */
export default function ActivityCalendar({ dogs, today }: { dogs: Dog[]; today: IsoDate }) {
  const { t } = useTranslation()
  const [dogId, setDogId] = useState<string>()
  const selected = dogs.some((d) => d.id === dogId) ? dogId : undefined

  const days = useMemo(() => activityDays(parseIsoDate(today)), [today])
  const sessions = useLiveQuery(
    () => db.sessions.where('date').between(days[0], today, true, true).toArray(),
    [days, today],
  )
  const counts = new Map<IsoDate, number>()
  for (const s of sessions ?? []) {
    if (!selected || s.dogId === selected) counts.set(s.date, (counts.get(s.date) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0)
  const summary = t('home.activitySummary', { count: total, weeks: ACTIVITY_WEEKS })

  const chip = (id: string | undefined, label: string) => (
    <button
      key={id ?? 'all'}
      type="button"
      className="filter-chip"
      aria-pressed={selected === id}
      onClick={() => setDogId(id)}
    >
      {selected === id && <IonIcon icon={checkmark} aria-hidden />}
      {label}
    </button>
  )

  return (
    <section className="activity" aria-labelledby="activity-title">
      <h2 id="activity-title" className="home-section-title">
        {t('home.activity')}
      </h2>
      <div className="activity__card">
        {dogs.length > 1 && (
          <div className="activity__filter" role="group" aria-label={t('home.activityFilter')}>
            {chip(undefined, t('home.allDogs'))}
            {dogs.map((d) => chip(d.id, d.name))}
          </div>
        )}
        <p className="activity__summary">{summary}</p>
        <div className="activity__grid" role="img" aria-label={summary}>
          {WEEK.map((d, i) => (
            <span key={d} className="activity__weekday">
              {i % 2 === 0 ? t(`weekdays.short.${d}`) : ''}
            </span>
          ))}
          {days.map((date) => {
            const count = counts.get(date) ?? 0
            const future = date > today
            return (
              <span
                key={date}
                className={`activity__day activity__day--${future ? 'future' : activityLevel(count)}`}
                data-today={date === today || undefined}
                title={
                  future
                    ? undefined
                    : `${formatDate(date, 'medium')}: ${t('home.daySessions', { count })}`
                }
              />
            )
          })}
        </div>
        <div className="activity__legend" aria-hidden>
          {t('home.less')}
          <span className="activity__day activity__day--0" />
          <span className="activity__day activity__day--1" />
          <span className="activity__day activity__day--2" />
          {t('home.more')}
        </div>
      </div>
    </section>
  )
}
