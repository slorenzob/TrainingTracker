import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import type { ReactNode } from 'react'

interface PageLayoutProps {
  title: string
  children: ReactNode
  /** Where the back button goes when there is no history; omit on tab root pages. */
  backHref?: string
  /** Toolbar buttons shown at the end of the header. */
  actions?: ReactNode
  /** Content outside the scroll area, e.g. a floating action button. */
  fixed?: ReactNode
}

export default function PageLayout({ title, children, backHref, actions, fixed }: PageLayoutProps) {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {backHref && (
            <IonButtons slot="start">
              <IonBackButton defaultHref={backHref} />
            </IonButtons>
          )}
          <IonTitle>{title}</IonTitle>
          {actions && <IonButtons slot="end">{actions}</IonButtons>}
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {!backHref && (
          <IonHeader collapse="condense">
            <IonToolbar>
              <IonTitle size="large">{title}</IonTitle>
            </IonToolbar>
          </IonHeader>
        )}
        {children}
        {fixed}
      </IonContent>
    </IonPage>
  )
}
