import { IonText } from '@ionic/react'

export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="ion-padding ion-text-center">
      <IonText color="medium">
        <p>{message}</p>
      </IonText>
    </div>
  )
}
