import { IonItem, IonList, IonSelect, IonSelectOption } from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { listDogs } from '../../db/dogs'
import { getPlan, listPlansForDog } from '../../db/plans'
import PlanSummaryView from './PlanSummaryView'

const STORAGE_KEY = 'progress.selection'

interface Selection {
  dogId?: string
  planId?: string
}

// Remembered per device for convenience only; storage may be unavailable (private mode).
function loadSelection(): Selection {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Selection
  } catch {
    return {}
  }
}

function saveSelection(selection: Selection) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // Ignore: the selection just won't be remembered.
  }
}

/** Progress tab. `?plan=<id>` preselects a plan (used by "Ver progreso" on the plan page). */
export default function ProgressPage() {
  const { t } = useTranslation()
  const { search } = useLocation()
  const [selection, setSelection] = useState<Selection>(loadSelection)

  useEffect(() => {
    const planId = new URLSearchParams(search).get('plan')
    if (!planId) return
    void getPlan(planId).then((plan) => {
      if (plan) setSelection({ dogId: plan.dogId, planId: plan.id })
    })
  }, [search])

  useEffect(() => saveSelection(selection), [selection])

  const dogs = useLiveQuery(listDogs)
  const dogId = dogs?.some((d) => d.id === selection.dogId) ? selection.dogId : dogs?.[0]?.id
  const plans = useLiveQuery(async () => (dogId ? listPlansForDog(dogId) : []), [dogId])
  // Default to the newest active plan, else the newest one.
  const planId = plans?.some((p) => p.id === selection.planId)
    ? selection.planId
    : (plans?.find((p) => p.status === 'active') ?? plans?.[0])?.id
  const dog = dogs?.find((d) => d.id === dogId)

  return (
    <PageLayout title={t('tabs.progress')}>
      {dogs?.length === 0 && <EmptyState message={t('progress.noDogs')} />}
      {dog && (
        <IonList inset className="progress-filters">
          <IonItem>
            <IonSelect
              label={t('progress.dog')}
              value={dogId}
              interface="action-sheet"
              onIonChange={(e) => setSelection({ dogId: e.detail.value as string })}
            >
              {dogs?.map((d) => (
                <IonSelectOption key={d.id} value={d.id}>
                  {d.name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          {plans && plans.length > 0 && (
            <IonItem>
              <IonSelect
                label={t('progress.plan')}
                value={planId}
                interface="action-sheet"
                onIonChange={(e) => setSelection({ dogId, planId: e.detail.value as string })}
              >
                {plans.map((p) => (
                  <IonSelectOption key={p.id} value={p.id}>
                    {p.status === 'active' ? p.name : `${p.name} (${t('plans.finished')})`}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          )}
        </IonList>
      )}
      {dog && plans?.length === 0 && (
        <EmptyState message={t('progress.noPlans', { name: dog.name })} />
      )}
      {dogId && planId && <PlanSummaryView dogId={dogId} planId={planId} />}
    </PageLayout>
  )
}
