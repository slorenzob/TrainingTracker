import {
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
  IonTextarea,
  useIonRouter,
} from '@ionic/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import StarRating from '../../components/StarRating'
import { useAppToast } from '../../components/useAppToast'
import { getPlanExercises, type PlanExerciseWithDetails } from '../../db/plans'
import { createSession, getSession, updateSession } from '../../db/sessions'
import { todayIso } from '../../db/utils'
import {
  exercisesForForm,
  ratingsFromResults,
  toSessionInput,
  type RatingDraft,
  type RatingsDraft,
} from './sessionForm'
import './sessions.css'

/** Records (`…/sessions/new`) or edits (`…/sessions/:sessionId/edit`) a training session. */
export default function SessionFormPage() {
  const { t } = useTranslation()
  const { dogId, planId, sessionId } = useParams<{
    dogId: string
    planId: string
    sessionId?: string
  }>()
  const router = useIonRouter()
  const presentToast = useAppToast()
  const isEdit = sessionId !== undefined

  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  // Fixed when the form loads, so un-rating an archived exercise doesn't remove its row.
  const [rows, setRows] = useState<PlanExerciseWithDetails[]>([])
  const [date, setDate] = useState(todayIso())
  const [comment, setComment] = useState('')
  const [ratings, setRatings] = useState<RatingsDraft>({})
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      const [exercises, session] = await Promise.all([
        getPlanExercises(planId, { includeArchived: true }),
        sessionId ? getSession(sessionId) : undefined,
      ])
      if (sessionId && !session) return setStatus('missing')
      const initial = ratingsFromResults(session?.results ?? [])
      setRows(exercisesForForm(exercises, initial))
      setRatings(initial)
      if (session) {
        setDate(session.date)
        setComment(session.comment)
      }
      setStatus('ready')
    })()
  }, [planId, sessionId])

  const setRating = (planExerciseId: string, changes: Partial<RatingDraft>) => {
    setRatings((current) => ({
      ...current,
      [planExerciseId]: { ...(current[planExerciseId] ?? { note: '' }), ...changes },
    }))
    setError(false)
  }

  const save = async () => {
    const input = toSessionInput(date || todayIso(), comment, ratings)
    if ('error' in input) {
      setError(true)
      return
    }
    setSaving(true)
    try {
      if (isEdit) await updateSession(sessionId, input)
      else await createSession(planId, input)
      void presentToast({ message: t('sessions.saved') })
      router.goBack()
    } finally {
      setSaving(false)
    }
  }

  const backHref = isEdit
    ? `/dogs/${dogId}/plans/${planId}/sessions/${sessionId}`
    : `/dogs/${dogId}/plans/${planId}`
  const title = isEdit ? t('sessions.editTitle') : t('sessions.new')

  if (status !== 'ready') {
    return (
      <PageLayout title={title} backHref={backHref}>
        {status === 'missing' && <EmptyState message={t('common.notFound')} />}
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title={title}
      backHref={backHref}
      actions={
        <IonButton strong disabled={saving} onClick={() => void save()}>
          {t('common.save')}
        </IonButton>
      }
    >
      <IonList inset>
        <IonItem>
          <IonInput
            label={t('sessions.date')}
            labelPlacement="stacked"
            type="date"
            value={date}
            onIonInput={(e) => setDate(e.detail.value ?? '')}
          />
        </IonItem>
      </IonList>

      <IonListHeader>
        <IonLabel>{t('sessions.exercises')}</IonLabel>
      </IonListHeader>
      <IonText color="medium">
        <p className="session-help">{t('sessions.exercisesHelp')}</p>
      </IonText>
      <IonList inset>
        {rows.map((pe) => {
          const rating = ratings[pe.id]
          return (
            <IonItem key={pe.id} className="session-exercise">
              <div className="session-exercise__body">
                <div className="session-exercise__title">
                  <strong>{pe.exercise.title}</strong>
                  {pe.archived && <IonNote>{t('sessions.archivedExercise')}</IonNote>}
                </div>
                <StarRating
                  size="large"
                  label={pe.exercise.title}
                  value={rating?.stars}
                  onChange={(stars) => setRating(pe.id, { stars })}
                />
                {rating?.stars !== undefined && (
                  <IonInput
                    aria-label={t('sessions.note', { title: pe.exercise.title })}
                    placeholder={t('sessions.notePlaceholder')}
                    value={rating.note}
                    autocapitalize="sentences"
                    onIonInput={(e) => setRating(pe.id, { note: e.detail.value ?? '' })}
                  />
                )}
              </div>
            </IonItem>
          )
        })}
      </IonList>
      {error && (
        <IonText color="danger">
          <p className="session-help" role="alert">
            {t('sessions.needOneRating')}
          </p>
        </IonText>
      )}

      <IonList inset>
        <IonItem>
          <IonTextarea
            label={`${t('sessions.comment')} (${t('common.optional')})`}
            labelPlacement="stacked"
            value={comment}
            autoGrow
            rows={3}
            autocapitalize="sentences"
            onIonInput={(e) => setComment(e.detail.value ?? '')}
          />
        </IonItem>
      </IonList>
    </PageLayout>
  )
}
