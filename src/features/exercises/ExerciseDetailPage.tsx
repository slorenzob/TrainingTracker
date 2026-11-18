import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonText,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createOutline, linkOutline, removeCircleOutline, trashOutline } from 'ionicons/icons'
import { useTranslation } from 'react-i18next'
import { useAppToast } from '../../components/useAppToast'
import { useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { ExerciseInUseError } from '../../db/errors'
import {
  deleteExercise,
  getExercise,
  getExerciseUsage,
  type ExerciseUsage,
} from '../../db/exercises'
import { removeExerciseFromPlanByExercise } from '../../db/plans'
import MediaGallery from '../../media/MediaGallery'
import './exercises.css'

export default function ExerciseDetailPage() {
  const { t } = useTranslation()
  const { exerciseId, dogId, planId } = useParams<{
    exerciseId: string
    dogId?: string
    planId?: string
  }>()
  // Also opened from a plan, inside the Dogs tab.
  const backHref = planId ? `/dogs/${dogId}/plans/${planId}` : '/exercises'
  const router = useIonRouter()
  const [presentAlert] = useIonAlert()
  const presentToast = useAppToast()
  // undefined while loading, null when the exercise does not exist.
  const exercise = useLiveQuery(async () => (await getExercise(exerciseId)) ?? null, [exerciseId])

  if (exercise === undefined)
    return (
      <PageLayout title="" backHref={backHref}>
        {null}
      </PageLayout>
    )
  if (exercise === null) {
    return (
      <PageLayout title={t('tabs.exercises')} backHref={backHref}>
        <EmptyState message={t('common.notFound')} />
      </PageLayout>
    )
  }

  const showInUse = (usage: ExerciseUsage[]) =>
    presentAlert({
      header: t('exercises.inUseTitle'),
      message:
        t('exercises.inUseMessage', {
          plans: usage
            .map((u) =>
              t(u.retired ? 'exercises.usageRetired' : 'exercises.usage', {
                plan: u.plan.name,
                dog: u.dogName,
              }),
            )
            .join(', '),
        }) + (usage.some((u) => u.retired) ? ` ${t('exercises.inUseRetiredHint')}` : ''),
      buttons: [{ text: t('common.close'), role: 'cancel' }],
    })

  const deleteFromLibrary = async () => {
    try {
      await deleteExercise(exercise.id)
      router.push('/exercises', 'back', 'pop')
    } catch (e) {
      if (!(e instanceof ExerciseInUseError)) throw e
      void showInUse(await getExerciseUsage(exercise.id))
    }
  }

  const confirmDelete = async () => {
    const usage = await getExerciseUsage(exercise.id)
    if (usage.length > 0) {
      void showInUse(usage)
      return
    }
    void presentAlert({
      header: t('exercises.deleteTitle', { title: exercise.title }),
      message: t('exercises.deleteMessage'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        { text: t('common.delete'), role: 'destructive', handler: () => void deleteFromLibrary() },
      ],
    })
  }

  const removeFromPlan = async () => {
    const outcome = await removeExerciseFromPlanByExercise(planId!, exercise.id)
    void presentToast({
      message: outcome === 'archived' ? t('plans.archivedToast') : t('plans.removed'),
      duration: 2500,
    })
    router.push(backHref, 'back', 'pop')
  }

  const confirmRemoveFromPlan = () =>
    presentAlert({
      header: t('plans.removeTitle', { title: exercise.title }),
      message: t('plans.removeMessage'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        { text: t('common.remove'), role: 'destructive', handler: () => void removeFromPlan() },
      ],
    })

  return (
    <PageLayout
      title={exercise.title}
      backHref={backHref}
      actions={
        <>
          <IonButton aria-label={t('common.edit')} routerLink={`/exercises/${exercise.id}/edit`}>
            <IonIcon slot="icon-only" icon={createOutline} />
          </IonButton>
          {planId ? (
            <IonButton
              aria-label={t('plans.removeFromPlan')}
              color="danger"
              onClick={() => void confirmRemoveFromPlan()}
            >
              <IonIcon slot="icon-only" icon={removeCircleOutline} />
            </IonButton>
          ) : (
            <IonButton
              aria-label={t('common.delete')}
              color="danger"
              onClick={() => void confirmDelete()}
            >
              <IonIcon slot="icon-only" icon={trashOutline} />
            </IonButton>
          )}
        </>
      }
    >
      <div className="ion-padding">
        <h1 className="ion-no-margin">{exercise.title}</h1>
        <IonText color={exercise.description ? undefined : 'medium'}>
          <p className="exercise-description">
            {exercise.description || t('exercises.noDescription')}
          </p>
        </IonText>
      </div>

      {exercise.links.length > 0 && (
        <IonList inset>
          <IonListHeader>
            <IonLabel>{t('exercises.links')}</IonLabel>
          </IonListHeader>
          {exercise.links.map((link) => (
            <IonItem
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              detail
            >
              <IonIcon slot="start" icon={linkOutline} aria-hidden />
              <IonLabel className="ion-text-wrap">{link.label || link.url}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      )}

      {exercise.media.length > 0 && (
        <>
          <IonListHeader>
            <IonLabel>{t('exercises.media')}</IonLabel>
          </IonListHeader>
          <div className="exercise-section">
            <MediaGallery items={exercise.media} />
          </div>
        </>
      )}
    </PageLayout>
  )
}
