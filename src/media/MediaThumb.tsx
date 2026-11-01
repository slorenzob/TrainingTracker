import { IonIcon, IonSpinner } from '@ionic/react'
import { alertCircleOutline, playCircle } from 'ionicons/icons'
import { useTranslation } from 'react-i18next'
import type { MediaRef } from '../db/types'
import { isVideo, useMediaUrl } from './useMediaUrl'
import './media.css'

interface MediaThumbProps {
  media: MediaRef
  className?: string
}

/** Square preview of an image or video (first frame with a play badge). */
export default function MediaThumb({ media, className = '' }: MediaThumbProps) {
  const { t } = useTranslation()
  const state = useMediaUrl(media)

  return (
    <div className={`media-thumb ${className}`}>
      {state.status === 'loading' && <IonSpinner name="dots" />}
      {state.status === 'missing' && (
        <IonIcon icon={alertCircleOutline} color="medium" aria-label={t('media.missing')} />
      )}
      {state.status === 'ready' &&
        (isVideo(media) ? (
          <>
            <video src={`${state.url}#t=0.1`} preload="metadata" muted playsInline />
            <IonIcon
              className="media-thumb__badge"
              icon={playCircle}
              aria-label={t('media.video')}
            />
          </>
        ) : (
          <img src={state.url} alt={media.originalName} />
        ))}
    </div>
  )
}
