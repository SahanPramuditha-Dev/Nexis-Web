import React from 'react'

interface NexisButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'danger' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
}

export function NexisButton({
  label,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  className = '',
}: NexisButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-5 py-2.5 text-xs rounded-xl gap-2',
    lg: 'px-8 py-3.5 text-sm rounded-2xl gap-2.5',
  }[size]

  let variantStyles = {}

  if (variant === 'primary') {
    variantStyles = {
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
      color: 'var(--on-primary)',
      boxShadow: '0 0 20px var(--primary-glow)',
    }
  } else if (variant === 'danger') {
    variantStyles = {
      backgroundColor: 'var(--color-danger)',
      color: '#FFFFFF',
      boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
    }
  } else if (variant === 'secondary') {
    variantStyles = {
      backgroundColor: 'var(--bg-subtle)',
      color: 'var(--on-surface)',
      border: '1px solid var(--border-subtle)',
    }
  } else if (variant === 'ghost') {
    variantStyles = {
      backgroundColor: 'transparent',
      color: 'var(--on-surface-muted)',
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-bold font-mono tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${sizeClasses} ${className}`}
      style={variantStyles}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  )
}
