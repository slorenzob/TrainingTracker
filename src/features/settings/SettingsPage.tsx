import { IonItem, IonLabel, IonList, IonListHeader, IonNote } from '@ionic/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageLayout from '../../components/PageLayout'
import { formatBytes, getStorageStatus, type StorageStatus } from '../../media/storage'

export default function SettingsPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<StorageStatus | null>(null)

  useEffect(() => {
    void getStorageStatus().then(setStatus)
  }, [])

  return (
    <PageLayout title={t('tabs.settings')}>
      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('settings.storage')}</IonLabel>
        </IonListHeader>
        {status && (
          <>
            <IonItem>
              <IonLabel>
                {t('settings.storageUsage', {
                  used: formatBytes(status.usage),
                  quota: formatBytes(status.quota),
                })}
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonNote color={status.persisted ? 'success' : 'warning'}>
                {status.persisted ? t('settings.persisted') : t('settings.notPersisted')}
              </IonNote>
            </IonItem>
          </>
        )}
      </IonList>
    </PageLayout>
  )
}
