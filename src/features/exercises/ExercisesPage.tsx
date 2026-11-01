import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonThumbnail,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { add, barbellOutline } from 'ionicons/icons'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { listExercises } from '../../db/exercises'
import { normalizeForSearch } from '../../i18n/format'
import MediaThumb from '../../media/MediaThumb'
import './exercises.css'

export default function ExercisesPage() {
  const { t } = useTranslation()
  const exercises = useLiveQuery(listExercises)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query.trim())
    if (!exercises || !q) return exercises
    return exercises.filter(
      (e) =>
        normalizeForSearch(e.title).includes(q) || normalizeForSearch(e.description).includes(q),
    )
  }, [exercises, query])

  return (
    <PageLayout
      title={t('tabs.exercises')}
      fixed={
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton aria-label={t('exercises.new')} routerLink="/exercises/new">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      }
    >
      {exercises?.length === 0 ? (
        <EmptyState message={t('exercises.empty')} />
      ) : (
        <>
          <IonSearchbar
            placeholder={t('exercises.search')}
            value={query}
            onIonInput={(e) => setQuery(e.detail.value ?? '')}
          />
          {filtered?.length === 0 && <EmptyState message={t('exercises.noResults')} />}
          <IonList>
            {filtered?.map((exercise) => (
              <IonItem key={exercise.id} routerLink={`/exercises/${exercise.id}`} detail>
                <IonThumbnail slot="start" className="exercise-thumb">
                  {exercise.media[0] ? (
                    <MediaThumb media={exercise.media[0]} />
                  ) : (
                    <IonIcon icon={barbellOutline} aria-hidden />
                  )}
                </IonThumbnail>
                <IonLabel>
                  <h2>{exercise.title}</h2>
                  {exercise.description && <p>{exercise.description}</p>}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </>
      )}
    </PageLayout>
  )
}
