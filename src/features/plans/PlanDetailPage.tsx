import {
  IonButton,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonReorder,
  IonReorderGroup,
  IonText,
  IonThumbnail,
  useIonActionSheet,
  useIonAlert,
  useIonRouter,
  type ItemReorderEventDetail,
} from '@ionic/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { add, barbellOutline, ellipsisVertical, swapVertical } from 'ionicons/icons'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppToast } from '../../components/useAppToast'
import { useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import {
  addExerciseToPlan,
  addExercisesToPlan,
  deletePlan,
  finishPlan,
  getPlan,
  getPlanExercises,
  removeExerciseFromPlan,
  reopenPlan,
  reorderPlanExercises,
  type PlanExerciseWithDetails,
} from '../../db/plans'
import MediaThumb from '../../media/MediaThumb'
import PlanSessionsList from '../sessions/PlanSessionsList'
import DuplicatePlanModal from './DuplicatePlanModal'
import ExercisePickerModal from './ExercisePickerModal'
import PlanFormModal from './PlanFormModal'
import { PlanStatusBadge } from './PlanStatusBadge'
import { usePlanDates } from './usePlanDates'
import './plans.css'

type Modal = 'edit' | 'duplicate' | 'picker' | null

export default function PlanDetailPage() {
  const { t } = useTranslation()
  const { dogId, planId } = useParams<{ dogId: string; planId: string }>()
  const router = useIonRouter()
  const planDates = usePlanDates()
  const [presentActions] = useIonActionSheet()
  const [presentAlert] = useIonAlert()
  const presentToast = useAppToast()
  const [modal, setModal] = useState<Modal>(null)
  const [reordering, setReordering] = useState(false)

  // undefined while loading, null when the plan does not exist.
  const plan = useLiveQuery(async () => (await getPlan(planId)) ?? null, [planId])
  const exercises = useLiveQuery(
    () => getPlanExercises(planId, { includeArchived: true }),
    [planId],
  )
  const active = useMemo(() => exercises?.filter((e) => !e.archived) ?? [], [exercises])
  const archived = useMemo(() => exercises?.filter((e) => e.archived) ?? [], [exercises])
  const activeExerciseIds = useMemo(() => new Set(active.map((e) => e.exerciseId)), [active])

  const backHref = `/dogs/${dogId}`
  if (plan === undefined)
    return (
      <PageLayout title="" backHref={backHref}>
        {null}
      </PageLayout>
    )
  if (plan === null) {
    return (
      <PageLayout title={t('dogs.plans')} backHref={backHref}>
        <EmptyState message={t('common.notFound')} />
      </PageLayout>
    )
  }

  const remove = async (pe: PlanExerciseWithDetails) => {
    const outcome = await removeExerciseFromPlan(pe.id)
    void presentToast({
      message: outcome === 'archived' ? t('plans.archivedToast') : t('plans.removed'),
      duration: 2500,
    })
  }

  const reorder = (event: CustomEvent<ItemReorderEventDetail>) => {
    const ids = event.detail.complete(active.map((e) => e.id)) as string[]
    void reorderPlanExercises(plan.id, ids)
  }

  const confirmDelete = () =>
    presentAlert({
      header: t('plans.deleteTitle', { name: plan.name }),
      message: t('plans.deleteMessage'),
      buttons: [
        { text: t('common.cancel'), role: 'cancel' },
        {
          text: t('common.delete'),
          role: 'destructive',
          handler: () => {
            void deletePlan(plan.id).then(() => router.push(backHref, 'back', 'pop'))
          },
        },
      ],
    })

  const openActions = () =>
    presentActions({
      buttons: [
        { text: t('common.edit'), handler: () => setModal('edit') },
        {
          text: t('progress.viewProgress'),
          handler: () => router.push(`/progress?plan=${plan.id}`),
        },
        { text: t('plans.duplicate'), handler: () => setModal('duplicate') },
        plan.status === 'active'
          ? { text: t('plans.finish'), handler: () => void finishPlan(plan.id) }
          : { text: t('plans.reopen'), handler: () => void reopenPlan(plan.id) },
        { text: t('plans.delete'), role: 'destructive', handler: () => void confirmDelete() },
        { text: t('common.cancel'), role: 'cancel' },
      ],
    })

  return (
    <PageLayout
      title={plan.name}
      backHref={backHref}
      actions={
        <IonButton aria-label={t('common.more')} onClick={() => void openActions()}>
          <IonIcon slot="icon-only" icon={ellipsisVertical} />
        </IonButton>
      }
    >
      <div className="ion-padding plan-header">
        <div className="plan-header__title">
          <h1 className="ion-no-margin">{plan.name}</h1>
          <PlanStatusBadge status={plan.status} />
        </div>
        <IonText color="medium">
          <p className="ion-no-margin">{planDates(plan)}</p>
        </IonText>
        {plan.notes && <p className="plan-notes">{plan.notes}</p>}
      </div>

      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('plans.exercises')}</IonLabel>
          {active.length > 1 && (
            <IonButton onClick={() => setReordering((r) => !r)}>
              <IonIcon slot="start" icon={swapVertical} />
              {reordering ? t('common.done') : t('plans.reorder')}
            </IonButton>
          )}
        </IonListHeader>
        <IonReorderGroup disabled={!reordering} onIonItemReorder={reorder}>
          {active.map((pe) => (
            <IonItemSliding key={pe.id} disabled={reordering}>
              <IonItem
                routerLink={
                  reordering
                    ? undefined
                    : `/dogs/${dogId}/plans/${planId}/exercises/${pe.exerciseId}`
                }
                detail={!reordering}
              >
                <IonThumbnail slot="start" className="plan-exercise-thumb">
                  {pe.exercise.media[0] ? (
                    <MediaThumb media={pe.exercise.media[0]} />
                  ) : (
                    <IonIcon icon={barbellOutline} aria-hidden />
                  )}
                </IonThumbnail>
                <IonLabel>{pe.exercise.title}</IonLabel>
                <IonReorder slot="end" />
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={() => void remove(pe)}>
                  {t('common.remove')}
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonReorderGroup>
        <IonItem button detail={false} onClick={() => setModal('picker')}>
          <IonIcon slot="start" icon={add} color="primary" />
          <IonLabel color="primary">{t('plans.addExercises')}</IonLabel>
        </IonItem>
      </IonList>
      {exercises && active.length === 0 && <EmptyState message={t('plans.noExercises')} />}

      {archived.length > 0 && (
        <IonList inset>
          <IonListHeader>
            <IonLabel>{t('plans.archived')}</IonLabel>
          </IonListHeader>
          {archived.map((pe) => (
            <IonItem key={pe.id}>
              <IonLabel color="medium">{pe.exercise.title}</IonLabel>
              <IonButton
                slot="end"
                fill="clear"
                onClick={() => void addExerciseToPlan(plan.id, pe.exerciseId)}
              >
                {t('common.restore')}
              </IonButton>
            </IonItem>
          ))}
          <IonItem lines="none">
            <IonNote className="ion-text-wrap">{t('plans.archivedHelp')}</IonNote>
          </IonItem>
        </IonList>
      )}

      {exercises && (
        <PlanSessionsList dogId={dogId} planId={plan.id} exerciseCount={active.length} />
      )}

      <PlanFormModal isOpen={modal === 'edit'} plan={plan} onDismiss={() => setModal(null)} />
      <DuplicatePlanModal
        isOpen={modal === 'duplicate'}
        plan={plan}
        onDismiss={(copy) => {
          setModal(null)
          if (copy) router.push(`/dogs/${copy.dogId}/plans/${copy.id}`)
        }}
      />
      <ExercisePickerModal
        isOpen={modal === 'picker'}
        excludeIds={activeExerciseIds}
        onDismiss={(ids) => {
          setModal(null)
          if (ids?.length) void addExercisesToPlan(plan.id, ids)
        }}
      />
    </PageLayout>
  )
}
