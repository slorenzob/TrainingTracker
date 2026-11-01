import { IonIcon } from '@ionic/react'
import { star, starOutline } from 'ionicons/icons'
import { useTranslation } from 'react-i18next'
import './StarRating.css'

interface StarRatingProps {
  value?: number
  /** Omit for a read-only display. Tapping the current value clears it. */
  onChange?: (value: number | undefined) => void
  /** Accessible name of the group, e.g. the exercise title. */
  label?: string
  size?: 'small' | 'large'
}

const STARS = [1, 2, 3, 4, 5] as const

const isOn = (value: number | undefined, n: number) => value !== undefined && n <= value

export default function StarRating({ value, onChange, label, size = 'small' }: StarRatingProps) {
  const { t } = useTranslation()
  const groupLabel = label ?? t('stars.label')

  if (!onChange) {
    return (
      <span
        className={`star-rating star-rating--${size}`}
        role="img"
        aria-label={`${groupLabel}: ${t('stars.value', { count: value ?? 0 })}`}
      >
        {STARS.map((n) => (
          <IonIcon
            key={n}
            icon={isOn(value, n) ? star : starOutline}
            className={isOn(value, n) ? undefined : 'star-rating__off'}
            aria-hidden
          />
        ))}
      </span>
    )
  }

  return (
    <span className={`star-rating star-rating--${size}`} role="radiogroup" aria-label={groupLabel}>
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t('stars.value', { count: n })}
          className="star-rating__star"
          onClick={() => onChange(value === n ? undefined : n)}
        >
          <IonIcon
            icon={isOn(value, n) ? star : starOutline}
            className={isOn(value, n) ? undefined : 'star-rating__off'}
            aria-hidden
          />
        </button>
      ))}
    </span>
  )
}
