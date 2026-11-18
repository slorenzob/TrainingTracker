import { IonButton, IonIcon } from '@ionic/react'
import { alarmOutline, close, play } from 'ionicons/icons'
import { useTranslation } from 'react-i18next'
import { elapsedMs } from '../../db/activeSession'
import type { ActiveSession, IsoDate } from '../../db/types'
import { formatDate, formatTimer } from '../../i18n/format'
import DogAvatar from '../dogs/DogAvatar'
import type { DogCardData } from './homeData'
import { daysBetween } from './homeLogic'

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

interface DogCardProps {
  card: DogCardData
  today: IsoDate
  /** The session in progress, when it is this dog's. */
  session?: { session: ActiveSession; planName: string; now: Date }
  /** Another dog is training: starting a new session is not possible. */
  busy: boolean
  noticeHidden: boolean
  onHideNotice: () => void
  onTrain: () => void
  onDiscard: () => void
}

/** A dog on the home screen: its plan, when it last trained and the way to train it now. */
export default function DogCard({
  card,
  today,
  session,
  busy,
  noticeHidden,
  onHideNotice,
  onTrain,
  onDiscard,
}: DogCardProps) {
  const { t } = useTranslation()
  const { dog, activePlans, plan, planSessions, lastSessionDate, dueAt } = card
  const titleId = `dog-card-${dog.id}`

  const planLine =
    activePlans.length === 0
      ? t('home.noActivePlan')
      : activePlans.length > 1
        ? t('home.activePlans', { count: activePlans.length })
        : t('home.planSessions', { plan: plan?.name, count: planSessions })

  let lastLine = t('home.noSessions')
  if (lastSessionDate) {
    const days = daysBetween(lastSessionDate, today)
    const when = days <= 30 ? relative.format(-days, 'day') : formatDate(lastSessionDate, 'medium')
    lastLine = t('home.lastSession', { when })
  }

  const showNotice = dueAt && !noticeHidden && !session

  return (
    <article className={`dog-card${session ? ' dog-card--active' : ''}`} aria-labelledby={titleId}>
      <div className="dog-card__header">
        <DogAvatar dog={dog} size={48} />
        <div className="dog-card__info">
          <h2 id={titleId}>{dog.name}</h2>
          <p>{planLine}</p>
          <p>{lastLine}</p>
        </div>
      </div>

      {showNotice && (
        <div className="dog-card__notice" role="status">
          <IonIcon icon={alarmOutline} aria-hidden />
          <span>{t('home.dueToday', { time: dueAt })}</span>
          <button
            type="button"
            className="dog-card__notice-close"
            aria-label={t('home.hideNotice')}
            onClick={onHideNotice}
          >
            <IonIcon icon={close} aria-hidden />
          </button>
        </div>
      )}

      {session ? (
        <div className="dog-card__session">
          <p className="dog-card__session-label">
            {t('home.activeSession')} · {session.planName}
          </p>
          <p className="dog-card__timer" aria-label={t('active.timer')}>
            {formatTimer(elapsedMs(session.session, session.now))}
            {!session.session.runningSince && ` · ${t('active.paused')}`}
          </p>
          <div className="dog-card__actions">
            <IonButton fill="clear" color="danger" onClick={onDiscard}>
              {t('home.discard')}
            </IonButton>
            <IonButton routerLink="/home/session">{t('home.continue')}</IonButton>
          </div>
        </div>
      ) : (
        !busy && (
          <div className="dog-card__actions">
            {activePlans.length === 0 ? (
              <IonButton fill="outline" routerLink={`/dogs/${dog.id}`}>
                {t('home.createPlan')}
              </IonButton>
            ) : (
              <IonButton className={showNotice ? undefined : 'button-tonal'} onClick={onTrain}>
                <IonIcon slot="start" icon={play} aria-hidden />
                {t('home.train')}
              </IonButton>
            )}
          </div>
        )
      )}
    </article>
  )
}
