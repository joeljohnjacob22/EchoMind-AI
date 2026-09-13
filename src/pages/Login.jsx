import React, { useEffect } from 'react'
import Logo from '../components/Logo'

export default function Login({ onContinue }) {
  useEffect(() => {
    document.body.classList.add('bg-login')
    return () => document.body.classList.remove('bg-login')
  }, [])
  return (
    <div className="center-card">
      <Logo />
      <h1>Welcome</h1>
      <p className="muted">Bringing your memories gently back</p>

      <div className="form">
        <label className="label">
          Email or Phone
          <input aria-label="email" className="input" />
        </label>
        <label className="label">
          Password
          <input type="password" aria-label="password" className="input" />
        </label>

        <div className="row buttons-row">
          <button className="large-btn primary" onClick={() => onContinue(false)}>Continue as Patient</button>
          <button className="large-btn secondary" onClick={() => onContinue(true)}>Continue as Family / Caregiver</button>
        </div>
      </div>
    </div>
  )
}
