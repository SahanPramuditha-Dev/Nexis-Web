import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface NexisSectionHeaderProps {
  label: string
  className?: string
}

export function NexisSectionHeader({ label, className }: NexisSectionHeaderProps) {
  return (
    <p
      className={clsx('text-xs font-semibold tracking-widest uppercase', className)}
      style={{ color: 'var(--on-surface-var)' }}
    >
      {label}
    </p>
  )
}

interface NexisMetricProps {
  label: string
  value: string
  unit?: string
  color?: string
  className?: string
}

export function NexisMetric({ label, value, unit, color, className }: NexisMetricProps) {
  return (
    <div className={clsx('flex flex-col gap-0.5', className)}>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--on-surface-var)' }}>
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold leading-none" style={{ color: color ?? 'var(--on-surface)' }}>
          {value}
        </span>
        {unit && (
          <span className="text-sm font-semibold" style={{ color: 'var(--on-surface-var)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

interface NexisInfoBannerProps {
  children: ReactNode
  variant?: 'info' | 'warning' | 'error' | 'success'
  className?: string
}

const BANNER_COLORS = {
  info: 'var(--color-metric-info)',
  warning: 'var(--color-nexis-amber-80)',
  error: 'var(--color-metric-critical)',
  success: 'var(--color-metric-healthy)',
}

export function NexisInfoBanner({ children, variant = 'info', className }: NexisInfoBannerProps) {
  const color = BANNER_COLORS[variant]
  return (
    <div
      className={clsx('flex items-start gap-3 rounded-xl px-4 py-3 text-sm', className)}
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        color: 'var(--on-surface)',
      }}
    >
      {children}
    </div>
  )
}

interface NexisCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function NexisCard({ children, className, onClick }: NexisCardProps) {
  return (
    <div
      className={clsx(
        'rounded-[18px] p-4 border transition-all',
        onClick && 'cursor-pointer hover:border-[var(--primary)] active:scale-[0.99]',
        className,
      )}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--on-surface)',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
