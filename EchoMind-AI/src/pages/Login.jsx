import React, { useEffect, useState } from 'react'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function Login({ onContinue }) {
  useEffect(() => {
    document.body.classList.add('bg-login')
    return () => document.body.classList.remove('bg-login')
  }, [])

  const { login, register, quickAccess } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({ email: '', password: '', name: '', caregiverCode: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // Recovery modal state (FR-AUT-04)
  const [showRecover, setShowRecover] = useState(false)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recoverPassword, setRecoverPassword] = useState('')
  const [recoverLoading, setRecoverLoading] = useState(false)
  const [recoverMessage, setRecoverMessage] = useState(null)
  const [recoverError, setRecoverError] = useState(null)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!form.email.trim() || !form.password) {
      setError('Please enter both email and password.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        const data = await login(form.email.trim(), form.password)
        onContinue(data.user.role === 'caregiver' || data.user.role === 'admin')
      } else {
        const data = await register({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          role: role,
          caregiverCode: role === 'caregiver' ? form.caregiverCode : undefined,
        })
        onContinue(data.user.role === 'caregiver' || data.user.role === 'admin')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Simplified low-friction tablet login for patients (FR-AUT-02)
  async function handleQuickPatientAccess() {
    setError(null)
    setLoading(true)
    try {
      await quickAccess()
      onContinue(false)
    } catch (err) {
      setError(err.message || 'Quick access unavailable. Please log in with email.')
    } finally {
      setLoading(false)
    }
  }

  // Helper to fill demo credentials
  function fillCredentials(email, pass) {
    setError(null)
    setForm((f) => ({ ...f, email, password: pass }))
  }

  // Password reset recovery (FR-AUT-04)
  async function handleRecoverSubmit(e) {
    e.preventDefault()
    setRecoverError(null)
    setRecoverMessage(null)
    setRecoverLoading(true)
    try {
      const res = await api.auth.recover({
        email: recoverEmail.trim(),
        newPassword: recoverPassword,
      })
      setRecoverMessage(res.message || 'Password reset successfully! You can now log in.')
      setTimeout(() => {
        setShowRecover(false)
        setRecoverMessage(null)
        setForm((f) => ({ ...f, email: recoverEmail.trim() }))
      }, 2000)
    } catch (err) {
      setRecoverError(err.message || 'Failed to reset credentials. Check email address.')
    } finally {
      setRecoverLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-visual-panel">
        <div className="visual-glow glow-one" />
        <div className="visual-glow glow-two" />

        <div className="login-badge">AI Cognitive Memory Companion</div>
        <h1>Reconnect with the moments that shape a lifetime.</h1>
        <p>
          EchoMind-AI brings comfort, familiar faces, and cherished memories back into daily life through
          voice-guided recall, live camera recognition, and chronological life storytelling.
        </p>

        <div className="mini-stat-grid">
          <div className="stat-pill">
            <strong>2,400+</strong>
            <span>moments remembered</span>
          </div>
          <div className="stat-pill">
            <strong>&gt;90%</strong>
            <span>recognition accuracy</span>
          </div>
          <div className="stat-pill">
            <strong>24/7</strong>
            <span>calm voice support</span>
          </div>
        </div>

        <blockquote className="login-quote">
          "Every memory is a quiet story waiting to bring comfort once again."
        </blockquote>
      </div>

      <div className="center-card login-card">
        <Logo />
        <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="muted">
          {mode === 'login' ? 'Bringing your cherished memories gently back' : 'Join EchoMind-AI today'}
        </p>

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 10, padding: '10px 14px', color: '#c0392b', marginBottom: 12, fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Simplified Low-Friction Patient Tablet Access (FR-AUT-02) */}
        {mode === 'login' && (
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={handleQuickPatientAccess}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: 14,
                border: '2px solid rgba(91,110,246,0.2)',
                background: 'linear-gradient(135deg, rgba(91,110,246,0.1), rgba(139,227,199,0.15))',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--primary)',
                boxShadow: '0 4px 16px rgba(91,110,246,0.08)',
                transition: 'all .2s ease',
              }}
            >
              <span>⚡</span>
              <span>Patient 1-Click Access (Dedicated Tablet Mode)</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 10px', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(16,24,40,0.1)' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or sign in below</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(16,24,40,0.1)' }} />
            </div>
          </div>
        )}

        {/* Quick Fill Test Accounts */}
        {mode === 'login' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => fillCredentials('hemanth123@gmail.com', 'password123')}
              style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(91,110,246,0.2)', background: 'rgba(91,110,246,0.06)', fontSize: 12, cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}
            >
              👤 Fill Patient
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('caregiver@example.com', 'password123')}
              style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)', fontSize: 12, cursor: 'pointer', color: '#059669', fontWeight: 600 }}
            >
              🏥 Fill Caregiver
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@echomind.ai', 'password123')}
              style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.06)', fontSize: 12, cursor: 'pointer', color: '#d97706', fontWeight: 600 }}
            >
              🛡️ Fill Admin
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          {mode === 'register' && (
            <label className="label">
              Full Name
              <input className="input" placeholder="Your name" value={form.name} onChange={update('name')} required />
            </label>
          )}

          <label className="label">
            Email Address
            <input
              type="email"
              aria-label="email"
              className="input"
              placeholder="name@example.com"
              value={form.email}
              onChange={update('email')}
              required
            />
          </label>

          <label className="label">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              aria-label="password"
              className="input"
              placeholder="Enter your password"
              value={form.password}
              onChange={update('password')}
              required
            />
          </label>

          {mode === 'register' && (
            <div style={{ marginBottom: 15, padding: 12, background: 'rgba(91,110,246,0.04)', borderRadius: 10, border: '1px solid rgba(91,110,246,0.1)' }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold', fontSize: 14 }}>Role Selection (FR-AUT-03)</label>
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <input type="radio" checked={role === 'patient'} onChange={() => setRole('patient')} />
                  Patient
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <input type="radio" checked={role === 'caregiver'} onChange={() => setRole('caregiver')} />
                  Caregiver / Family
                </label>
              </div>
            </div>
          )}

          {mode === 'register' && role === 'caregiver' && (
            <label className="label">
              Caregiver Verification Code
              <input className="input" placeholder="Enter access code" value={form.caregiverCode} onChange={update('caregiverCode')} />
            </label>
          )}

          <div className="buttons-row">
            <button
              type="submit"
              className="large-btn primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </div>

          {/* Forgot Password Recovery (FR-AUT-04) */}
          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowRecover(true)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13 }}
              >
                Forgot Password / Reset Credentials?
              </button>
            </div>
          )}

          <p style={{ marginTop: 14, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 14, padding: 0 }}
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </form>
      </div>

      {/* Credential Recovery Modal (FR-AUT-04) */}
      {showRecover && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 10px', color: 'var(--primary)' }}>Reset Credentials (FR-AUT-04)</h3>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 16px' }}>
              Enter your registered email address and choose a new secure password.
            </p>

            {recoverError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                ⚠️ {recoverError}
              </div>
            )}
            {recoverMessage && (
              <div style={{ background: '#d1fae5', color: '#065f46', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                ✓ {recoverMessage}
              </div>
            )}

            <form onSubmit={handleRecoverSubmit}>
              <label className="label">
                Registered Email
                <input
                  type="email"
                  className="input"
                  placeholder="caregiver@example.com"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  required
                />
              </label>

              <label className="label" style={{ marginTop: 12 }}>
                New Password
                <input
                  type="password"
                  className="input"
                  placeholder="Enter new password"
                  value={recoverPassword}
                  onChange={(e) => setRecoverPassword(e.target.value)}
                  required
                />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="large-btn secondary"
                  onClick={() => setShowRecover(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="large-btn primary"
                  disabled={recoverLoading || !recoverEmail.trim() || !recoverPassword.trim()}
                  style={{ flex: 1 }}
                >
                  {recoverLoading ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
