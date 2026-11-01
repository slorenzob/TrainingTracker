import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonToggle,
  useIonAlert,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { add, alarmOutline } from 'ionicons/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { saveFile } from '../../components/saveFile'
import { useAppToast } from '../../components/useAppToast'
import { listDogs } from '../../db/dogs'
import { deleteReminder, listReminders, setReminderEnabled } from '../../db/reminders'
import type { Reminder } from '../../db/types'
import { buildIcs } from './reminderLogic'
import ReminderFormModal from './ReminderFormModal'
import { useWeekdayLabels } from './useWeekdayLabels'

type Editing = { reminder?: Reminder } | null

/** Reminders list for the Settings page. */
export default function RemindersSection() {
  const { t } = useTranslation()
  const labels = useWeekdayLabels()
  const presentToast = useAppToast()
  const [presentAlert] = useIonAlert()
  const [editing, setEditing] = useState<Editing>(null)
  const reminders = useLiveQuery(listReminders)
  const dogs = useLiveQuery(listDogs)
  const dogName = (id?: string) =>
    id ? dogs?.find((d) => d.id === id)?.name : t('reminders.allDogs')

  const exportToCalendar = async (reminder: Reminder) => {
    const name = reminder.dogId ? dogName(reminder.dogId) : undefined
    const summary = name
      ? t('reminders.calendarSummary', { dog: name })
      : t('reminders.calendarSummaryAll')
    const ics = buildIcs(reminder, summary, t('reminders.calendarDescription'), new Date())
    const blob = new Blob([ics], { type: 'text/calendar' })
    const outcome = await saveFile(blob, `entrenamiento-${reminder.time.replace(':', '')}.ics`)
    if (outcome !== 'cancelled') void presentToast({ message: t('reminders.calendarDone') })
  }

  const confirmDelete = (reminder: Reminder) =>
    presentAlert({
      header: t('reminders.deleteTitle'),
      message: t('reminders.deleteCalendarNote'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        {
          text: t('common.delete'),
          role: 'destructive',
          handler: () => void deleteReminder(reminder.id),
        },
      ],
    })

  return (
    <>
      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('reminders.title')}</IonLabel>
        </IonListHeader>
        <IonItem lines="none">
          <IonNote className="ion-text-wrap">{t('reminders.help')}</IonNote>
        </IonItem>
        {reminders?.map((reminder) => (
          <IonItemSliding key={reminder.id}>
            <IonItem button detail={false} onClick={() => setEditing({ reminder })}>
              <IonIcon slot="start" icon={alarmOutline} aria-hidden />
              <IonLabel>
                <h2>
                  {reminder.time} · {labels.days(reminder.weekdays)}
                </h2>
                <p>{dogName(reminder.dogId)}</p>
              </IonLabel>
              <IonToggle
                slot="end"
                aria-label={t('reminders.enabled')}
                checked={reminder.enabled}
                onClick={(e) => e.stopPropagation()}
                onIonChange={(e) => void setReminderEnabled(reminder.id, e.detail.checked)}
              />
            </IonItem>
            <IonItemOptions side="end">
              <IonItemOption onClick={() => void exportToCalendar(reminder)}>
                {t('reminders.toCalendar')}
              </IonItemOption>
              <IonItemOption color="danger" onClick={() => void confirmDelete(reminder)}>
                {t('common.delete')}
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        ))}
        {reminders?.length === 0 && (
          <IonItem lines="none">
            <IonLabel color="medium">{t('reminders.empty')}</IonLabel>
          </IonItem>
        )}
        <IonItem button detail={false} onClick={() => setEditing({})}>
          <IonIcon slot="start" icon={add} color="primary" />
          <IonLabel color="primary">{t('reminders.add')}</IonLabel>
        </IonItem>
      </IonList>
      <ReminderFormModal
        isOpen={editing !== null}
        reminder={editing?.reminder}
        onDismiss={() => setEditing(null)}
      />
    </>
  )
}
