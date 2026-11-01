import { IonIcon } from '@ionic/react'
import { paw } from 'ionicons/icons'
import type { Dog } from '../../db/types'
import MediaThumb from '../../media/MediaThumb'
import './dogs.css'

export default function DogAvatar({ dog, size = 40 }: { dog: Pick<Dog, 'photo'>; size?: number }) {
  return (
    <div className="dog-avatar" style={{ width: size, height: size }}>
      {dog.photo ? (
        <MediaThumb media={dog.photo} />
      ) : (
        <IonIcon icon={paw} style={{ fontSize: size / 2 }} aria-hidden />
      )}
    </div>
  )
}
