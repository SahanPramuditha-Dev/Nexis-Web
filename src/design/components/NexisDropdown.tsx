import React, { useState, useRef, useEffect, type ReactNode } from 'react'
import { IoChevronDown, IoCheckmark } from 'react-icons/io5'

export interface DropdownOption<T extends string | number = string> {
  value: T
  label: string
  sublabel?: string
  icon?: ReactNode
}

export interface NexisDropdownProps<T extends string | number = string> {
  options: DropdownOption<T>[]
  value: T
  onChange: (value: T) => void
  labelPrefix?: string
  icon?: ReactNode
  className?: string
  menuWidth?: string | number
  align?: 'left' | 'right'
}

export function NexisDropdown<T extends string | number = string>({
  options,
  value,
  onChange,
  labelPrefix,
  icon,
  className = '',
  menuWidth = 'auto',
  align = 'right',
}: NexisDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedOption = options.find((o) => o.value === value) || options[0]

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (val: T) => {
    onChange(val)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${isOpen ? 'z-50' : 'z-auto'} ${className}`}>
      {/* Trigger Button - iOS style pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center h-9 gap-2 px-3.5 rounded-full text-xs font-sans font-medium border transition-all cursor-pointer select-none active:scale-[0.98] ${
          isOpen
            ? 'bg-[var(--bg-subtle)] border-[var(--primary)] text-[var(--on-surface)] shadow-xs'
            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--on-surface-dim)] hover:bg-[var(--bg-subtle)] text-[var(--on-surface)]'
        }`}
      >
        {icon && <span className="text-[var(--on-surface-muted)] flex items-center">{icon}</span>}
        {labelPrefix && (
          <span className="text-[10px] font-mono text-[var(--on-surface-dim)] uppercase tracking-wider">
            {labelPrefix}
          </span>
        )}
        <span className="font-semibold text-[var(--on-surface)]">
          {selectedOption?.label}
        </span>
        <IoChevronDown
          className={`text-xs text-[var(--on-surface-dim)] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--on-surface)]' : ''
          }`}
        />
      </button>

      {/* Floating Menu Popover - iOS Glassmorphism */}
      {isOpen && (
        <div
          style={{
            minWidth: menuWidth === 'auto' ? '200px' : menuWidth,
          }}
          className={`absolute top-full mt-2 z-[60] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex flex-col gap-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl text-xs font-sans text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold'
                      : 'text-[var(--on-surface)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {opt.icon && (
                      <span className={isSelected ? 'text-[var(--primary)]' : 'text-[var(--on-surface-muted)]'}>
                        {opt.icon}
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-[var(--on-surface-muted)] font-mono">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <IoCheckmark className="text-sm text-[var(--primary)] shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
