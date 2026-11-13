import { IonApp, IonRouterOutlet, IonTabs, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Redirect, Route } from 'react-router-dom'
import AppTabBar from './components/AppTabBar'

import DogDetailPage from './features/dogs/DogDetailPage'
import ActiveSessionPage from './features/home/ActiveSessionPage'
import HomePage from './features/home/HomePage'
import StartSessionPage from './features/home/StartSessionPage'
import DogsPage from './features/dogs/DogsPage'
import ExerciseDetailPage from './features/exercises/ExerciseDetailPage'
import ExerciseFormPage from './features/exercises/ExerciseFormPage'
import ExercisesPage from './features/exercises/ExercisesPage'
import PlanDetailPage from './features/plans/PlanDetailPage'
import SessionDetailPage from './features/sessions/SessionDetailPage'
import SessionFormPage from './features/sessions/SessionFormPage'
import ExerciseProgressPage from './features/stats/ExerciseProgressPage'
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
import '@fontsource-variable/atkinson-hyperlegible-next'
import './theme/variables.css'
import './theme/viewport.css'

setupIonicReact()

/** Route param pattern for record ids (UUIDs), so `/exercises/new` never matches `:exerciseId`. */
const ID = '[0-9a-f-]{36}'
const PLAN = `/dogs/:dogId(${ID})/plans/:planId(${ID})`

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home" component={HomePage} />
            <Route exact path="/home/start" component={StartSessionPage} />
            <Route exact path="/home/session" component={ActiveSessionPage} />
            <Route exact path="/dogs" component={DogsPage} />
            <Route exact path={`/dogs/:dogId(${ID})`} component={DogDetailPage} />
            <Route
              exact
              path={`/dogs/:dogId(${ID})/plans/:planId(${ID})`}
              component={PlanDetailPage}
            />
            <Route
              exact
              path={`/dogs/:dogId(${ID})/plans/:planId(${ID})/exercises/:exerciseId(${ID})`}
              component={ExerciseDetailPage}
            />
            <Route exact path={`${PLAN}/sessions/new`} component={SessionFormPage} />
            <Route
              exact
              path={`${PLAN}/sessions/:sessionId(${ID})`}
              component={SessionDetailPage}
            />
            <Route
              exact
              path={`${PLAN}/sessions/:sessionId(${ID})/edit`}
              component={SessionFormPage}
            />
            <Route exact path="/exercises" component={ExercisesPage} />
            <Route exact path="/exercises/new" component={ExerciseFormPage} />
            <Route exact path={`/exercises/:exerciseId(${ID})`} component={ExerciseDetailPage} />
            <Route exact path={`/exercises/:exerciseId(${ID})/edit`} component={ExerciseFormPage} />
            <Route exact path="/progress" component={ProgressPage} />
            <Route
              exact
              path={`/progress/dogs/:dogId(${ID})/exercises/:exerciseId(${ID})`}
              component={ExerciseProgressPage}
            />
            <Route exact path="/settings" component={SettingsPage} />
            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </IonRouterOutlet>
          <AppTabBar />
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  )
}
