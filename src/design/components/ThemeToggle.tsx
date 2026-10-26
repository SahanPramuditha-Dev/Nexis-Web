import React, { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useSettingsStore()
  const [isRotating, setIsRotating] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    setIsRotating(true)
    toggleTheme(e)
    setTimeout(() => setIsRotating(false), 400)
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={handleClick}
      className={`relative w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer overflow-hidden active:scale-95 ${className}`}
      style={{
        backgroundColor: 'var(--bg-subtle)',
        borderColor: 'var(--border-subtle)',
      }}
      title={isDark ? 'Switch to Clean Studio Light Mode' : 'Switch to Obsidian Dark Mode'}
      aria-label="Toggle Theme Mode"
    >
      <div
        className={`flex items-center justify-center transition-transform duration-500 ease-out ${
          isRotating ? 'rotate-[360deg] scale-110' : 'rotate-0 scale-100'
        }`}
      >
        {isDark ? (
          <Sun
            size={16}
            className="text-[var(--color-warning)]"
          />
        ) : (
          <Moon
            size={16}
            className="text-[var(--primary)]"
          />
        )}
      </div>
    </button>
  )
}
