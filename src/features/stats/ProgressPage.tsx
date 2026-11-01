import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'

export default function ProgressPage() {
  const { t } = useTranslation()
  return (
    <PageLayout title={t('tabs.progress')}>
      <EmptyState message={t('progress.empty')} />
    </PageLayout>
  )
}
