import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPlan, updatePlan } from '../../db/plans'
import type { Plan } from '../../db/types'
import { todayIso } from '../../db/utils'

type PlanFormModalProps = {
  isOpen: boolean
  onDismiss: (saved?: Plan) => void
} & ({ plan: Plan; dogId?: never } | { plan?: never; dogId: string })

/** Name, start date and notes of a plan; exercises are managed on the plan page. */
export default function PlanFormModal({ isOpen, plan, dogId, onDismiss }: PlanFormModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')
  const [nameError, setNameError] = useState(false)
  const [saving, setSaving] = useState(false)

  const init = () => {
    setName(plan?.name ?? '')
    setStartDate(plan?.startDate ?? todayIso())
    setNotes(plan?.notes ?? '')
    setNameError(false)
  }

  const save = async () => {
    if (!name.trim()) {
      setNameError(true)
      return
    }
    setSaving(true)
    try {
      const input = { name, startDate: startDate || todayIso(), notes: notes.trim() || undefined }
      const saved = plan ? await updatePlan(plan.id, input) : await createPlan(dogId!, input)
      onDismiss(saved)
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
          <IonTitle>{plan ? t('plans.editTitle') : t('plans.new')}</IonTitle>
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
            <IonInput
              label={t('plans.name')}
              labelPlacement="stacked"
              value={name}
              required
              autocapitalize="sentences"
              className={nameError ? 'ion-invalid ion-touched' : undefined}
              errorText={t('plans.nameRequired')}
              onIonInput={(e) => {
                setName(e.detail.value ?? '')
                setNameError(false)
              }}
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
          <IonItem>
            <IonTextarea
              label={`${t('plans.notes')} (${t('common.optional')})`}
              labelPlacement="stacked"
              value={notes}
              autoGrow
              rows={3}
              autocapitalize="sentences"
              onIonInput={(e) => setNotes(e.detail.value ?? '')}
            />
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  )
}
