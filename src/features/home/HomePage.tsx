import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  useIonAlert,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { play } from 'ionicons/icons'
import { useTranslation } from 'react-i18next'
import PageLayout from '../../components/PageLayout'
import { useNow } from '../../components/useNow'
import { discardActiveSession, elapsedMs, getActiveSession } from '../../db/activeSession'
import { db } from '../../db/schema'
import { formatTimer } from '../../i18n/format'
import './home.css'

async function loadActive() {
  const active = await getActiveSession()
  if (!active) return null
  const [dog, plan] = await Promise.all([db.dogs.get(active.dogId), db.plans.get(active.planId)])
  return { active, dogName: dog?.name ?? '', planName: plan?.name ?? '' }
}

/** Main screen, shown when the app starts: start a session or resume the one in progress. */
export default function HomePage() {
  const { t } = useTranslation()
  const [presentAlert] = useIonAlert()
  // undefined while loading, null when no session is in progress.
  const current = useLiveQuery(loadActive)
  const now = useNow(Boolean(current?.active.runningSince))

  const confirmDiscard = () =>
    presentAlert({
      header: t('active.discardTitle'),
      message: t('active.discardMessage'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        {
          text: t('home.discard'),
          role: 'destructive',
          handler: () => void discardActiveSession(),
        },
      ],
    })

  return (
    <PageLayout title={t('tabs.home')}>
      <div className="home-actions">
        {current === null && (
          <IonButton expand="block" size="large" routerLink="/home/start">
            <IonIcon slot="start" icon={play} aria-hidden />
            {t('home.startSession')}
          </IonButton>
        )}
        {current && (
          <IonCard className="home-active">
            <IonCardHeader>
              <IonCardSubtitle>{t('home.activeSession')}</IonCardSubtitle>
              <IonCardTitle>
                {t('home.activeWith', { dog: current.dogName, plan: current.planName })}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p className="home-active__timer" aria-label={t('active.timer')}>
                {formatTimer(elapsedMs(current.active, now))}
                {!current.active.runningSince && ` · ${t('active.paused')}`}
              </p>
              <IonButton expand="block" routerLink="/home/session">
                {t('home.continue')}
              </IonButton>
              <IonButton
                expand="block"
                fill="clear"
                color="danger"
                onClick={() => void confirmDiscard()}
              >
                {t('home.discard')}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}
      </div>
    </PageLayout>
  )
}
