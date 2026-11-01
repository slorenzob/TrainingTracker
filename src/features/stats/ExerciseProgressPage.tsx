import { IonItem, IonLabel, IonList, IonListHeader, IonText } from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import StarRating from '../../components/StarRating'
import { getDog } from '../../db/dogs'
import { getExercise } from '../../db/exercises'
import { averageStars } from '../../db/sessions'
import { getExerciseHistory } from '../../db/stats'
import { formatAverage, formatDate } from '../../i18n/format'
import StatTiles from './StatTiles'

// Recharts is heavy; load it only when a chart is actually shown.
const StarsChart = lazy(() => import('./StarsChart'))

async function load(dogId: string, exerciseId: string) {
  const [dog, exercise, history] = await Promise.all([
    getDog(dogId),
    getExercise(exerciseId),
    getExerciseHistory(dogId, exerciseId),
  ])
  return dog && exercise ? { dog, exercise, history } : null
}

/** How one dog's ratings for one exercise evolved, across all its plans. */
export default function ExerciseProgressPage() {
  const { t } = useTranslation()
  const { dogId, exerciseId } = useParams<{ dogId: string; exerciseId: string }>()
  const data = useLiveQuery(() => load(dogId, exerciseId), [dogId, exerciseId])

  if (data === undefined) {
    return (
      <PageLayout title="" backHref="/progress">
        {null}
      </PageLayout>
    )
  }
  if (data === null) {
    return (
      <PageLayout title={t('progress.exerciseTitle')} backHref="/progress">
        <EmptyState message={t('common.notFound')} />
      </PageLayout>
    )
  }

  const { dog, exercise, history } = data
  const last = history.at(-1)

  return (
    <PageLayout title={exercise.title} backHref="/progress">
      <div className="ion-padding-horizontal ion-padding-top">
        <h1 className="ion-no-margin">{exercise.title}</h1>
        <IonText color="medium">
          <p className="ion-no-margin">{dog.name}</p>
        </IonText>
      </div>
      <div className="ion-padding-top">
        <StatTiles
          tiles={[
            { label: t('progress.ratings'), value: String(history.length) },
            { label: t('progress.average'), value: formatAverage(averageStars(history)) },
            { label: t('progress.lastRating'), value: last ? String(last.stars) : '—' },
          ]}
        />
      </div>

      {history.length === 0 ? (
        <EmptyState message={t('progress.noRatings', { dog: dog.name })} />
      ) : (
        <>
          <IonListHeader>
            <IonLabel>{t('progress.chartTitle')}</IonLabel>
          </IonListHeader>
          <Suspense fallback={<div className="stars-chart" />}>
            <StarsChart
              points={history}
              description={t('progress.chartDescription', {
                exercise: exercise.title,
                dog: dog.name,
              })}
            />
          </Suspense>
          {/* The same data as a list: the accessible, exact view of the chart. */}
          <IonList inset>
            <IonListHeader>
              <IonLabel>{t('progress.history')}</IonLabel>
            </IonListHeader>
            {[...history].reverse().map((point) => (
              <IonItem key={point.sessionId}>
                <IonLabel className="ion-text-wrap">
                  <h2>{formatDate(point.date, 'medium')}</h2>
                  <p>{point.planName}</p>
                  {point.note && <p>{point.note}</p>}
                </IonLabel>
                <div slot="end">
                  <StarRating value={point.stars} label={formatDate(point.date, 'medium')} />
                </div>
              </IonItem>
            ))}
          </IonList>
        </>
      )}
    </PageLayout>
  )
}
