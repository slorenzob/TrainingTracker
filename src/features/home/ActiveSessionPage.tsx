import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonText,
  IonTextarea,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import { informationCircleOutline, pause, play } from 'ionicons/icons'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import StarRating from '../../components/StarRating'
import { useAppToast } from '../../components/useAppToast'
import { useNow } from '../../components/useNow'
import {
  discardActiveSession,
  elapsedMs,
  finishActiveSession,
  getActiveSession,
  pauseActiveSession,
  resumeActiveSession,
  setActiveComment,
  setActiveRating,
} from '../../db/activeSession'
import { getPlanExercises, type PlanExerciseWithDetails } from '../../db/plans'
import { db } from '../../db/schema'
import type { ActiveSession, Dog, Plan, RatingDraft } from '../../db/types'
import { formatDuration, formatTimer } from '../../i18n/format'
import MediaGallery from '../../media/MediaGallery'
import '../sessions/sessions.css'
import './home.css'

interface Loaded {
  active: ActiveSession
  dog: Dog
  plan: Plan
  exercises: PlanExerciseWithDetails[]
}

/**
 * The session being trained: every exercise of the plan with stars and a note, a comment
 * and a pausable timer. Each change is saved at once so the session survives the app
 * closing; "Terminar sesión" turns it into a regular session.
 */
export default function ActiveSessionPage() {
  const { t } = useTranslation()
  const router = useIonRouter()
  const presentToast = useAppToast()
  const [presentAlert] = useIonAlert()
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading')
  const [data, setData] = useState<Loaded>()
  // Edited locally and written through, so typing never waits on IndexedDB.
  const [ratings, setRatings] = useState<Record<string, RatingDraft>>({})
  const [comment, setComment] = useState('')
  const [runningSince, setRunningSince] = useState<string>()
  const [elapsed, setElapsed] = useState(0)
  const [openInfo, setOpenInfo] = useState<string>()
  const [error, setError] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const writes = useRef(Promise.resolve())
  const now = useNow(Boolean(runningSince))

  useEffect(() => {
    void (async () => {
      const active = await getActiveSession()
      if (!active) return setState('none')
      const [dog, plan] = await Promise.all([
        db.dogs.get(active.dogId),
        db.plans.get(active.planId),
      ])
      if (!dog || !plan) {
        await discardActiveSession()
        void presentToast({ message: t('active.gone'), color: 'warning' })
        return setState('none')
      }
      const exercises = await getPlanExercises(plan.id)
      setData({ active, dog, plan, exercises })
      setRatings(active.ratings)
      setComment(active.comment)
      setRunningSince(active.runningSince)
      setElapsed(active.elapsedMs)
      setState('ready')
    })()
  }, [presentToast, t])

  /**
   * Queues a write so finishing waits for every pending change. A failed write is logged
   * and the queue carries on, so it can never block finishing or discarding.
   */
  const persist = (write: () => Promise<unknown>) => {
    writes.current = writes.current.then(write).then(
      () => undefined,
      (e: unknown) => console.error('Could not save the session in progress', e),
    )
  }

  /**
   * Back to Inicio. It is normally the page underneath (opened from Inicio or the wizard),
   * so go back to it: replacing the current page with the one below leaves Ionic showing
   * this page. Opened directly (e.g. after a reload), Inicio becomes the tab's root.
   */
  const leave = () => {
    if (router.canGoBack()) router.goBack()
    else router.push('/home', 'root', 'replace')
  }

  const rate = (planExerciseId: string, changes: Partial<RatingDraft>) => {
    setRatings((current) => ({
      ...current,
      [planExerciseId]: { ...(current[planExerciseId] ?? { note: '' }), ...changes },
    }))
    setError(false)
    persist(() => setActiveRating(planExerciseId, changes))
  }

  const toggleTimer = () => {
    const at = new Date()
    if (runningSince) {
      setElapsed(elapsedMs({ elapsedMs: elapsed, runningSince }, at))
      setRunningSince(undefined)
      persist(() => pauseActiveSession(at))
    } else {
      setRunningSince(at.toISOString())
      persist(() => resumeActiveSession(at))
    }
  }

  const finish = async () => {
    if (!Object.values(ratings).some((r) => r.stars !== undefined)) {
      setError(true)
      return
    }
    setFinishing(true)
    try {
      await writes.current
      const session = await finishActiveSession()
      void presentToast({
        message: t('active.saved', { duration: formatDuration(session.durationSeconds ?? 0) }),
      })
      leave()
    } finally {
      setFinishing(false)
    }
  }

  const confirmDiscard = () =>
    presentAlert({
      header: t('active.discardTitle'),
      message: t('active.discardMessage'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        {
          text: t('home.discard'),
          role: 'destructive',
          handler: () => {
            void writes.current.then(discardActiveSession).then(leave)
          },
        },
      ],
    })

  if (state !== 'ready' || !data) {
    return (
      <PageLayout title={t('active.title')} backHref="/home">
        {state === 'none' && <EmptyState message={t('active.none')} />}
      </PageLayout>
    )
  }

  const time = elapsedMs({ elapsedMs: elapsed, runningSince }, now)

  return (
    <PageLayout title={t('active.title')} backHref="/home">
      <div className="active-header">
        <div>
          <h1>{data.dog.name}</h1>
          <p>{data.plan.name}</p>
        </div>
        <span
          className={`active-timer${runningSince ? '' : ' active-timer--paused'}`}
          role="timer"
          aria-label={t('active.timer')}
        >
          {formatTimer(time)}
        </span>
      </div>
      <div className="start-footer ion-padding-top">
        <IonButton expand="block" fill="outline" onClick={toggleTimer}>
          <IonIcon slot="start" icon={runningSince ? pause : play} aria-hidden />
          {runningSince ? t('active.pause') : t('active.resume')}
        </IonButton>
      </div>

      <IonListHeader>
        <IonLabel>{t('sessions.exercises')}</IonLabel>
      </IonListHeader>
      <IonText color="medium">
        <p className="session-help">{t('sessions.exercisesHelp')}</p>
      </IonText>
      <IonList inset>
        {data.exercises.map((pe) => {
          const rating = ratings[pe.id]
          const infoOpen = openInfo === pe.id
          const hasInfo = Boolean(pe.exercise.description || pe.exercise.media.length)
          return (
            <IonItem key={pe.id} className="session-exercise">
              <div className="session-exercise__body">
                <div className="session-exercise__title">
                  <strong>{pe.exercise.title}</strong>
                  {hasInfo && (
                    <IonButton
                      fill="clear"
                      size="small"
                      aria-expanded={infoOpen}
                      aria-label={t(infoOpen ? 'active.hideInfo' : 'active.showInfo', {
                        title: pe.exercise.title,
                      })}
                      onClick={() => setOpenInfo(infoOpen ? undefined : pe.id)}
                    >
                      <IonIcon slot="icon-only" icon={informationCircleOutline} />
                    </IonButton>
                  )}
                </div>
                {infoOpen && (
                  <>
                    {pe.exercise.description && (
                      <p className="active-exercise__info">{pe.exercise.description}</p>
                    )}
                    {pe.exercise.media.length > 0 && (
                      <div className="active-exercise__media">
                        <MediaGallery items={pe.exercise.media} />
                      </div>
                    )}
                  </>
                )}
                <StarRating
                  size="large"
                  label={pe.exercise.title}
                  value={rating?.stars}
                  onChange={(stars) => rate(pe.id, { stars })}
                />
                {rating?.stars !== undefined && (
                  <IonInput
                    aria-label={t('sessions.note', { title: pe.exercise.title })}
                    placeholder={t('sessions.notePlaceholder')}
                    value={rating.note}
                    autocapitalize="sentences"
                    onIonInput={(e) => rate(pe.id, { note: e.detail.value ?? '' })}
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
            onIonInput={(e) => {
              const value = e.detail.value ?? ''
              setComment(value)
              persist(() => setActiveComment(value))
            }}
          />
        </IonItem>
      </IonList>

      <div className="start-footer">
        <IonButton expand="block" size="large" disabled={finishing} onClick={() => void finish()}>
          {t('active.finish')}
        </IonButton>
        <IonButton expand="block" fill="clear" color="danger" onClick={() => void confirmDiscard()}>
          {t('active.discard')}
        </IonButton>
      </div>
    </PageLayout>
  )
}
