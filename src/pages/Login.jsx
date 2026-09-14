import React, { useEffect } from 'react'
import Logo from '../components/Logo'

export default function Login({ onContinue }) {
  useEffect(() => {
    document.body.classList.add('bg-login')
    return () => document.body.classList.remove('bg-login')
  }, [])

  return (
    <div className="login-shell">
      <div className="login-visual-panel">
        <div className="visual-glow glow-one" />
        <div className="visual-glow glow-two" />

        <div className="login-badge">Memory care companion</div>
        <h1>
          Reconnect with the moments that shape a lifetime.
        </h1>
        <p>
          EchoMind brings comfort, familiarity, and joy back into daily life through thoughtful memory care.
        </p>

        <div className="mini-stat-grid">
          <div className="stat-pill">
            <strong>2,400+</strong>
            <span>moments remembered</span>
          </div>
          <div className="stat-pill">
            <strong>24/7</strong>
            <span>gentle support</span>
          </div>
          <div className="stat-pill">
            <strong>96%</strong>
            <span>family satisfaction</span>
          </div>
        </div>

        <blockquote className="login-quote">
          “Every story deserves to be remembered with warmth.”
        </blockquote>
      </div>

      <div className="center-card login-card">
        <Logo />
        <h2>Welcome back</h2>
        <p className="muted">Bringing your memories gently back</p>

        <div className="form">
          <label className="label">
            Email or Phone
            <input aria-label="email" className="input" placeholder="name@example.com" />
          </label>
          <label className="label">
            Password
            <input type="password" aria-label="password" className="input" placeholder="Enter your password" />
          </label>

          <div className="row buttons-row">
            <button className="large-btn primary" onClick={() => onContinue(false)}>Continue as Patient</button>
            <button className="large-btn secondary" onClick={() => onContinue(true)}>Continue as Family / Caregiver</button>
          </div>
        </div>
      </div>
    </div>
  )
}
