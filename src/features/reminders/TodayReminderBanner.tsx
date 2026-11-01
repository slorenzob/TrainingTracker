import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { alarmOutline } from 'ionicons/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listDogs } from '../../db/dogs'
import { listReminders } from '../../db/reminders'
import { db } from '../../db/schema'
import { todayIso } from '../../db/utils'
import { dueToday } from './reminderLogic'
import './reminders.css'

const DISMISS_KEY = 'reminders.dismissedOn'

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

async function load() {
  const today = todayIso()
  const [reminders, dogs, sessions] = await Promise.all([
    listReminders(),
    listDogs(),
    db.sessions.where('date').equals(today).toArray(),
  ])
  const due = dueToday(reminders, dogs, new Set(sessions.map((s) => s.dogId)), new Date())
  if (!due) return null
  // With a single dog and a single active plan, offer a shortcut to record the session.
  let sessionHref: string | undefined
  if (due.dogs.length === 1) {
    const dog = due.dogs[0]
    const active = (await db.plans.where('dogId').equals(dog.id).toArray()).filter(
      (p) => p.status === 'active',
    )
    if (active.length === 1) sessionHref = `/dogs/${dog.id}/plans/${active[0].id}/sessions/new`
  }
  return { ...due, today, sessionHref }
}

/** "Hoy toca entrenar con Luna": shown on reminder days until a session is recorded. */
export default function TodayReminderBanner() {
  const { t } = useTranslation()
  const [dismissedOn, setDismissedOn] = useState(readDismissed)
  const due = useLiveQuery(load)
  if (!due || dismissedOn === due.today) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, due.today)
    } catch {
      // Only hidden for this visit then.
    }
    setDismissedOn(due.today)
  }

  const names = new Intl.ListFormat('es', { type: 'conjunction' }).format(
    due.dogs.map((d) => d.name),
  )

  return (
    <IonCard className="reminder-banner" role="status">
      <IonCardHeader>
        <IonCardTitle>
          <IonIcon icon={alarmOutline} aria-hidden /> {t('reminders.dueToday', { dogs: names })}
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <p>{t('reminders.dueTodayAt', { time: due.time })}</p>
        {due.sessionHref && (
          <IonButton size="small" routerLink={due.sessionHref}>
            {t('reminders.recordSession')}
          </IonButton>
        )}
        <IonButton size="small" fill="clear" onClick={dismiss}>
          {t('reminders.dismiss')}
        </IonButton>
      </IonCardContent>
    </IonCard>
  )
}
