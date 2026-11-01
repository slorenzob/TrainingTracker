import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSpinner,
  useIonAlert,
} from '@ionic/react'
import { cloudDownloadOutline, cloudUploadOutline, shieldCheckmarkOutline } from 'ionicons/icons'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
// The backup code (zip + validation) is loaded on demand from the buttons below.
import type { BackupError, ParsedBackup } from '../../backup/import'
import { BACKUP_REMINDER_DAYS, markBackupDone, useLastBackupAt } from '../../backup/lastBackup'
import PageLayout from '../../components/PageLayout'
import { useAppToast } from '../../components/useAppToast'
import { formatDate } from '../../i18n/format'
import {
  formatBytes,
  getStorageStatus,
  requestPersistence,
  type StorageStatus,
} from '../../media/storage'
import { useBackupDue } from './useBackupDue'
import './settings.css'

type Busy = 'exporting' | 'importing' | 'restoring' | null

export default function SettingsPage() {
  const { t } = useTranslation()
  const presentToast = useAppToast()
  const [presentAlert] = useIonAlert()
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const lastBackupAt = useLastBackupAt()
  const backupDue = useBackupDue()

  const refreshStatus = useCallback(() => void getStorageStatus().then(setStatus), [])
  useEffect(refreshStatus, [refreshStatus])

  const showError = (e: unknown) => {
    // Checked by name: the BackupError class lives in the lazily loaded module.
    const isBackupError = e instanceof Error && e.name === 'BackupError'
    const code = isBackupError ? (e as BackupError).code : 'unknown'
    if (!isBackupError) console.error(e)
    void presentToast({
      message: t(`settings.errors.${code}`),
      color: 'danger',
      duration: 4000,
    })
  }

  const exportData = async () => {
    setBusy('exporting')
    try {
      const { exportBackup, saveBackupFile } = await import('../../backup/export')
      const result = await exportBackup()
      const outcome = await saveBackupFile(result)
      if (outcome === 'cancelled') return
      markBackupDone()
      const message =
        result.missingMedia > 0
          ? `${t('settings.exported')} ${t('settings.missingMedia', { count: result.missingMedia })}`
          : t('settings.exported')
      void presentToast({ message, duration: 3000 })
    } catch (e) {
      showError(e)
    } finally {
      setBusy(null)
      refreshStatus()
    }
  }

  const restore = async (parsed: ParsedBackup) => {
    setBusy('restoring')
    try {
      const { restoreBackup } = await import('../../backup/import')
      await restoreBackup(parsed)
      void presentToast({ message: t('settings.imported') })
    } catch (e) {
      showError(e)
    } finally {
      setBusy(null)
      refreshStatus()
    }
  }

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy('importing')
    let parsed: ParsedBackup
    try {
      const { readBackup } = await import('../../backup/import')
      parsed = await readBackup(file)
    } catch (e) {
      showError(e)
      return
    } finally {
      setBusy(null)
    }
    void presentAlert({
      header: t('settings.importTitle'),
      message: t('settings.importMessage', {
        date: formatDate(parsed.backup.exportedAt.slice(0, 10)),
        summary: new Intl.ListFormat('es', { type: 'conjunction' }).format(
          (['dogs', 'exercises', 'plans', 'sessions', 'media'] as const).map((key) =>
            t(`settings.counts.${key}`, { count: parsed.counts[key] }),
          ),
        ),
      }),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        {
          text: t('settings.importConfirm'),
          role: 'destructive',
          handler: () => void restore(parsed),
        },
      ],
    })
  }

  const persist = async () => {
    const granted = await requestPersistence()
    if (!granted) void presentToast({ message: t('settings.persistDenied'), duration: 4000 })
    refreshStatus()
  }

  return (
    <PageLayout title={t('tabs.settings')}>
      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('settings.backup')}</IonLabel>
        </IonListHeader>
        <IonItem lines="none">
          <IonLabel className="ion-text-wrap">
            <p>{t('settings.backupHelp')}</p>
            <p className="settings-backup-status">
              {lastBackupAt
                ? t('settings.lastBackup', {
                    date: formatDate(lastBackupAt.toISOString().slice(0, 10)),
                  })
                : t('settings.neverBackedUp')}
            </p>
            {backupDue && lastBackupAt && (
              <IonNote color="warning">
                {t('settings.backupDue', { days: BACKUP_REMINDER_DAYS })}
              </IonNote>
            )}
          </IonLabel>
        </IonItem>
        <div className="settings-actions">
          <IonButton expand="block" disabled={busy !== null} onClick={() => void exportData()}>
            {busy === 'exporting' ? (
              <IonSpinner slot="start" name="dots" />
            ) : (
              <IonIcon slot="start" icon={cloudDownloadOutline} />
            )}
            {busy === 'exporting' ? t('settings.exporting') : t('settings.export')}
          </IonButton>
          <IonButton
            expand="block"
            fill="outline"
            disabled={busy !== null}
            onClick={() => fileInput.current?.click()}
          >
            {busy === 'importing' || busy === 'restoring' ? (
              <IonSpinner slot="start" name="dots" />
            ) : (
              <IonIcon slot="start" icon={cloudUploadOutline} />
            )}
            {busy === 'importing'
              ? t('settings.importing')
              : busy === 'restoring'
                ? t('settings.restoring')
                : t('settings.import')}
          </IonButton>
          <input
            ref={fileInput}
            type="file"
            accept=".zip,application/zip"
            hidden
            data-testid="backup-input"
            onChange={(e) => void importData(e)}
          />
        </div>
      </IonList>

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
            <IonItem lines="none">
              <IonLabel className="ion-text-wrap">
                <IonNote color={status.persisted ? 'success' : 'warning'}>
                  {status.persisted ? t('settings.persisted') : t('settings.notPersisted')}
                </IonNote>
              </IonLabel>
            </IonItem>
            {!status.persisted && (
              <div className="settings-actions">
                <IonButton expand="block" fill="outline" onClick={() => void persist()}>
                  <IonIcon slot="start" icon={shieldCheckmarkOutline} />
                  {t('settings.persist')}
                </IonButton>
              </div>
            )}
          </>
        )}
      </IonList>
    </PageLayout>
  )
}
