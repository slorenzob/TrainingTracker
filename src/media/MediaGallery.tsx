import { IonButton, IonIcon } from '@ionic/react'
import { closeCircle } from 'ionicons/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MediaRef } from '../db/types'
import MediaThumb from './MediaThumb'
import MediaViewer from './MediaViewer'
import './media.css'

interface MediaGalleryProps {
  items: readonly MediaRef[]
  /** When given, each item shows a remove button. */
  onRemove?: (media: MediaRef) => void
}

/** Grid of thumbnails; tapping one opens it full screen. */
export default function MediaGallery({ items, onRemove }: MediaGalleryProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<MediaRef | null>(null)

  return (
    <>
      <div className="media-grid">
        {items.map((media) => (
          <div key={media.id} className="media-grid__item">
            <button
              type="button"
              className="media-grid__button"
              onClick={() => setOpen(media)}
              aria-label={media.originalName}
            >
              <MediaThumb media={media} />
            </button>
            {onRemove && (
              <IonButton
                className="media-grid__remove"
                size="small"
                color="dark"
                fill="clear"
                aria-label={`${t('common.remove')} ${media.originalName}`}
                onClick={() => onRemove(media)}
              >
                <IonIcon slot="icon-only" icon={closeCircle} />
              </IonButton>
            )}
          </div>
        ))}
      </div>
      <MediaViewer media={open} onClose={() => setOpen(null)} />
    </>
  )
}
