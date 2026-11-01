import { useTranslation } from 'react-i18next'
import type { Reminder, Weekday } from '../../db/types'
import { WEEK } from './reminderLogic'

/** Formats a reminder's days as "L, X, V" (Monday first) or "Todos los días". */
export function useWeekdayLabels() {
  const { t } = useTranslation()
  const short = (d: Weekday) => t(`weekdays.short.${d}`)
  const long = (d: Weekday) => t(`weekdays.long.${d}`)
  const days = (weekdays: Reminder['weekdays']) =>
    weekdays.length === 7
      ? t('weekdays.everyDay')
      : WEEK.filter((d) => weekdays.includes(d))
          .map(short)
          .join(', ')
  return { short, long, days }
}
