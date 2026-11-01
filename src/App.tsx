import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { barbell, pawOutline, settingsOutline, statsChart } from 'ionicons/icons'
import { Redirect, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import DogDetailPage from './features/dogs/DogDetailPage'
import DogsPage from './features/dogs/DogsPage'
import ExerciseDetailPage from './features/exercises/ExerciseDetailPage'
import ExerciseFormPage from './features/exercises/ExerciseFormPage'
import ExercisesPage from './features/exercises/ExercisesPage'
import ProgressPage from './features/stats/ProgressPage'
import SettingsPage from './features/settings/SettingsPage'

import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'
import '@ionic/react/css/palettes/dark.system.css'
import './theme/variables.css'

setupIonicReact()

/** Route param pattern for record ids (UUIDs), so `/exercises/new` never matches `:exerciseId`. */
const ID = '[0-9a-f-]{36}'

export default function App() {
  const { t } = useTranslation()

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/dogs" component={DogsPage} />
            <Route exact path={`/dogs/:dogId(${ID})`} component={DogDetailPage} />
            <Route exact path="/exercises" component={ExercisesPage} />
            <Route exact path="/exercises/new" component={ExerciseFormPage} />
            <Route exact path={`/exercises/:exerciseId(${ID})`} component={ExerciseDetailPage} />
            <Route exact path={`/exercises/:exerciseId(${ID})/edit`} component={ExerciseFormPage} />
            <Route exact path="/progress" component={ProgressPage} />
            <Route exact path="/settings" component={SettingsPage} />
            <Route exact path="/">
              <Redirect to="/dogs" />
            </Route>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
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
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  )
}
