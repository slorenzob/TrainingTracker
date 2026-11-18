import { IonButton, useIonAlert, useIonRouter } from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { useNow } from '../../components/useNow'
import { discardActiveSession, startActiveSession } from '../../db/activeSession'
import { todayIso } from '../../db/utils'
import ActivityCalendar from './ActivityCalendar'
import DogCard from './DogCard'
import { useDismissedReminders } from './dismissedReminders'
import { type DogCardData, loadHome } from './homeData'
import './home.css'

/** Main screen, shown when the app starts: a card per dog to train it, and recent activity. */
export default function HomePage() {
  const { t } = useTranslation()
  const router = useIonRouter()
  const [presentAlert] = useIonAlert()
  const data = useLiveQuery(() => loadHome())
  const active = data?.active
  const now = useNow(Boolean(active?.session.runningSince))
  const notices = useDismissedReminders(data?.today ?? todayIso())
  const [starting, setStarting] = useState(false)

  const train = async ({ dog, quickStartPlanId }: DogCardData) => {
    // Several plans (or an empty one) need the plan step of the wizard.
    if (!quickStartPlanId) {
      router.push(`/home/start?dog=${dog.id}`)
      return
    }
    if (starting) return
    setStarting(true)
    try {
      await startActiveSession(dog.id, quickStartPlanId)
      router.push('/home/session')
    } finally {
      setStarting(false)
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
          handler: () => void discardActiveSession(),
        },
      ],
    })

  return (
    <PageLayout title={t('tabs.home')}>
      {data?.cards.length === 0 && (
        <>
          <EmptyState message={t('home.noDogs')} />
          <div className="home-empty-action">
            <IonButton routerLink="/dogs">{t('start.goToDogs')}</IonButton>
          </div>
        </>
      )}
      {data && data.cards.length > 0 && (
        <>
          <div className="home-dogs">
            {data.cards.map((card) => (
              <DogCard
                key={card.dog.id}
                card={card}
                today={data.today}
                session={active?.session.dogId === card.dog.id ? { ...active, now } : undefined}
                busy={Boolean(active)}
                noticeHidden={notices.isDismissed(card.dog.id)}
                onHideNotice={() => notices.dismiss(card.dog.id)}
                onTrain={() => void train(card)}
                onDiscard={() => void confirmDiscard()}
              />
            ))}
          </div>
          <ActivityCalendar dogs={data.cards.map((c) => c.dog)} today={data.today} />
        </>
      )}
    </PageLayout>
  )
}
