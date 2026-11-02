import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRadio,
  IonRadioGroup,
  useIonRouter,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { getActiveSession, getPlanChoices, startActiveSession } from '../../db/activeSession'
import { listDogs } from '../../db/dogs'
import { db } from '../../db/schema'
import DogAvatar from '../dogs/DogAvatar'
import { usePlanDates } from '../plans/usePlanDates'
import './home.css'

async function loadPlanStep(dogId: string) {
  const { plans, defaultPlanId } = await getPlanChoices(dogId)
  const counts = await Promise.all(
    plans.map((p) =>
      db.planExercises
        .where('planId')
        .equals(p.id)
        .filter((pe) => !pe.archived)
        .count(),
    ),
  )
  return { plans: plans.map((plan, i) => ({ plan, exerciseCount: counts[i] })), defaultPlanId }
}

/**
 * Two-step wizard to start a session: pick the dog (skipped when there is only one), then
 * the plan (preselected: the last one used). Starting opens the in-progress session.
 */
export default function StartSessionPage() {
  const { t } = useTranslation()
  const router = useIonRouter()
  const planDates = usePlanDates()
  const dogs = useLiveQuery(listDogs)
  const [dogId, setDogId] = useState<string>()
  const [planId, setPlanId] = useState<string>()
  const [starting, setStarting] = useState(false)

  const onlyDog = dogs?.length === 1 ? dogs[0] : undefined
  const selectedDogId = onlyDog?.id ?? dogId
  const dog = dogs?.find((d) => d.id === selectedDogId)
  const step = dog ? 'plan' : 'dog'
  const totalSteps = onlyDog ? 1 : 2

  // A session already in progress is resumed rather than replaced.
  useEffect(() => {
    void getActiveSession().then((active) => {
      if (active) router.push('/home/session', 'forward', 'replace')
    })
  }, [router])

  const planStep = useLiveQuery(
    async () => (selectedDogId ? loadPlanStep(selectedDogId) : null),
    [selectedDogId],
  )
  const chosenPlanId = planId ?? planStep?.defaultPlanId
  const chosen = planStep?.plans.find((p) => p.plan.id === chosenPlanId)

  const start = async () => {
    if (!dog || !chosen) return
    setStarting(true)
    try {
      await startActiveSession(dog.id, chosen.plan.id)
      router.push('/home/session', 'forward', 'replace')
    } finally {
      setStarting(false)
    }
  }

  const changeDogButton = !onlyDog && (
    <IonButton expand="block" fill="clear" onClick={() => setDogId(undefined)}>
      {t('start.changeDog')}
    </IonButton>
  )

  return (
    <PageLayout title={t('start.title')} backHref="/home">
      {dogs?.length === 0 && (
        <>
          <EmptyState message={t('start.noDogs')} />
          <div className="start-footer">
            <IonButton expand="block" routerLink="/dogs">
              {t('start.goToDogs')}
            </IonButton>
          </div>
        </>
      )}

      {dogs && dogs.length > 0 && step === 'dog' && (
        <>
          <p className="start-step">{t('start.step', { current: 1, total: totalSteps })}</p>
          <h1 className="start-heading">{t('start.chooseDog')}</h1>
          <IonList inset>
            {dogs.map((d) => (
              <IonItem
                key={d.id}
                button
                detail
                onClick={() => {
                  setDogId(d.id)
                  setPlanId(undefined)
                }}
              >
                <div slot="start">
                  <DogAvatar dog={d} />
                </div>
                <IonLabel>{d.name}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        </>
      )}

      {dog && planStep && (
        <>
          {totalSteps > 1 && (
            <p className="start-step">{t('start.step', { current: 2, total: 2 })}</p>
          )}
          <h1 className="start-heading">{t('start.choosePlan', { dog: dog.name })}</h1>
          {planStep.plans.length === 0 ? (
            <>
              <EmptyState message={t('start.noPlans', { dog: dog.name })} />
              <div className="start-footer">
                <IonButton expand="block" routerLink={`/dogs/${dog.id}`}>
                  {t('start.goToDog', { dog: dog.name })}
                </IonButton>
                {changeDogButton}
              </div>
            </>
          ) : (
            <>
              <IonList inset>
                <IonRadioGroup
                  value={chosenPlanId}
                  onIonChange={(e) => setPlanId(e.detail.value as string)}
                >
                  {planStep.plans.map(({ plan, exerciseCount }) => (
                    <IonItem key={plan.id}>
                      <IonRadio value={plan.id} justify="space-between">
                        <IonLabel className="ion-text-wrap">
                          <h2>{plan.name}</h2>
                          <p>{planDates(plan)}</p>
                          <p>{t('plans.exerciseCount', { count: exerciseCount })}</p>
                        </IonLabel>
                      </IonRadio>
                      {plan.id === planStep.defaultPlanId && planStep.plans.length > 1 && (
                        <IonNote slot="end">{t('start.lastUsed')}</IonNote>
                      )}
                    </IonItem>
                  ))}
                </IonRadioGroup>
              </IonList>
              <div className="start-footer">
                {chosen?.exerciseCount === 0 && (
                  <IonNote color="danger" className="ion-padding-bottom" role="alert">
                    {t('start.emptyPlan')}
                  </IonNote>
                )}
                <IonButton
                  expand="block"
                  size="large"
                  disabled={!chosen || chosen.exerciseCount === 0 || starting}
                  onClick={() => void start()}
                >
                  {t('start.start')}
                </IonButton>
                {changeDogButton}
              </div>
            </>
          )}
        </>
      )}
    </PageLayout>
  )
}
