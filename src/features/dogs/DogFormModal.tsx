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
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createDog, updateDog } from '../../db/dogs'
import type { Dog } from '../../db/types'
import MediaPicker from '../../media/MediaPicker'
import { useMediaDraft } from '../../media/useMediaDraft'
import DogAvatar from './DogAvatar'

interface DogFormModalProps {
  isOpen: boolean
  /** Dog to edit; omitted to create a new one. */
  dog?: Dog
  onDismiss: (saved?: Dog) => void
}

export default function DogFormModal({ isOpen, dog, onDismiss }: DogFormModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const photo = useMediaDraft()
  const current = photo.media[0]

  const init = () => {
    setName(dog?.name ?? '')
    setBreed(dog?.breed ?? '')
    setBirthDate(dog?.birthDate ?? '')
    setError(undefined)
    photo.reset(dog?.photo ? [dog.photo] : [])
  }

  const replacePhoto = async (files: File[]) => {
    if (current) await photo.remove(current)
    await photo.add(files.slice(0, 1))
  }

  const cancel = async () => {
    await photo.discard()
    onDismiss()
  }

  const save = async () => {
    if (!name.trim()) {
      setError(t('dogs.nameRequired'))
      return
    }
    setSaving(true)
    try {
      const input = {
        name,
        breed: breed.trim() || undefined,
        birthDate: birthDate || undefined,
        photo: current,
      }
      const saved = dog ? await updateDog(dog.id, input) : await createDog(input)
      photo.commit()
      onDismiss(saved)
    } finally {
      setSaving(false)
    }
  }

  return (
    <IonModal
      isOpen={isOpen}
      onWillPresent={init}
      // Swipe-down / backdrop dismissal counts as cancel; a save has already committed.
      onDidDismiss={() => void cancel()}
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => void cancel()}>{t('common.cancel')}</IonButton>
          </IonButtons>
          <IonTitle>{dog ? t('dogs.editTitle') : t('dogs.new')}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={saving} onClick={() => void save()}>
              {t('common.save')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="dog-photo-field">
          <DogAvatar dog={{ photo: current }} size={72} />
          <div>
            <MediaPicker
              label={current ? t('media.changePhoto') : t('media.addPhoto')}
              accept="image/*"
              multiple={false}
              onPick={replacePhoto}
              buttonProps={{ size: 'small' }}
            />
            {current && (
              <IonButton
                size="small"
                fill="clear"
                color="danger"
                onClick={() => void photo.remove(current)}
              >
                {t('media.removePhoto')}
              </IonButton>
            )}
          </div>
        </div>
        <IonList inset>
          <IonItem>
            <IonInput
              label={t('dogs.name')}
              labelPlacement="stacked"
              value={name}
              required
              autocapitalize="words"
              onIonInput={(e) => {
                setName(e.detail.value ?? '')
                setError(undefined)
              }}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label={`${t('dogs.breed')} (${t('common.optional')})`}
              labelPlacement="stacked"
              value={breed}
              autocapitalize="words"
              onIonInput={(e) => setBreed(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonInput
              label={`${t('dogs.birthDate')} (${t('common.optional')})`}
              labelPlacement="stacked"
              type="date"
              value={birthDate}
              onIonInput={(e) => setBirthDate(e.detail.value ?? '')}
            />
          </IonItem>
        </IonList>
        {error && (
          <IonNote color="danger" className="ion-padding">
            {error}
          </IonNote>
        )}
      </IonContent>
    </IonModal>
  )
}
