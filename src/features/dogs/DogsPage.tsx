import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'

export default function DogsPage() {
  const { t } = useTranslation()
  return (
    <PageLayout title={t('tabs.dogs')}>
      <EmptyState message={t('dogs.empty')} />
    </PageLayout>
  )
}
