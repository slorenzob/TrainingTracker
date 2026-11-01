import {
  IonButton,
  IonIcon,
  IonList,
  IonListHeader,
  IonLabel,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createOutline, trashOutline } from 'ionicons/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { deleteDog, getDog } from '../../db/dogs'
import { formatDate } from '../../i18n/format'
import DogAvatar from './DogAvatar'
import DogFormModal from './DogFormModal'

export default function DogDetailPage() {
  const { t } = useTranslation()
  const { dogId } = useParams<{ dogId: string }>()
  const router = useIonRouter()
  const [presentAlert] = useIonAlert()
  const [editing, setEditing] = useState(false)
  // undefined while loading, null when the dog does not exist.
  const dog = useLiveQuery(async () => (await getDog(dogId)) ?? null, [dogId])

  if (dog === undefined)
    return (
      <PageLayout title="" backHref="/dogs">
        {null}
      </PageLayout>
    )
  if (dog === null) {
    return (
      <PageLayout title={t('tabs.dogs')} backHref="/dogs">
        <EmptyState message={t('common.notFound')} />
      </PageLayout>
    )
  }

  const confirmDelete = () =>
    presentAlert({
      header: t('dogs.deleteTitle', { name: dog.name }),
      message: t('dogs.deleteMessage'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        {
          text: t('common.delete'),
          role: 'destructive',
          handler: () => {
            void deleteDog(dog.id).then(() => router.push('/dogs', 'back', 'pop'))
          },
        },
      ],
    })

  return (
    <PageLayout
      title={dog.name}
      backHref="/dogs"
      actions={
        <>
          <IonButton aria-label={t('common.edit')} onClick={() => setEditing(true)}>
            <IonIcon slot="icon-only" icon={createOutline} />
          </IonButton>
          <IonButton
            aria-label={t('common.delete')}
            color="danger"
            onClick={() => void confirmDelete()}
          >
            <IonIcon slot="icon-only" icon={trashOutline} />
          </IonButton>
        </>
      }
    >
      <div className="dog-header">
        <DogAvatar dog={dog} size={96} />
        <h1>{dog.name}</h1>
        {dog.breed && <p className="ion-no-margin">{dog.breed}</p>}
        {dog.birthDate && (
          <p className="ion-no-margin">{t('dogs.born', { date: formatDate(dog.birthDate) })}</p>
        )}
      </div>
      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('dogs.plans')}</IonLabel>
        </IonListHeader>
      </IonList>
      <EmptyState message={t('dogs.plansSoon', { name: dog.name })} />
      <DogFormModal isOpen={editing} dog={dog} onDismiss={() => setEditing(false)} />
    </PageLayout>
  )
}
