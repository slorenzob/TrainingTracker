import { useTranslation } from 'react-i18next'
import type { Plan } from '../../db/types'
import { formatDate } from '../../i18n/format'

/** "Desde el 1 de octubre de 2026" or "Del 1 oct 2026 al 31 oct 2026". */
export function usePlanDates() {
  const { t } = useTranslation()
  return (plan: Pick<Plan, 'startDate' | 'endDate'>) =>
    plan.endDate
      ? t('plans.range', {
          start: formatDate(plan.startDate, 'medium'),
          end: formatDate(plan.endDate, 'medium'),
        })
      : t('plans.since', { date: formatDate(plan.startDate) })
}
