import React from 'react'

export default function Logo() {
  return (
    <div className="logo-anim" aria-hidden>
      <svg width="220" height="64" viewBox="0 0 220 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#FFB199" />
            <stop offset="50%" stopColor="#FFDDAA" />
            <stop offset="100%" stopColor="#BFD8FF" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="220" height="64" rx="12" fill="url(#g1)" opacity="0.08" />
        <text x="16" y="40" fontFamily="system-ui,Segoe UI,Roboto" fontSize="28" fontWeight="700" fill="url(#g1)">EchoMind</text>
      </svg>
    </div>
  )
}
