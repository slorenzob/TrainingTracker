import { useIonToast, type ToastOptions } from '@ionic/react'
import { useCallback } from 'react'

export const TAB_BAR_ID = 'app-tab-bar'

/** Toast shown just above the tab bar instead of covering it. */
export function useAppToast() {
  const [present] = useIonToast()
  return useCallback(
    (options: ToastOptions) =>
      present({ duration: 2500, position: 'bottom', positionAnchor: TAB_BAR_ID, ...options }),
    [present],
  )
}
