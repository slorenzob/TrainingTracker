import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createOutline, trashOutline } from 'ionicons/icons'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import StarRating from '../../components/StarRating'
import { getPlanExercises } from '../../db/plans'
import { deleteSession, getSession } from '../../db/sessions'
import { formatDate } from '../../i18n/format'
import './sessions.css'

async function loadSession(planId: string, sessionId: string) {
  const session = await getSession(sessionId)
  if (!session) return null
  const planExercises = await getPlanExercises(planId, { includeArchived: true })
  const byPlanExercise = new Map(session.results.map((r) => [r.planExerciseId, r]))
  // Plan order; exercises that weren't practised are listed after the rated ones.
  const rated = planExercises.flatMap((pe) => {
    const result = byPlanExercise.get(pe.id)
    return result ? [{ pe, result }] : []
  })
  const notDone = planExercises.filter((pe) => !pe.archived && !byPlanExercise.has(pe.id))
  return { session, rated, notDone }
}

export default function SessionDetailPage() {
  const { t } = useTranslation()
  const { dogId, planId, sessionId } = useParams<{
    dogId: string
    planId: string
    sessionId: string
  }>()
  const router = useIonRouter()
  const [presentAlert] = useIonAlert()
  const data = useLiveQuery(() => loadSession(planId, sessionId), [planId, sessionId])

  const planHref = `/dogs/${dogId}/plans/${planId}`
  if (data === undefined) {
    return (
      <PageLayout title="" backHref={planHref}>
        {null}
      </PageLayout>
    )
  }
  if (data === null) {
    return (
      <PageLayout title={t('plans.sessions')} backHref={planHref}>
        <EmptyState message={t('common.notFound')} />
      </PageLayout>
    )
  }

  const { session, rated, notDone } = data
  const title = t('sessions.title', { date: formatDate(session.date) })

  const confirmDelete = () =>
    presentAlert({
      header: t('sessions.deleteTitle'),
      message: t('sessions.deleteMessage'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        {
          text: t('common.delete'),
          role: 'destructive',
          handler: () => {
            void deleteSession(session.id).then(() => router.push(planHref, 'back', 'pop'))
          },
        },
      ],
    })

  return (
    <PageLayout
      title={title}
      backHref={planHref}
      actions={
        <>
          <IonButton
            aria-label={t('common.edit')}
            routerLink={`${planHref}/sessions/${session.id}/edit`}
          >
            <IonIcon slot="icon-only" icon={createOutline} />
          </IonButton>
          <IonButton
            aria-label={t('common.delete')}
            color="danger"
            onClick={() => void confirmDelete()}
          >
            <IonIcon slot="icon-only" icon={trashOutline} />
          </IonButton>
        </>
      }
    >
      <div className="ion-padding">
        <h1 className="ion-no-margin">{title}</h1>
        <IonText color={session.comment ? undefined : 'medium'}>
          <p className="session-comment">{session.comment || t('sessions.noComment')}</p>
        </IonText>
      </div>

      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('sessions.exercises')}</IonLabel>
        </IonListHeader>
        {rated.map(({ pe, result }) => (
          <IonItem key={pe.id}>
            <IonLabel className="ion-text-wrap">
              <h2>{pe.exercise.title}</h2>
              <StarRating value={result.stars} label={pe.exercise.title} />
              {result.note && <p className="session-result__note">{result.note}</p>}
            </IonLabel>
          </IonItem>
        ))}
        {notDone.map((pe) => (
          <IonItem key={pe.id}>
            <IonLabel color="medium">{pe.exercise.title}</IonLabel>
            <IonNote slot="end">{t('sessions.notDone')}</IonNote>
          </IonItem>
        ))}
      </IonList>
    </PageLayout>
  )
}
