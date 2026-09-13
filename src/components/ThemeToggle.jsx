import React from 'react'
import { useTheme } from '../context/ThemeContext'

const THEMES = [
  { id: 'warm', label: 'Warm' },
  { id: 'calm', label: 'Calm' },
  { id: 'night', label: 'Night' },
  { id: 'pastel', label: 'Pastel' }
]

export default function ThemeToggle(){
  const { theme, setTheme } = useTheme()
  return (
    <div className="theme-toggle" role="toolbar" aria-label="Theme switcher">
      {THEMES.map(t => (
        <button key={t.id} className={"theme-dot "+(theme===t.id? 'active':'')} onClick={() => setTheme(t.id)} aria-pressed={theme===t.id} title={t.label}>
          <span className="visually-hidden">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
