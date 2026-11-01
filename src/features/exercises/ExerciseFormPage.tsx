import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTextarea,
  useIonRouter,
  useIonViewWillLeave,
} from '@ionic/react'
import { add, closeCircleOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageLayout from '../../components/PageLayout'
import { createExercise, getExercise, updateExercise } from '../../db/exercises'
import MediaGallery from '../../media/MediaGallery'
import MediaPicker from '../../media/MediaPicker'
import { useMediaDraft } from '../../media/useMediaDraft'
import {
  emptyLink,
  toLinkDrafts,
  validateExerciseForm,
  type ExerciseFormErrors,
  type LinkDraft,
} from './exerciseForm'
import './exercises.css'

/** Create (`/exercises/new`) or edit (`/exercises/:exerciseId/edit`) a library exercise. */
export default function ExerciseFormPage() {
  const { t } = useTranslation()
  const { exerciseId } = useParams<{ exerciseId?: string }>()
  const router = useIonRouter()
  const isEdit = exerciseId !== undefined

  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(
    isEdit ? 'loading' : 'ready',
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [links, setLinks] = useState<LinkDraft[]>([])
  const [errors, setErrors] = useState<ExerciseFormErrors>({ invalidLinkKeys: [] })
  const [saving, setSaving] = useState(false)
  const draft = useMediaDraft()
  const { reset, discard } = draft

  useEffect(() => {
    if (!exerciseId) return
    void getExercise(exerciseId).then((exercise) => {
      if (!exercise) return setStatus('missing')
      setTitle(exercise.title)
      setDescription(exercise.description)
      setLinks(toLinkDrafts(exercise.links))
      reset(exercise.media)
      setStatus('ready')
    })
  }, [exerciseId, reset])

  // Leaving without saving (back button, tab switch) drops the files picked meanwhile.
  useIonViewWillLeave(() => void discard(), [discard])

  // Editing a field clears its error; the next save validates everything again.
  const changeTitle = (value: string) => {
    setTitle(value)
    setErrors((e) => ({ ...e, title: undefined }))
  }

  const updateLink = (key: string, changes: Partial<LinkDraft>) => {
    setLinks((current) => current.map((l) => (l.key === key ? { ...l, ...changes } : l)))
    setErrors((e) => ({ ...e, invalidLinkKeys: e.invalidLinkKeys.filter((k) => k !== key) }))
  }

  const save = async () => {
    const result = validateExerciseForm(title, links)
    setErrors(result.errors)
    if (!result.valid) return
    setSaving(true)
    try {
      const input = {
        title,
        description: description.trim(),
        links: result.links,
        media: draft.media,
      }
      if (isEdit) {
        await updateExercise(exerciseId, input)
        draft.commit()
        router.goBack()
      } else {
        const created = await createExercise(input)
        draft.commit()
        router.push(`/exercises/${created.id}`, 'forward', 'replace')
      }
    } finally {
      setSaving(false)
    }
  }

  const backHref = isEdit ? `/exercises/${exerciseId}` : '/exercises'
  const pageTitle = isEdit ? t('exercises.editTitle') : t('exercises.new')

  if (status !== 'ready') {
    return (
      <PageLayout title={pageTitle} backHref={backHref}>
        {status === 'missing' && <EmptyState message={t('common.notFound')} />}
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title={pageTitle}
      backHref={backHref}
      actions={
        <IonButton strong disabled={saving} onClick={() => void save()}>
          {t('common.save')}
        </IonButton>
      }
    >
      <IonList inset>
        <IonItem>
          <IonInput
            label={t('exercises.title')}
            labelPlacement="stacked"
            value={title}
            required
            autocapitalize="sentences"
            className={errors.title ? 'ion-invalid ion-touched' : undefined}
            errorText={t('exercises.titleRequired')}
            onIonInput={(e) => changeTitle(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonTextarea
            label={t('exercises.description')}
            labelPlacement="stacked"
            value={description}
            autoGrow
            rows={4}
            autocapitalize="sentences"
            onIonInput={(e) => setDescription(e.detail.value ?? '')}
          />
        </IonItem>
      </IonList>

      <IonList inset>
        <IonListHeader>
          <IonLabel>{t('exercises.links')}</IonLabel>
        </IonListHeader>
        {links.map((link) => (
          <IonItem key={link.key}>
            <div className="link-row">
              <div className="link-row__fields">
                <IonInput
                  label={t('exercises.linkUrl')}
                  labelPlacement="stacked"
                  type="url"
                  inputmode="url"
                  placeholder="https://"
                  value={link.url}
                  className={
                    errors.invalidLinkKeys.includes(link.key)
                      ? 'ion-invalid ion-touched'
                      : undefined
                  }
                  errorText={t('exercises.invalidLink')}
                  onIonInput={(e) => updateLink(link.key, { url: e.detail.value ?? '' })}
                />
                <IonInput
                  label={`${t('exercises.linkLabel')} (${t('common.optional')})`}
                  labelPlacement="stacked"
                  value={link.label}
                  onIonInput={(e) => updateLink(link.key, { label: e.detail.value ?? '' })}
                />
              </div>
              <IonButton
                fill="clear"
                color="medium"
                aria-label={t('common.remove')}
                onClick={() => setLinks((current) => current.filter((l) => l.key !== link.key))}
              >
                <IonIcon slot="icon-only" icon={closeCircleOutline} />
              </IonButton>
            </div>
          </IonItem>
        ))}
        <IonItem button detail={false} onClick={() => setLinks((c) => [...c, emptyLink()])}>
          <IonIcon slot="start" icon={add} color="primary" />
          <IonLabel color="primary">{t('exercises.addLink')}</IonLabel>
        </IonItem>
      </IonList>

      <IonListHeader>
        <IonLabel>{t('exercises.media')}</IonLabel>
      </IonListHeader>
      <div className="exercise-section">
        <MediaGallery items={draft.media} onRemove={(m) => void draft.remove(m)} />
        <MediaPicker label={t('media.add')} onPick={draft.add} />
      </div>
    </PageLayout>
  )
}
