import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton } from '@ionic/react'
import { barbell, homeOutline, pawOutline, settingsOutline, statsChart } from 'ionicons/icons'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { useBackupDue } from '../features/settings/useBackupDue'
import { TAB_BAR_ID } from './useAppToast'

/** Tab bar; the Settings tab shows a badge when a backup is due. */
function AppTabBar(props: ComponentProps<typeof IonTabBar>) {
  const { t } = useTranslation()
  const backupDue = useBackupDue()
  return (
    <IonTabBar slot="bottom" id={TAB_BAR_ID} {...props}>
      <IonTabButton tab="home" href="/home">
        <IonIcon aria-hidden icon={homeOutline} />
        <IonLabel>{t('tabs.home')}</IonLabel>
      </IonTabButton>
      <IonTabButton tab="dogs" href="/dogs">
        <IonIcon aria-hidden icon={pawOutline} />
        <IonLabel>{t('tabs.dogs')}</IonLabel>
      </IonTabButton>
      <IonTabButton tab="exercises" href="/exercises">
        <IonIcon aria-hidden icon={barbell} />
        <IonLabel>{t('tabs.exercises')}</IonLabel>
      </IonTabButton>
      <IonTabButton tab="progress" href="/progress">
        <IonIcon aria-hidden icon={statsChart} />
        <IonLabel>{t('tabs.progress')}</IonLabel>
      </IonTabButton>
      <IonTabButton tab="settings" href="/settings">
        <IonIcon aria-hidden icon={settingsOutline} />
        <IonLabel>{t('tabs.settings')}</IonLabel>
        {backupDue && (
          <IonBadge color="warning" aria-label={t('settings.backupDueBadge')}>
            !
          </IonBadge>
        )}
      </IonTabButton>
    </IonTabBar>
  )
}

// IonTabs only accepts a custom tab bar component that declares itself as one.
AppTabBar.isTabBar = true

export default AppTabBar
