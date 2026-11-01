import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useTranslation } from 'react-i18next'
import type { MediaRef } from '../db/types'
import { isVideo, useMediaUrl } from './useMediaUrl'
import './media.css'

interface MediaViewerProps {
  media: MediaRef | null
  onClose: () => void
}

function MediaContent({ media }: { media: MediaRef }) {
  const { t } = useTranslation()
  const state = useMediaUrl(media)
  if (state.status === 'loading') return <IonSpinner />
  if (state.status === 'missing') return <p>{t('media.missing')}</p>
  return isVideo(media) ? (
    <video src={state.url} controls autoPlay playsInline />
  ) : (
    <img src={state.url} alt={media.originalName} />
  )
}

/** Full-screen view of one image or video. */
export default function MediaViewer({ media, onClose }: MediaViewerProps) {
  const { t } = useTranslation()
  return (
    <IonModal isOpen={media !== null} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{media?.originalName}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t('common.close')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="media-viewer">{media && <MediaContent media={media} />}</div>
      </IonContent>
    </IonModal>
  )
}
