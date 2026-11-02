import { useTranslation } from 'react-i18next'
import PageLayout from '../../components/PageLayout'

/** Main screen, shown when the app starts. Intentionally empty for now. */
export default function HomePage() {
  const { t } = useTranslation()
  return <PageLayout title={t('tabs.home')}>{null}</PageLayout>
}
