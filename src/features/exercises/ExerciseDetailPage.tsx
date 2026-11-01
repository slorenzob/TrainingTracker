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
  useIonToast,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createOutline, linkOutline, trashOutline } from 'ionicons/icons'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { ExerciseInUseError } from '../../db/errors'
import { deleteExercise, getExercise } from '../../db/exercises'
import MediaGallery from '../../media/MediaGallery'
import './exercises.css'

export default function ExerciseDetailPage() {
  const { t } = useTranslation()
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const router = useIonRouter()
  const [presentAlert] = useIonAlert()
  const [presentToast] = useIonToast()
  // undefined while loading, null when the exercise does not exist.
  const exercise = useLiveQuery(async () => (await getExercise(exerciseId)) ?? null, [exerciseId])

  if (exercise === undefined)
    return (
      <PageLayout title="" backHref="/exercises">
        {null}
      </PageLayout>
    )
  if (exercise === null) {
    return (
      <PageLayout title={t('tabs.exercises')} backHref="/exercises">
        <EmptyState message={t('common.notFound')} />
      </PageLayout>
    )
  }

  const remove = async () => {
    try {
      await deleteExercise(exercise.id)
      router.push('/exercises', 'back', 'pop')
    } catch (e) {
      if (!(e instanceof ExerciseInUseError)) throw e
      void presentToast({ message: t('exercises.inUse'), duration: 4000, color: 'warning' })
    }
  }

  const confirmDelete = () =>
    presentAlert({
      header: t('exercises.deleteTitle', { title: exercise.title }),
      message: t('exercises.deleteMessage'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        { text: t('common.delete'), role: 'destructive', handler: () => void remove() },
      ],
    })

  return (
    <PageLayout
      title={exercise.title}
      backHref="/exercises"
      actions={
        <>
          <IonButton aria-label={t('common.edit')} routerLink={`/exercises/${exercise.id}/edit`}>
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
