import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react'
import type { ReactNode } from 'react'

interface PageLayoutProps {
  title: string
  children: ReactNode
}

export default function PageLayout({ title, children }: PageLayoutProps) {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        {children}
      </IonContent>
    </IonPage>
  )
}
