import React, { useEffect, useState, useCallback } from 'react'
import { api, speakText } from '../api'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'

const FONT_SIZES = ['small', 'medium', 'large', 'x-large']
const THEMES = [
  { key: 'warm', label: '☀️ Warm', desc: 'Soft oranges and purples' },
  { key: 'calm', label: '🌿 Calm', desc: 'Teal greens and amber' },
  { key: 'night', label: '🌙 Night', desc: 'Dark mode with blue accents' },
  { key: 'pastel', label: '🌸 Pastel', desc: 'Soft pinks and lavender' },
]

export default function Settings({ onBack }) {
  const { user, refreshUser } = useAuth()
  const [settings, setSettings] = useState({
    theme: 'warm',
    fontSize: 'medium',
    speechRate: 0.85,
    voiceName: '',
    ttsEnabled: true,
  })
  const [voices, setVoices] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.body.classList.add('bg-settings')
    return () => document.body.classList.remove('bg-settings')
  }, [])

  // Load voices
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis?.getVoices() || []
      if (v.length) setVoices(v.filter(v => v.lang.startsWith('en')))
    }
    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
  }, [])

  // Load settings from backend
  useEffect(() => {
    api.settings.get()
      .then(data => {
        if (data?.settings) setSettings(prev => ({ ...prev, ...data.settings }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Apply font size to root
  useEffect(() => {
    const sizeMap = { small: '14px', medium: '16px', large: '19px', 'x-large': '22px' }
    document.documentElement.style.fontSize = sizeMap[settings.fontSize] || '16px'
  }, [settings.fontSize])

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }))

  async function handleSave() {
    setSaving(true)
    try {
      await api.settings.update(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert('Failed to save settings: ' + (e.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  function testVoice() {
    speakText('Hello! This is how EchoMind will read your memories to you.', {
      rate: settings.speechRate,
      voice: settings.voiceName,
    })
  }

  if (loading) return (
    <PageLayout>
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        Loading settings…
      </div>
    </PageLayout>
  )

  return (
    <PageLayout>
      <PageHeader
        title="Settings"
        subtitle="Personalise your EchoMind experience"
        onBack={onBack}
        actions={
          <button className="large-btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700, marginTop: 20 }}>

        {/* Safety & Medical Disclaimer (Section 5.2, Appendix B) */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(219, 234, 254, 0.9))',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>⚕️</span>
          <div>
            <strong style={{ color: '#1e40af', fontSize: 14, display: 'block', marginBottom: 4 }}>
              Medical & Clinical Scope Notice (SRS Section 5.2)
            </strong>
            <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a', lineHeight: 1.55 }}>
              EchoMind-AI is an assistive cognitive support and multimedia memory engagement tool. It is not a certified medical device and does not diagnose, treat, or replace professional clinical supervision or emergency medical services.
            </p>
          </div>
        </div>

        {/* Theme */}
        <section className="center-card" style={{ textAlign: 'left', padding: 24 }}>
          <h3 style={{ margin: '0 0 6px', color: 'var(--primary)' }}>🎨 Colour Theme</h3>
          <p className="muted" style={{ margin: '0 0 16px' }}>Choose the look that feels most comfortable</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {THEMES.map(t => (
              <button
                key={t.key}
                onClick={() => update('theme', t.key)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: settings.theme === t.key ? '2px solid var(--primary)' : '2px solid rgba(16,24,40,0.06)',
                  background: settings.theme === t.key ? 'rgba(91,110,246,0.08)' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .15s ease',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Accessibility */}
        <section className="center-card" style={{ textAlign: 'left', padding: 24 }}>
          <h3 style={{ margin: '0 0 6px', color: 'var(--primary)' }}>♿ Accessibility</h3>
          <p className="muted" style={{ margin: '0 0 16px' }}>Adjust text size for easier reading</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {FONT_SIZES.map(size => (
              <button
                key={size}
                className={`large-btn ${settings.fontSize === size ? 'primary' : 'secondary'}`}
                onClick={() => update('fontSize', size)}
                style={{ fontSize: size === 'small' ? 13 : size === 'large' ? 18 : size === 'x-large' ? 20 : 15 }}
              >
                {size === 'x-large' ? 'Extra Large' : size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
            Currently: <strong>{settings.fontSize}</strong>
          </p>
        </section>

        {/* Voice & TTS */}
        <section className="center-card" style={{ textAlign: 'left', padding: 24 }}>
          <h3 style={{ margin: '0 0 6px', color: 'var(--primary)' }}>🔊 Voice & Narration</h3>
          <p className="muted" style={{ margin: '0 0 16px' }}>Configure how EchoMind speaks to your loved one</p>

          <label className="label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.ttsEnabled}
              onChange={e => update('ttsEnabled', e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            Enable voice narration
          </label>

          {settings.ttsEnabled && (
            <>
              <label className="label">
                Speech Rate
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>Slow</span>
                  <input
                    type="range" min="0.5" max="1.5" step="0.05"
                    value={settings.speechRate}
                    onChange={e => update('speechRate', parseFloat(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>Fast</span>
                  <span style={{ minWidth: 36, color: 'var(--primary)', fontWeight: 700 }}>
                    {settings.speechRate.toFixed(2)}x
                  </span>
                </div>
              </label>

              {voices.length > 0 && (
                <label className="label" style={{ marginTop: 12 }}>
                  Voice Selection
                  <select
                    className="input"
                    value={settings.voiceName}
                    onChange={e => update('voiceName', e.target.value)}
                    style={{ marginTop: 8 }}
                  >
                    <option value="">Default voice</option>
                    {voices.map(v => (
                      <option key={v.voiceURI} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <button
                className="large-btn secondary"
                onClick={testVoice}
                style={{ marginTop: 14 }}
              >
                🎵 Test Voice
              </button>
            </>
          )}
        </section>

        {/* Biometric & Privacy Consent (NFR-SEC-02, Appendix B) */}
        <section className="center-card" style={{ textAlign: 'left', padding: 24 }}>
          <h3 style={{ margin: '0 0 6px', color: 'var(--primary)' }}>🔒 Biometric & Privacy Consent (NFR-SEC-02)</h3>
          <p className="muted" style={{ margin: '0 0 16px' }}>Explicit consent for facial recognition and personal voice playback</p>

          <label className="label" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', background: 'rgba(91,110,246,0.04)', padding: 14, borderRadius: 12, border: '1px solid rgba(91,110,246,0.1)' }}>
            <input
              type="checkbox"
              checked={settings.biometricConsent !== false}
              onChange={e => update('biometricConsent', e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              I grant explicit consent for EchoMind-AI to analyze camera imagery to recognize enrolled family faces and personal keepsakes, and to process voice recordings strictly for private memory reconstruction.
            </span>
          </label>
        </section>

        {/* Account & Right to be Forgotten (NFR-SEC-05) */}
        <section className="center-card" style={{ textAlign: 'left', padding: 24 }}>
          <h3 style={{ margin: '0 0 6px', color: 'var(--primary)' }}>👤 Account & Data Privacy</h3>
          <p className="muted" style={{ margin: '0 0 14px' }}>Your account information and permanent deletion rights</p>
          <div style={{ background: 'rgba(91,110,246,0.04)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}><strong>Name:</strong> {user?.name || '—'}</div>
            <div style={{ marginBottom: 8 }}><strong>Email:</strong> {user?.email || '—'}</div>
            <div><strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{user?.role || '—'}</span></div>
          </div>

          <div style={{ borderTop: '1px solid rgba(16,24,40,0.08)', paddingTop: 16 }}>
            <strong style={{ color: '#dc2626', fontSize: 14, display: 'block', marginBottom: 4 }}>
              Permanent Data Deletion (NFR-SEC-05)
            </strong>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Permanently purge all biometric templates, memories, photos, and activity logs under the Right to be Forgotten.
            </p>
            <button
              type="button"
              className="large-btn"
              onClick={async () => {
                if (confirm('WARNING: Are you sure you want to permanently delete all personal data and memories? This action cannot be undone.')) {
                  try {
                    await api.caregiver.deletePatientPermanently(user.uid)
                    alert('All patient data has been permanently erased.')
                    window.location.href = '/'
                  } catch (err) {
                    alert('Error deleting data: ' + err.message)
                  }
                }
              }}
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                fontSize: 13,
                padding: '10px 16px',
                fontWeight: 600,
              }}
            >
              🗑️ Permanently Delete All Data (Right to be Forgotten)
            </button>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 12, paddingBottom: 40 }}>
          <button className="large-btn primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
          <button className="large-btn secondary" onClick={onBack}>Back</button>
        </div>
      </div>
    </PageLayout>
  )
}
