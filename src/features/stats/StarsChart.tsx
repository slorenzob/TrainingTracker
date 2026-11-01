import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { ExerciseHistoryPoint } from '../../db/stats'
import { formatDate, parseIsoDate } from '../../i18n/format'
import './stats.css'

interface StarsChartProps {
  points: readonly ExerciseHistoryPoint[]
  /** Accessible description of what the chart shows. */
  description: string
}

const shortDate = (iso: string) =>
  parseIsoDate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  const { t } = useTranslation()
  const point = payload?.[0]?.payload as (ExerciseHistoryPoint & { index: number }) | undefined
  if (!active || !point) return null
  return (
    <div className="stars-chart-tooltip">
      <strong>{t('stars.value', { count: point.stars })}</strong>
      <p>{formatDate(point.date, 'medium')}</p>
      <p>{point.planName}</p>
      {point.note && <p>{point.note}</p>}
    </div>
  )
}

/**
 * One series: stars (1–5) per session in chronological order. The x axis is the session
 * index so several sessions on the same day stay separate; ticks show their dates.
 */
export default function StarsChart({ points, description }: StarsChartProps) {
  const data = points.map((p, index) => ({ ...p, index }))
  return (
    <figure className="stars-chart" aria-label={description} role="img">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} strokeWidth={1} />
          <XAxis
            dataKey="index"
            type="number"
            domain={[0, Math.max(data.length - 1, 1)]}
            allowDecimals={false}
            tickFormatter={(i: number) => (data[i] ? shortDate(data[i].date) : '')}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            width={24}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={ChartTooltip}
            cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="stars"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            // 8px markers with a 2px surface ring; larger on hover.
            dot={{ r: 4, fill: 'currentColor', stroke: 'var(--chart-surface)', strokeWidth: 2 }}
            activeDot={{
              r: 6,
              fill: 'currentColor',
              stroke: 'var(--chart-surface)',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}
