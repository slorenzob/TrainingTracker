import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import { listExercises } from '../../db/exercises'
import { normalizeForSearch } from '../../i18n/format'

interface ExercisePickerModalProps {
  isOpen: boolean
  /** Exercises already in the plan, hidden from the list. */
  excludeIds: ReadonlySet<string>
  onDismiss: (selectedIds?: string[]) => void
}

/** Multi-select of library exercises, returned in the order they were ticked. */
export default function ExercisePickerModal({
  isOpen,
  excludeIds,
  onDismiss,
}: ExercisePickerModalProps) {
  const { t } = useTranslation()
  const exercises = useLiveQuery(listExercises)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const available = useMemo(() => {
    const q = normalizeForSearch(query.trim())
    return (exercises ?? []).filter(
      (e) => !excludeIds.has(e.id) && (!q || normalizeForSearch(e.title).includes(q)),
    )
  }, [exercises, excludeIds, query])

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => (checked ? [...current, id] : current.filter((s) => s !== id)))

  const reset = () => {
    setQuery('')
    setSelected([])
  }

  return (
    <IonModal isOpen={isOpen} onWillPresent={reset} onDidDismiss={() => onDismiss()}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => onDismiss()}>{t('common.cancel')}</IonButton>
          </IonButtons>
          <IonTitle>{t('plans.pickerTitle')}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={selected.length === 0} onClick={() => onDismiss(selected)}>
              {selected.length > 0
                ? t('plans.pickerAdd', { count: selected.length })
                : t('common.add')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            placeholder={t('exercises.search')}
            value={query}
            onIonInput={(e) => setQuery(e.detail.value ?? '')}
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {exercises && available.length === 0 && !query && (
          <EmptyState message={t('plans.pickerEmpty')} />
        )}
        {query && available.length === 0 && <EmptyState message={t('exercises.noResults')} />}
        <IonList>
          {available.map((exercise) => (
            <IonItem key={exercise.id}>
              <IonCheckbox
                justify="start"
                labelPlacement="end"
                checked={selected.includes(exercise.id)}
                onIonChange={(e) => toggle(exercise.id, e.detail.checked)}
              >
                {exercise.title}
              </IonCheckbox>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonModal>
  )
}
