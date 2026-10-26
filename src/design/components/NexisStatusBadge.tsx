import React from 'react'

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface NexisStatusBadgeProps {
  label: string
  sublabel?: string
  variant?: StatusVariant
  pulse?: boolean
  icon?: React.ReactNode
  className?: string
}

const VARIANT_COLORS: Record<StatusVariant, { dot: string; bg: string; text: string; border: string }> = {
  success: {
    dot: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
    text: 'var(--color-success)',
    border: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
  },
  warning: {
    dot: 'var(--color-warning)',
    bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
    text: 'var(--color-warning)',
    border: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
  },
  danger: {
    dot: 'var(--color-danger)',
    bg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
    text: 'var(--color-danger)',
    border: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
  },
  info: {
    dot: 'var(--primary)',
    bg: 'color-mix(in srgb, var(--primary) 12%, transparent)',
    text: 'var(--primary)',
    border: 'color-mix(in srgb, var(--primary) 30%, transparent)',
  },
  neutral: {
    dot: 'var(--on-surface-dim)',
    bg: 'var(--bg-subtle)',
    text: 'var(--on-surface-muted)',
    border: 'var(--border-subtle)',
  },
}

export function NexisStatusBadge({
  label,
  sublabel,
  variant = 'info',
  pulse = false,
  icon,
  className = '',
}: NexisStatusBadgeProps) {
  const c = VARIANT_COLORS[variant]

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono select-none ${className}`}
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
      }}
    >
      {icon ? (
        <span className="shrink-0">{icon}</span>
      ) : (
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: c.dot }}
        />
      )}
      <span className="font-bold tracking-wide">{label}</span>
      {sublabel && (
        <span style={{ color: 'var(--on-surface-dim)' }}>{sublabel}</span>
      )}
    </div>
  )
}
