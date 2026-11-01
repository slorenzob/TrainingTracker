import { IonButton, IonIcon, useIonAlert, useIonToast } from '@ionic/react'
import { cameraOutline } from 'ionicons/icons'
import { useRef, type ChangeEvent, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from './storage'

/** Files above this size ask for confirmation before being copied into the app. */
export const LARGE_FILE_BYTES = 100 * 1024 * 1024

interface MediaPickerProps {
  label: string
  accept?: string
  multiple?: boolean
  onPick: (files: File[]) => Promise<unknown>
  buttonProps?: ComponentProps<typeof IonButton>
}

/**
 * Button that opens the system picker (gallery, files or camera on mobile) and hands the
 * chosen files to `onPick`, after confirming any unusually large ones.
 */
export default function MediaPicker({
  label,
  accept = 'image/*,video/*',
  multiple = true,
  onPick,
  buttonProps,
}: MediaPickerProps) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [presentAlert] = useIonAlert()
  const [presentToast] = useIonToast()

  const confirmLarge = (file: File) =>
    new Promise<boolean>((resolve) => {
      void presentAlert({
        header: t('media.largeTitle'),
        message: t('media.largeMessage', { name: file.name, size: formatBytes(file.size) }),
        buttons: [
          { text: t('common.cancel'), role: 'cancel', handler: () => resolve(false) },
          { text: t('common.add'), handler: () => resolve(true) },
        ],
        onDidDismiss: () => resolve(false),
      })
    })

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    const accepted: File[] = []
    for (const file of picked) {
      if (file.size <= LARGE_FILE_BYTES || (await confirmLarge(file))) accepted.push(file)
    }
    if (accepted.length === 0) return
    try {
      await onPick(accepted)
    } catch {
      void presentToast({ message: t('media.readError'), duration: 3000, color: 'danger' })
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        data-testid="media-picker-input"
        onChange={(e) => void handleChange(e)}
      />
      <IonButton fill="outline" {...buttonProps} onClick={() => input.current?.click()}>
        <IonIcon slot="start" icon={cameraOutline} />
        {label}
      </IonButton>
    </>
  )
}
