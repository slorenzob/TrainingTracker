import { IonBadge } from '@ionic/react'
import { useTranslation } from 'react-i18next'
import type { Plan } from '../../db/types'

export function PlanStatusBadge({ status }: Pick<Plan, 'status'>) {
  const { t } = useTranslation()
  return (
    <IonBadge color={status === 'active' ? 'success' : 'medium'}>
      {status === 'active' ? t('plans.active') : t('plans.finished')}
    </IonBadge>
  )
}
