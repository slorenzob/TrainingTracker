import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  useIonRouter,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { add } from 'ionicons/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import { listPlansForDog } from '../../db/plans'
import { db } from '../../db/schema'
import type { Dog } from '../../db/types'
import PlanFormModal from './PlanFormModal'
import { PlanStatusBadge } from './PlanStatusBadge'
import { usePlanDates } from './usePlanDates'

async function loadPlans(dogId: string) {
  const plans = await listPlansForDog(dogId)
  const counts = await Promise.all(
    plans.map((p) =>
      db.planExercises
        .where('planId')
        .equals(p.id)
        .filter((pe) => !pe.archived)
        .count(),
    ),
  )
  // Active plans first; each group keeps the newest-first order.
  return plans
    .map((plan, i) => ({ plan, exerciseCount: counts[i] }))
    .sort((a, b) => Number(a.plan.status !== 'active') - Number(b.plan.status !== 'active'))
}

export default function DogPlansList({ dog }: { dog: Dog }) {
  const { t } = useTranslation()
  const router = useIonRouter()
  const planDates = usePlanDates()
  const [creating, setCreating] = useState(false)
  const plans = useLiveQuery(() => loadPlans(dog.id), [dog.id])

  return (
    <>
      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('dogs.plans')}</IonLabel>
          <IonButton onClick={() => setCreating(true)}>
            <IonIcon slot="start" icon={add} />
            {t('dogs.newPlan')}
          </IonButton>
        </IonListHeader>
        {plans?.map(({ plan, exerciseCount }) => (
          <IonItem key={plan.id} routerLink={`/dogs/${dog.id}/plans/${plan.id}`} detail>
            <IonLabel>
              <h2>{plan.name}</h2>
              <p>{planDates(plan)}</p>
              <p>{t('plans.exerciseCount', { count: exerciseCount })}</p>
            </IonLabel>
            <div slot="end">
              <PlanStatusBadge status={plan.status} />
            </div>
          </IonItem>
        ))}
      </IonList>
      {plans?.length === 0 && <EmptyState message={t('dogs.noPlans', { name: dog.name })} />}
      <PlanFormModal
        isOpen={creating}
        dogId={dog.id}
        onDismiss={(saved) => {
          setCreating(false)
          if (saved) router.push(`/dogs/${dog.id}/plans/${saved.id}`)
        }}
      />
    </>
  )
}
