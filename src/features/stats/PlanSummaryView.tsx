import { IonItem, IonLabel, IonList, IonListHeader, IonNote } from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import StarRating from '../../components/StarRating'
import { getPlanSummary, type ExerciseStats } from '../../db/stats'
import { formatAverage, formatDate } from '../../i18n/format'
import StatTiles from './StatTiles'

function ExerciseRow({ stats, dogId }: { stats: ExerciseStats; dogId: string }) {
  const { t } = useTranslation()
  const practiced = t('progress.practiced', { count: stats.timesPracticed })
  return (
    <IonItem routerLink={`/progress/dogs/${dogId}/exercises/${stats.exerciseId}`} detail>
      <IonLabel>
        <h2>{stats.exercise.title}</h2>
        <p>
          {stats.average === undefined
            ? practiced
            : `${practiced} · ${t('progress.averageValue', { value: formatAverage(stats.average) })}`}
        </p>
      </IonLabel>
      {stats.archived && <IonNote slot="end">{t('progress.archived')}</IonNote>}
      {stats.average !== undefined && (
        <div slot="end">
          <StarRating value={Math.round(stats.average)} label={stats.exercise.title} />
        </div>
      )}
    </IonItem>
  )
}

/** Sessions, averages and per-exercise practice for one plan. */
export default function PlanSummaryView({ planId, dogId }: { planId: string; dogId: string }) {
  const { t } = useTranslation()
  const summary = useLiveQuery(() => getPlanSummary(planId), [planId])
  if (!summary) return null

  return (
    <>
      <StatTiles
        tiles={[
          { label: t('progress.sessions'), value: String(summary.sessionCount) },
          { label: t('progress.average'), value: formatAverage(summary.overallAverage) },
          {
            label: t('progress.lastSession'),
            value: summary.lastSessionDate ? formatDate(summary.lastSessionDate, 'medium') : '—',
          },
        ]}
      />
      {summary.sessionCount === 0 && <EmptyState message={t('progress.empty')} />}

      {summary.leastPracticed.length > 0 && (
        <>
          <IonListHeader>
            <IonLabel>{t('progress.leastPracticed')}</IonLabel>
          </IonListHeader>
          <p className="progress-section-help">{t('progress.leastPracticedHelp')}</p>
          <IonList inset>
            {summary.leastPracticed.map((stats) => (
              <ExerciseRow key={stats.id} stats={stats} dogId={dogId} />
            ))}
          </IonList>
        </>
      )}

      {summary.exercises.length > 0 && (
        <IonList inset>
          <IonListHeader>
            <IonLabel>{t('progress.byExercise')}</IonLabel>
          </IonListHeader>
          {summary.exercises.map((stats) => (
            <ExerciseRow key={stats.id} stats={stats} dogId={dogId} />
          ))}
        </IonList>
      )}
    </>
  )
}
