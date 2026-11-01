import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listDogs } from '../../db/dogs'
import { createReminder, updateReminder } from '../../db/reminders'
import type { Reminder, Weekday } from '../../db/types'
import { WEEK } from './reminderLogic'
import { useWeekdayLabels } from './useWeekdayLabels'
import './reminders.css'

interface ReminderFormModalProps {
  isOpen: boolean
  /** Reminder to edit; omitted to create one. */
  reminder?: Reminder
  onDismiss: () => void
}

const ALL_DOGS = ''

export default function ReminderFormModal({ isOpen, reminder, onDismiss }: ReminderFormModalProps) {
  const { t } = useTranslation()
  const labels = useWeekdayLabels()
  const dogs = useLiveQuery(listDogs)
  const [dogId, setDogId] = useState(ALL_DOGS)
  const [weekdays, setWeekdays] = useState<Weekday[]>([])
  const [time, setTime] = useState('18:00')
  const [enabled, setEnabled] = useState(true)
  const [daysError, setDaysError] = useState(false)
  const [saving, setSaving] = useState(false)

  const init = () => {
    setDogId(reminder?.dogId ?? ALL_DOGS)
    setWeekdays(reminder?.weekdays ?? [])
    setTime(reminder?.time ?? '18:00')
    setEnabled(reminder?.enabled ?? true)
    setDaysError(false)
  }

  const toggleDay = (day: Weekday) => {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    )
    setDaysError(false)
  }

  const save = async () => {
    if (weekdays.length === 0) {
      setDaysError(true)
      return
    }
    setSaving(true)
    try {
      const input = { dogId: dogId || undefined, weekdays, time, enabled }
      if (reminder) await updateReminder(reminder.id, input)
      else await createReminder(input)
      onDismiss()
    } finally {
      setSaving(false)
    }
  }

  return (
    <IonModal isOpen={isOpen} onWillPresent={init} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>{t('common.cancel')}</IonButton>
          </IonButtons>
          <IonTitle>{reminder ? t('reminders.editTitle') : t('reminders.new')}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={saving} onClick={() => void save()}>
              {t('common.save')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem>
            <IonSelect
              label={t('reminders.dog')}
              value={dogId}
              interface="action-sheet"
              onIonChange={(e) => setDogId(e.detail.value as string)}
            >
              <IonSelectOption value={ALL_DOGS}>{t('reminders.allDogs')}</IonSelectOption>
              {dogs?.map((dog) => (
                <IonSelectOption key={dog.id} value={dog.id}>
                  {dog.name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonInput
              label={t('reminders.time')}
              type="time"
              value={time}
              onIonInput={(e) => setTime(e.detail.value || time)}
            />
          </IonItem>
          <IonItem lines="none">
            <IonLabel>{t('reminders.days')}</IonLabel>
          </IonItem>
          <IonItem>
            <div className="weekday-picker" role="group" aria-label={t('reminders.days')}>
              {WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  className="weekday-picker__day"
                  aria-pressed={weekdays.includes(day)}
                  aria-label={labels.long(day)}
                  onClick={() => toggleDay(day)}
                >
                  {labels.short(day)}
                </button>
              ))}
            </div>
          </IonItem>
          <IonItem>
            <IonToggle checked={enabled} onIonChange={(e) => setEnabled(e.detail.checked)}>
              {t('reminders.enabled')}
            </IonToggle>
          </IonItem>
        </IonList>
        {daysError && (
          <IonNote color="danger" className="ion-padding" role="alert">
            {t('reminders.daysRequired')}
          </IonNote>
        )}
      </IonContent>
    </IonModal>
  )
}
