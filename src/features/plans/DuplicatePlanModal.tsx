import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listDogs } from '../../db/dogs'
import { duplicatePlan } from '../../db/plans'
import type { Plan } from '../../db/types'
import { todayIso } from '../../db/utils'

interface DuplicatePlanModalProps {
  isOpen: boolean
  plan: Plan
  onDismiss: (copy?: Plan) => void
}

/** Copies the plan's exercises into a new plan for the same dog or another one. */
export default function DuplicatePlanModal({ isOpen, plan, onDismiss }: DuplicatePlanModalProps) {
  const { t } = useTranslation()
  const dogs = useLiveQuery(listDogs)
  const [dogId, setDogId] = useState(plan.dogId)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [saving, setSaving] = useState(false)

  const init = () => {
    setDogId(plan.dogId)
    setName(t('plans.duplicateName', { name: plan.name }))
    setStartDate(todayIso())
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      onDismiss(await duplicatePlan(plan.id, { dogId, name, startDate: startDate || todayIso() }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <IonModal isOpen={isOpen} onWillPresent={init} onDidDismiss={() => onDismiss()}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => onDismiss()}>{t('common.cancel')}</IonButton>
          </IonButtons>
          <IonTitle>{t('plans.duplicateTitle')}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={saving || !name.trim()} onClick={() => void save()}>
              {t('common.save')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem>
            <IonSelect
              label={t('plans.duplicateFor')}
              labelPlacement="stacked"
              value={dogId}
              interface="action-sheet"
              onIonChange={(e) => setDogId(e.detail.value as string)}
            >
              {dogs?.map((dog) => (
                <IonSelectOption key={dog.id} value={dog.id}>
                  {dog.name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonInput
              label={t('plans.name')}
              labelPlacement="stacked"
              value={name}
              onIonInput={(e) => setName(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label={t('plans.startDate')}
              labelPlacement="stacked"
              type="date"
              value={startDate}
              onIonInput={(e) => setStartDate(e.detail.value ?? '')}
            />
          </IonItem>
        </IonList>
        <IonNote className="ion-padding">{t('plans.duplicateHelp')}</IonNote>
      </IonContent>
    </IonModal>
  )
}
