import { IonFab, IonFabButton, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { add } from 'ionicons/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { listDogs } from '../../db/dogs'
import DogAvatar from './DogAvatar'
import DogFormModal from './DogFormModal'

export default function DogsPage() {
  const { t } = useTranslation()
  const dogs = useLiveQuery(listDogs)
  const [creating, setCreating] = useState(false)

  return (
    <PageLayout
      title={t('tabs.dogs')}
      fixed={
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton aria-label={t('dogs.new')} onClick={() => setCreating(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      }
    >
      {dogs?.length === 0 && <EmptyState message={t('dogs.empty')} />}
      {dogs && dogs.length > 0 && (
        <IonList>
          {dogs.map((dog) => (
            <IonItem key={dog.id} routerLink={`/dogs/${dog.id}`} detail>
              <div slot="start">
                <DogAvatar dog={dog} />
              </div>
              <IonLabel>
                <h2>{dog.name}</h2>
                {dog.breed && <p>{dog.breed}</p>}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      )}
      <DogFormModal isOpen={creating} onDismiss={() => setCreating(false)} />
    </PageLayout>
  )
}
