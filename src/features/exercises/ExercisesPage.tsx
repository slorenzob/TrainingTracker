import { useTranslation } from 'react-i18next'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'

export default function ExercisesPage() {
  const { t } = useTranslation()
  return (
    <PageLayout title={t('tabs.exercises')}>
      <EmptyState message={t('exercises.empty')} />
    </PageLayout>
  )
}
