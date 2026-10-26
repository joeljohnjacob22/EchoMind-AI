import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

const STAT_COLORS = ['#5b6ef6', '#10b981', '#f59e0b', '#8b5cf6']

export default function CaregiverDashboard({ onNavigate }) {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [patientEmail, setPatientEmail] = useState('')
  const [linkError, setLinkError] = useState(null)
  const [linkLoading, setLinkLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  // Active Tab: 'memories' | 'enrolled' | 'reminders' | 'engagement' | 'alerts'
  const [activeTab, setActiveTab] = useState('memories')

  // Data states
  const [memories, setMemories] = useState([])
  const [enrolled, setEnrolled] = useState([])
  const [reminders, setReminders] = useState([])
  const [engagement, setEngagement] = useState(null)
  const [alerts, setAlerts] = useState([])

  // Modal states
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showAddEnrolled, setShowAddEnrolled] = useState(false)
  const [enrolledForm, setEnrolledForm] = useState({
    name: '',
    entityType: 'face',
    relation: 'Family',
    category: 'Keepsake',
    notes: '',
    photo: '',
  })
  const [savingEnrolled, setSavingEnrolled] = useState(false)

  const [showAddReminder, setShowAddReminder] = useState(false)
  const [reminderForm, setReminderForm] = useState({
    time: '09:00 AM',
    title: '',
    prompt: '',
  })
  const [savingReminder, setSavingReminder] = useState(false)

  // Load all patient data
  function loadPatientData(pid) {
    setSelectedPatientId(pid)
    localStorage.setItem('echomind-patient-id', pid)
    setLoading(true)

    Promise.all([
      api.memories.list({ patientId: pid }),
      api.caregiver.enrolled(pid).catch(() => ({ enrolled: [] })),
      api.caregiver.reminders(pid).catch(() => ({ reminders: [] })),
      api.caregiver.engagement(pid).catch(() => null),
      api.caregiver.alerts(pid).catch(() => ({ alerts: [] })),
    ])
      .then(([memData, enrolledData, remData, engData, alertData]) => {
        setMemories(memData.memories || [])
        setEnrolled(enrolledData.enrolled || [])
        setReminders(remData.reminders || [])
        setEngagement(engData)
        setAlerts(alertData.alerts || [])
      })
      .catch((err) => console.error('Failed to load caregiver data:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    document.body.classList.add('bg-caregiver')

    api.caregiver.patients()
      .then((data) => {
        const pts = data.patients || []
        setPatients(pts)
        if (pts.length > 0) {
          const initialPid = pts[0].id
          loadPatientData(initialPid)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))

    return () => document.body.classList.remove('bg-caregiver')
  }, [])

  async function handleLink() {
    if (!patientEmail.trim()) return
    setLinkLoading(true)
    setLinkError(null)
    try {
      await api.caregiver.link(patientEmail.trim())
      window.location.reload()
    } catch (err) {
      setLinkError(err.message || 'Failed to link patient. Check the email and try again.')
    } finally {
      setLinkLoading(false)
    }
  }

  async function handleDeleteMemory(id) {
    setDeleting(true)
    try {
      await api.memories.delete(id)
      setMemories((m) => m.filter((x) => x.id !== id))
      setDeleteId(null)
    } catch (e) {
      alert('Failed to delete: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  // Toggle Distressing Flag (Safety 5.2)
  async function handleToggleDistressing(mem) {
    try {
      const res = await api.memories.toggleDistressing(mem.id)
      setMemories((prev) =>
        prev.map((m) => (m.id === mem.id ? { ...m, distressing: res.distressing } : m))
      )
    } catch (err) {
      alert('Failed to update distressing status: ' + err.message)
    }
  }

  // Toggle Priority in Recommendations (FR-REC-04)
  async function handleTogglePriority(mem) {
    try {
      const res = await api.memories.togglePriority(mem.id)
      setMemories((prev) =>
        prev.map((m) => (m.id === mem.id ? { ...m, priority: res.priority } : m))
      )
    } catch (err) {
      alert('Failed to update recommendation priority: ' + err.message)
    }
  }

  // Save new enrolled face/object (FR-FRM-05)
  async function handleSaveEnrolled(e) {
    e.preventDefault()
    if (!enrolledForm.name.trim()) return
    setSavingEnrolled(true)
    try {
      const res = await api.caregiver.saveEnrolled({
        patientId: selectedPatientId,
        ...enrolledForm,
      })
      if (res?.entity) {
        setEnrolled((prev) => [res.entity, ...prev])
      }
      setShowAddEnrolled(false)
      setEnrolledForm({
        name: '',
        entityType: 'face',
        relation: 'Family',
        category: 'Keepsake',
        notes: '',
        photo: '',
      })
    } catch (err) {
      alert('Failed to enroll: ' + err.message)
    } finally {
      setSavingEnrolled(false)
    }
  }

  async function handleDeleteEnrolled(id) {
    if (!confirm('Are you sure you want to remove this enrolled face/object?')) return
    try {
      await api.caregiver.deleteEnrolled(id, selectedPatientId)
      setEnrolled((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  // Save new reminder (FR-CGD-03)
  async function handleSaveReminder(e) {
    e.preventDefault()
    if (!reminderForm.title.trim()) return
    setSavingReminder(true)
    try {
      const res = await api.caregiver.saveReminder({
        patientId: selectedPatientId,
        ...reminderForm,
      })
      if (res?.reminder) {
        setReminders((prev) => [res.reminder, ...prev])
      }
      setShowAddReminder(false)
      setReminderForm({ time: '09:00 AM', title: '', prompt: '' })
    } catch (err) {
      alert('Failed to save reminder: ' + err.message)
    } finally {
      setSavingReminder(false)
    }
  }

  async function handleDeleteReminder(id) {
    try {
      await api.caregiver.deleteReminder(id, selectedPatientId)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      alert('Failed to delete reminder: ' + err.message)
    }
  }

  // Resolve Alert (FR-CGD-05)
  async function handleResolveAlert(id) {
    try {
      await api.caregiver.resolveAlert(id, selectedPatientId)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      alert('Failed to resolve alert: ' + err.message)
    }
  }

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0]

  const stats = [
    { label: 'Total Memories', value: memories.length, icon: '🖼️' },
    { label: 'Enrolled Entities', value: enrolled.length, icon: '👥' },
    { label: 'Active Reminders', value: reminders.length, icon: '⏰' },
    { label: 'Pending Alerts', value: alerts.length, icon: '⚠️' },
  ]

  return (
    <PageLayout>
      <PageHeader
        title={user?.role === 'admin' ? "🛡️ System Admin & Caregiver Portal" : "Caregiver Control & Monitoring Dashboard"}
        subtitle={
          currentPatient
            ? `${user?.role === 'admin' ? 'Administering Care for' : 'Curating care for'} ${currentPatient.name} (${currentPatient.email})`
            : 'Manage and review patient memories & safety'
        }
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {patients.length > 1 && (
              <select
                className="input"
                style={{ width: 'auto', padding: '8px 12px', fontSize: 14, borderRadius: 10, cursor: 'pointer' }}
                value={selectedPatientId || ''}
                onChange={(e) => loadPatientData(e.target.value)}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    👤 {p.name} ({p.email})
                  </option>
                ))}
              </select>
            )}
            {patients.length > 0 && (
              <button
                className="large-btn primary"
                onClick={() => onNavigate('upload')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>📤</span>
                <span>Upload Photo / Audio</span>
              </button>
            )}
          </div>
        }
      />

      {/* No patient linked yet */}
      {patients.length === 0 ? (
        <section style={{ marginTop: '2rem' }}>
          <div className="center-card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🔗</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--primary)' }}>Link a Patient</h3>
            <p className="muted" style={{ marginBottom: 24 }}>
              You are not linked to any patient yet. Enter the email address of the patient you want to care for.
            </p>
            {linkError && (
              <div style={{ color: '#c0392b', background: 'rgba(255,80,80,0.08)', padding: '10px 14px', borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,80,80,0.15)' }}>
                ⚠️ {linkError}
              </div>
            )}
            <label className="label" style={{ textAlign: 'left' }}>
              Patient Email
              <input
                className="input"
                placeholder="patient@example.com"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLink()}
                style={{ marginTop: 8 }}
              />
            </label>
            <button
              className="large-btn primary"
              onClick={handleLink}
              disabled={linkLoading || !patientEmail.trim()}
              style={{ width: '100%', marginTop: 16 }}
            >
              {linkLoading ? 'Linking…' : '🔗 Link Patient'}
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 20, marginBottom: 24 }}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: '16px 14px',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(91,110,246,0.08)',
                  boxShadow: '0 8px 20px rgba(91,110,246,0.06)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: STAT_COLORS[i], lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Navigation Tabs (Aligned with SRS 3.5 & Safety 5.2) */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 22, background: 'rgba(255,255,255,0.6)', padding: 6, borderRadius: 14, flexWrap: 'wrap' }}>
            {[
              { key: 'memories', label: '🖼️ Memory Curation & Safety' },
              { key: 'enrolled', label: '👥 Enrolled Faces & Keepsakes (FR-FRM-05)' },
              { key: 'reminders', label: '⏰ Care Reminders & Prompts (FR-CGD-03)' },
              { key: 'engagement', label: '📊 Engagement Analytics (FR-CGD-02)' },
              { key: 'alerts', label: `⚠️ Alerts & Notices ${alerts.length > 0 ? `(${alerts.length})` : ''}` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: activeTab === tab.key ? 'white' : 'transparent',
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--muted)',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: 14,
                  boxShadow: activeTab === tab.key ? '0 4px 12px rgba(91,110,246,0.1)' : 'none',
                  transition: 'all .15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Memories Curation with Distressing / Priority Flags */}
          {activeTab === 'memories' && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                  Curate patient memories. Flag distressing photos to protect patient comfort (Safety 5.2) or prioritize favorites in storytelling.
                </p>
                <button className="large-btn primary" onClick={() => onNavigate('upload')} style={{ fontSize: 13, padding: '8px 14px' }}>
                  ➕ Add New Memory
                </button>
              </div>

              {loading ? (
                <p style={{ color: 'var(--muted)', padding: 20 }}>Loading memories…</p>
              ) : memories.length === 0 ? (
                <div className="center-card">
                  <EmptyState title="No memories yet" subtitle="Upload photographs, videos, or voice recordings to begin." />
                </div>
              ) : (
                <div className="masonry">
                  {memories.map((m) => (
                    <article
                      key={m.id}
                      className="memory-tile"
                      style={{
                        position: 'relative',
                        border: m.distressing ? '2px solid #ef4444' : m.priority ? '2px solid #f59e0b' : undefined,
                      }}
                    >
                      {m.thumbnail || m.fileUrl ? (
                        <img src={m.thumbnail || m.fileUrl} alt={m.title} onError={(e) => (e.target.style.display = 'none')} />
                      ) : (
                        <div style={{ height: 180, background: 'rgba(91,110,246,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
                          {m.type === 'video' ? '🎥' : m.audioUrl ? '🎙️' : '🖼️'}
                        </div>
                      )}

                      <div className="memory-overlay" style={{ padding: 14 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span className="memory-tag">{m.type || 'photo'}</span>
                          {m.distressing && (
                            <span style={{ padding: '3px 8px', borderRadius: 999, background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 700 }}>
                              🚫 Distressing (Hidden from Patient)
                            </span>
                          )}
                          {m.priority && (
                            <span style={{ padding: '3px 8px', borderRadius: 999, background: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 700 }}>
                              ⭐ Priority Story
                            </span>
                          )}
                        </div>

                        <strong style={{ fontSize: '1rem', color: '#1d2433' }}>{m.title}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {m.date || 'Undated'} • {m.location || 'Home'}
                        </div>

                        {/* Caregiver Safety & Recommendation Controls */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleDistressing(m)
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: '1px solid',
                              borderColor: m.distressing ? '#ef4444' : 'rgba(16,24,40,0.12)',
                              background: m.distressing ? '#fef2f2' : '#fff',
                              color: m.distressing ? '#dc2626' : '#4b5563',
                              fontSize: 12,
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            title="Hide or show from patient"
                          >
                            {m.distressing ? 'Unflag Distressing' : '🚫 Flag Distressing'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTogglePriority(m)
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              border: '1px solid',
                              borderColor: m.priority ? '#f59e0b' : 'rgba(16,24,40,0.12)',
                              background: m.priority ? '#fffbeb' : '#fff',
                              color: m.priority ? '#b45309' : '#4b5563',
                              fontSize: 12,
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            title="Boost in recommendations"
                          >
                            {m.priority ? '★ Prioritized' : '☆ Prioritize'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteId(m.id)
                            }}
                            style={{
                              marginLeft: 'auto',
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              fontSize: 14,
                              cursor: 'pointer',
                              padding: '4px 8px',
                            }}
                            title="Permanently Delete Memory"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: Enrolled Faces & Keepsakes (FR-FRM-05) */}
          {activeTab === 'enrolled' && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Enrolled Faces & Personal Keepsakes</h3>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
                    Registered reference images recognized by the AI Camera Module (FR-FRM-02, FR-FRM-03).
                  </p>
                </div>
                <button className="large-btn primary" onClick={() => setShowAddEnrolled(true)} style={{ fontSize: 13, padding: '8px 16px' }}>
                  ➕ Enroll New Face / Keepsake
                </button>
              </div>

              {enrolled.length === 0 ? (
                <div className="center-card">
                  <EmptyState title="No enrolled entities yet" subtitle="Click the button above to register a family member or personal keepsake." />
                </div>
              ) : (
                <div className="people-grid">
                  {enrolled.map((item) => (
                    <article key={item.id} className="person-card large" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
                      <img
                        src={item.photo || (item.entityType === 'object' ? '/munnar.jpg' : '/anna.jpg')}
                        alt={item.name}
                        onError={(e) => (e.target.src = '/family-garden.jpg')}
                        style={{ width: 90, height: 90, borderRadius: 16, objectFit: 'cover' }}
                      />
                      <div className="person-body" style={{ flex: 1 }}>
                        <span className="person-tag" style={{ background: item.entityType === 'object' ? 'rgba(245,158,11,0.1)' : undefined, color: item.entityType === 'object' ? '#b45309' : undefined }}>
                          {item.entityType === 'object' ? `🎁 ${item.category || 'Keepsake'}` : `👤 ${item.relation || 'Family'}`}
                        </span>
                        <strong>{item.name}</strong>
                        {item.notes && <div className="muted" style={{ fontSize: 12 }}>{item.notes}</div>}
                        <button
                          onClick={() => handleDeleteEnrolled(item.id)}
                          style={{
                            marginTop: 8,
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: 12,
                            cursor: 'pointer',
                            padding: 0,
                            fontWeight: 600,
                          }}
                        >
                          Remove from Registry
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 3: Care Reminders & Prompts (FR-CGD-03) */}
          {activeTab === 'reminders' && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Scheduled Care Prompts & Reminders</h3>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
                    Configure friendly, reassuring verbal prompts and daily care routines (FR-CGD-03).
                  </p>
                </div>
                <button className="large-btn primary" onClick={() => setShowAddReminder(true)} style={{ fontSize: 13, padding: '8px 16px' }}>
                  ➕ Add Care Reminder
                </button>
              </div>

              {reminders.length === 0 ? (
                <div className="center-card">
                  <EmptyState title="No reminders scheduled" subtitle="Add a gentle reminder for hydration, medicine, or family time." />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reminders.map((rem) => (
                    <div
                      key={rem.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: 16,
                        border: '1px solid rgba(91,110,246,0.1)',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 28 }}>⏰</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <strong style={{ fontSize: 16, color: '#1d2433' }}>{rem.title}</strong>
                            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(91,110,246,0.1)', color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>
                              {rem.time}
                            </span>
                          </div>
                          {rem.message && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>"{rem.message}"</div>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: 13,
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 4: Engagement Analytics (FR-CGD-02) */}
          {activeTab === 'engagement' && (
            <section>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Patient Engagement & Cognitive Stimulation History</h3>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
                  Audited interactions, memories revisited, and spoken prompts utilized (FR-CGD-02).
                </p>
              </div>

              {engagement ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div style={{ padding: 18, background: '#fff', borderRadius: 16, border: '1px solid rgba(91,110,246,0.1)' }}>
                      <span className="muted" style={{ fontSize: 12 }}>Total Memory Accesses</span>
                      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                        {engagement.summary?.totalMemoriesAccessed || 0}
                      </div>
                    </div>
                    <div style={{ padding: 18, background: '#fff', borderRadius: 16, border: '1px solid rgba(91,110,246,0.1)' }}>
                      <span className="muted" style={{ fontSize: 12 }}>Spoken Audio Plays</span>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                        {engagement.summary?.voiceInteractions || 0}
                      </div>
                    </div>
                    <div style={{ padding: 18, background: '#fff', borderRadius: 16, border: '1px solid rgba(91,110,246,0.1)' }}>
                      <span className="muted" style={{ fontSize: 12 }}>Cognitive Status</span>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>
                        {engagement.summary?.stimulationLevel || 'Active'}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Log */}
                  <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid rgba(91,110,246,0.08)' }}>
                    <h4 style={{ margin: '0 0 14px', color: '#1d2433' }}>Recent Patient Activity Log</h4>
                    {engagement.summary?.recentLogs?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {engagement.summary.recentLogs.map((log, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: 10,
                              background: 'rgba(91,110,246,0.03)',
                              fontSize: 13,
                            }}
                          >
                            <div>
                              <strong>{log.memoryTitle || 'Memory'}</strong>
                              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>({log.type})</span>
                            </div>
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted" style={{ fontSize: 13 }}>No recent activity logged yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="muted">Loading engagement metrics…</p>
              )}
            </section>
          )}

          {/* TAB 5: Safety Alerts & Unrecognized Notifications (FR-CGD-05) */}
          {activeTab === 'alerts' && (
            <section>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Recognition Alerts & Unrecognized Visitor Notices</h3>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
                  Real-time alerts triggered when an unrecognized face/keepsake is presented to the camera (FR-FRM-06, FR-CGD-05).
                </p>
              </div>

              {alerts.length === 0 ? (
                <div className="center-card">
                  <div style={{ fontSize: 44, marginBottom: 8 }}>🛡️</div>
                  <h3 style={{ margin: '0 0 6px', color: '#10b981' }}>All Clear!</h3>
                  <p className="muted" style={{ fontSize: 14 }}>No pending unrecognized scans or safety alerts.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {alerts.map((al) => (
                    <div
                      key={al.id}
                      style={{
                        padding: '16px 20px',
                        background: '#fff',
                        borderRadius: 16,
                        border: '1px solid rgba(239,68,68,0.25)',
                        boxShadow: '0 6px 18px rgba(239,68,68,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 32 }}>⚠️</span>
                        <div>
                          <strong style={{ color: '#dc2626', fontSize: 15, display: 'block' }}>
                            {al.title || 'Unrecognized Face / Object Scanned'}
                          </strong>
                          <span style={{ fontSize: 13, color: '#4b5563' }}>
                            {al.message} • {new Date(al.timestamp || al.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="large-btn primary"
                          onClick={() => {
                            setActiveTab('enrolled')
                            setShowAddEnrolled(true)
                          }}
                          style={{ fontSize: 13, padding: '8px 14px' }}
                        >
                          Enroll Person
                        </button>
                        <button
                          className="large-btn secondary"
                          onClick={() => handleResolveAlert(al.id)}
                          style={{ fontSize: 13, padding: '8px 14px' }}
                        >
                          Dismiss Alert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Modal: Enroll New Face / Keepsake (FR-FRM-05) */}
      {showAddEnrolled && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 14px', color: 'var(--primary)' }}>Enroll New Face or Keepsake</h3>
            <form onSubmit={handleSaveEnrolled}>
              <label className="label">
                Entity Type
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="radio"
                      name="etype"
                      checked={enrolledForm.entityType === 'face'}
                      onChange={() => setEnrolledForm((f) => ({ ...f, entityType: 'face' }))}
                    />
                    👤 Person / Family Face
                  </label>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="radio"
                      name="etype"
                      checked={enrolledForm.entityType === 'object'}
                      onChange={() => setEnrolledForm((f) => ({ ...f, entityType: 'object' }))}
                    />
                    🎁 Personal Keepsake / Object
                  </label>
                </div>
              </label>

              <label className="label" style={{ marginTop: 12 }}>
                Name / Label <span style={{ color: '#dc2626' }}>*</span>
                <input
                  className="input"
                  placeholder={enrolledForm.entityType === 'face' ? 'e.g. Maya (Granddaughter)' : 'e.g. Silver Pocket Watch'}
                  value={enrolledForm.name}
                  onChange={(e) => setEnrolledForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>

              {enrolledForm.entityType === 'face' ? (
                <label className="label" style={{ marginTop: 12 }}>
                  Relationship
                  <input
                    className="input"
                    placeholder="e.g. Daughter, Brother, Family Doctor"
                    value={enrolledForm.relation}
                    onChange={(e) => setEnrolledForm((f) => ({ ...f, relation: e.target.value }))}
                  />
                </label>
              ) : (
                <label className="label" style={{ marginTop: 12 }}>
                  Keepsake Category
                  <input
                    className="input"
                    placeholder="e.g. Heirlooms, Souvenir, Photo Album"
                    value={enrolledForm.category}
                    onChange={(e) => setEnrolledForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </label>
              )}

              <label className="label" style={{ marginTop: 12 }}>
                Notes / Recall Context
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Context that helps the patient remember this person or object..."
                  value={enrolledForm.notes}
                  onChange={(e) => setEnrolledForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>

              <label className="label" style={{ marginTop: 12 }}>
                Reference Photo URL (Optional)
                <input
                  className="input"
                  placeholder="e.g. /anna.jpg or web image URL"
                  value={enrolledForm.photo}
                  onChange={(e) => setEnrolledForm((f) => ({ ...f, photo: e.target.value }))}
                />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button type="button" className="large-btn secondary" onClick={() => setShowAddEnrolled(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="large-btn primary" disabled={savingEnrolled} style={{ flex: 1 }}>
                  {savingEnrolled ? 'Enrolling…' : '✓ Save to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Care Reminder (FR-CGD-03) */}
      {showAddReminder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 14px', color: 'var(--primary)' }}>Add Daily Care Reminder</h3>
            <form onSubmit={handleSaveReminder}>
              <label className="label">
                Scheduled Time
                <input
                  className="input"
                  placeholder="e.g. 09:30 AM or 05:00 PM"
                  value={reminderForm.time}
                  onChange={(e) => setReminderForm((f) => ({ ...f, time: e.target.value }))}
                  required
                />
              </label>

              <label className="label" style={{ marginTop: 12 }}>
                Reminder Title <span style={{ color: '#dc2626' }}>*</span>
                <input
                  className="input"
                  placeholder="e.g. Drink a glass of fresh water"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </label>

              <label className="label" style={{ marginTop: 12 }}>
                Spoken Reassurance Message
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Gentle voice prompt read aloud to the patient..."
                  value={reminderForm.prompt}
                  onChange={(e) => setReminderForm((f) => ({ ...f, prompt: e.target.value }))}
                />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button type="button" className="large-btn secondary" onClick={() => setShowAddReminder(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="large-btn primary" disabled={savingReminder} style={{ flex: 1 }}>
                  {savingReminder ? 'Saving…' : '✓ Schedule Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Memory Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 380, textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 10px' }}>Delete Memory?</h3>
            <p className="muted" style={{ marginBottom: 24 }}>This action cannot be undone. The memory and its files will be permanently deleted.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="large-btn secondary" onClick={() => setDeleteId(null)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                className="large-btn"
                onClick={() => handleDeleteMemory(deleteId)}
                disabled={deleting}
                style={{ flex: 1, background: 'linear-gradient(90deg, #ff6b6b, #ff4757)', color: 'white' }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
