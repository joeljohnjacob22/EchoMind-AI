import React from 'react'

export default function EmptyState({ title = 'No results', subtitle = 'Try a different search or upload new memories.', action = null }){
  return (
    <div className="empty-state">
      <svg width="240" height="160" viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" className="empty-illustration" aria-hidden>
        <defs>
          <linearGradient id="e1" x1="0" x2="1"><stop offset="0%" stopColor="#ffd1a8"/><stop offset="100%" stopColor="#cfe9ff"/></linearGradient>
        </defs>
        <rect x="0" y="0" width="240" height="160" rx="12" fill="#fff" stroke="#f3f4f6"/>
        <g className="float" transform="translate(20,20)">
          <circle cx="40" cy="40" r="28" fill="#ffb199" />
          <rect x="90" y="22" width="90" height="56" rx="8" fill="url(#e1)" />
        </g>
      </svg>
      <h3>{title}</h3>
      <p className="muted">{subtitle}</p>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}
