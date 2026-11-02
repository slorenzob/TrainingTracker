import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonListHeader } from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { add } from 'ionicons/icons'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import StarRating from '../../components/StarRating'
import { listSessionSummaries } from '../../db/sessions'
import { formatAverage, formatDate, formatDuration } from '../../i18n/format'

interface PlanSessionsListProps {
  dogId: string
  planId: string
  /** Number of active exercises; sessions can't be recorded for an empty plan. */
  exerciseCount: number
}

export default function PlanSessionsList({ dogId, planId, exerciseCount }: PlanSessionsListProps) {
  const { t } = useTranslation()
  const sessions = useLiveQuery(() => listSessionSummaries(planId), [planId])
  const planHref = `/dogs/${dogId}/plans/${planId}`

  return (
    <>
      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('plans.sessions')}</IonLabel>
          {exerciseCount > 0 && (
            <IonButton routerLink={`${planHref}/sessions/new`}>
              <IonIcon slot="start" icon={add} />
              {t('plans.newSession')}
            </IonButton>
          )}
        </IonListHeader>
        {sessions?.map((session) => (
          <IonItem key={session.id} routerLink={`${planHref}/sessions/${session.id}`} detail>
            <IonLabel>
              <h2>{formatDate(session.date)}</h2>
              <p>
                {
                  // Plural follows the total: "1 de 3 ejercicios".
                  t('sessions.done', { done: session.ratedCount, count: exerciseCount })
                }
                {session.average !== undefined &&
                  ` · ${t('sessions.average', { value: formatAverage(session.average) })}`}
                {session.durationSeconds !== undefined &&
                  ` · ${formatDuration(session.durationSeconds)}`}
              </p>
              {session.comment && <p>{session.comment}</p>}
            </IonLabel>
            {session.average !== undefined && (
              <div slot="end">
                <StarRating value={Math.round(session.average)} />
              </div>
            )}
          </IonItem>
        ))}
      </IonList>
      {sessions?.length === 0 && (
        <EmptyState
          message={exerciseCount > 0 ? t('plans.noSessions') : t('plans.sessionsNeedExercises')}
        />
      )}
    </>
  )
}
