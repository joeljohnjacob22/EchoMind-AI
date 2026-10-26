import React, { useEffect, useState, useRef } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'

export default function Upload({ onDone }) {
  const { user } = useAuth()
  const isStaff = user?.role === 'caregiver' || user?.role === 'admin'

  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [audioFile, setAudioFile] = useState(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const audioInputRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('bg-upload')
    return () => document.body.classList.remove('bg-upload')
  }, [])

  // Create previews when files change
  useEffect(() => {
    if (!files.length) { setPreviews([]); return }
    const urls = files.map(f => ({
      url: URL.createObjectURL(f),
      name: f.name,
      type: f.type.startsWith('video') ? 'video' : 'image',
    }))
    setPreviews(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u.url))
  }, [files])

  function handleFiles(selected) {
    setError(null)
    const validFiles = Array.from(selected).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    if (!validFiles.length) {
      setError('Please select image or video files only.')
      return
    }
    setFiles(validFiles)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  async function handleUpload() {
    if ((!files.length && !audioFile) || !title.trim()) {
      setError('Please provide at least a photo, video, or voice recording, along with a title.')
      return
    }

    setLoading(true)
    setError(null)
    setProgress(10)

    try {
      const formData = new FormData()
      files.forEach(f => formData.append('photos', f))
      if (audioFile) {
        formData.append('audio', audioFile)
      }
      formData.append('title', title.trim())
      if (date) formData.append('date', date)
      if (location) formData.append('location', location.trim())
      if (description) formData.append('description', description.trim())

      const mediaType = files[0]?.type?.startsWith('video') ? 'video' : files.length ? 'photo' : 'audio'
      formData.append('type', mediaType)

      setProgress(40)
      await api.memories.create(formData)
      setProgress(100)
      setSuccess(true)

      // Reset form
      setTitle('')
      setDate('')
      setLocation('')
      setDescription('')
      setFiles([])
      setAudioFile(null)

      setTimeout(() => {
        setSuccess(false)
        onDone()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to upload memory. Please try again.')
      setProgress(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={isStaff ? `Add Memory (${user?.role === 'admin' ? 'Admin Portal' : 'Caregiver Portal'})` : 'Upload Photo / Memory'}
        subtitle={isStaff ? 'Uploading to patient memory collection — with safety filters and optional familiar voice prompt' : 'Add photos or videos from your computer, phone, or local storage'}
        onBack={onDone}
      />

      <div style={{ maxWidth: 640, margin: '24px auto 0' }}>
        {isStaff && (
          <div style={{
            background: user?.role === 'admin' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            border: `1px solid ${user?.role === 'admin' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
            borderRadius: 12,
            padding: '10px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: user?.role === 'admin' ? '#b91c1c' : '#047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>
              <strong>{user?.role === 'admin' ? '🛡️ Admin Account' : '🏥 Caregiver Account'}:</strong> You are adding this memory to the patient profile. You remain securely signed in as <strong>{user?.email}</strong>.
            </span>
          </div>
        )}

        {error && (
          <div style={{ color: '#c0392b', background: 'rgba(255,80,80,0.08)', padding: '12px 16px', borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,80,80,0.15)' }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ color: '#217a3e', background: 'rgba(33,122,62,0.08)', padding: '12px 16px', borderRadius: 10, marginBottom: 16, border: '1px solid rgba(33,122,62,0.18)', fontSize: 15, fontWeight: 600 }}>
            {isStaff
              ? `✅ Memory saved to patient profile! Returning to ${user?.role === 'admin' ? 'Admin Portal' : 'Caregiver Dashboard'}…`
              : '✅ Memory uploaded successfully! Opening your memories…'}
          </div>
        )}

        {/* Drag & Drop zone */}
        <div
          className="upload-box"
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--primary)' : files.length ? 'rgba(33,122,62,0.4)' : 'rgba(91,110,246,0.3)'}`,
            background: isDragging ? 'rgba(91,110,246,0.06)' : 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            transition: 'all .2s ease',
            marginBottom: 24,
            padding: '36px 20px',
            textAlign: 'center',
            borderRadius: 16,
          }}
        >
          {previews.length > 0 ? (
            <div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
                {previews.slice(0, 4).map((p, i) => (
                  p.type === 'video' ? (
                    <video key={i} src={p.url} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} muted />
                  ) : (
                    <img key={i} src={p.url} alt={p.name} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} />
                  )
                ))}
                {previews.length > 4 && (
                  <div style={{ width: 120, height: 90, borderRadius: 8, background: 'rgba(91,110,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--primary)', fontWeight: 700 }}>
                    +{previews.length - 4}
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--primary)', fontWeight: 600, margin: '0 0 6px' }}>
                ✓ {files.length} file{files.length !== 1 ? 's' : ''} selected from local storage
              </p>
              <span className="btn btn-secondary" style={{ fontSize: 13, padding: '4px 12px' }}>
                Change photos
              </span>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 52, marginBottom: 12 }}>💻 📁 📸</div>
              <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#1d2433' }}>
                {isDragging ? 'Drop your photos here!' : 'Choose Photos from Local Storage'}
              </p>
              <p className="muted" style={{ margin: '0 0 16px', fontSize: 14 }}>
                Select files stored on your computer or phone — JPG, PNG, WEBP, MP4
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ pointerEvents: 'none', padding: '10px 20px', fontSize: 14, fontWeight: 600 }}
              >
                📁 Browse Local Files
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={e => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>

        {/* Upload progress bar */}
        {loading && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(91,110,246,0.1)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--primary), var(--accent-2))', borderRadius: 999, transition: 'width .3s ease' }} />
            </div>
          </div>
        )}

        {/* Form */}
        <div className="center-card" style={{ textAlign: 'left', padding: 28 }}>
          <h3 style={{ margin: '0 0 20px', color: 'var(--primary)' }}>Memory Details</h3>

          <div className="form">
            <label className="label">
              Title <span style={{ color: '#c0392b' }}>*</span>
              <input
                className="input"
                placeholder="e.g. Summer Vacation in Munnar"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ marginTop: 8 }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
              <label className="label">
                Date
                <input
                  type="date"
                  className="input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              </label>
              <label className="label">
                Location
                <input
                  className="input"
                  placeholder="e.g. Munnar, Kerala"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              </label>
            </div>

            <label className="label" style={{ marginTop: 4 }}>
              Description / Story
              <textarea
                className="input"
                rows="4"
                placeholder="Share the story behind this memory — who was there, what happened, how it felt…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ marginTop: 8, resize: 'vertical' }}
              />
            </label>

            {/* Familiar Voice Recording (FR-MCM-01, FR-VIM-04) */}
            <div style={{ marginTop: 16, padding: '16px', background: 'rgba(91,110,246,0.04)', borderRadius: 14, border: '1px solid rgba(91,110,246,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontSize: 14, color: 'var(--primary)' }}>
                  🎙️ Familiar Voice Recording (Optional)
                </strong>
                {audioFile && (
                  <button
                    type="button"
                    onClick={() => setAudioFile(null)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Remove audio
                  </button>
                )}
              </div>
              <p className="muted" style={{ fontSize: 12, margin: '0 0 10px' }}>
                Upload an audio message from a loved one or family member to play back for comforting voice recognition.
              </p>

              {audioFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <audio controls src={URL.createObjectURL(audioFile)} style={{ height: 36, width: '100%' }} />
                </div>
              ) : (
                <button
                  type="button"
                  className="large-btn secondary"
                  onClick={() => audioInputRef.current?.click()}
                  style={{ fontSize: 13, padding: '8px 16px', width: 'auto' }}
                >
                  📁 Select Audio File (MP3, WAV, M4A)
                </button>
              )}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={e => setAudioFile(e.target.files[0] || null)}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button
                className="large-btn primary"
                onClick={handleUpload}
                disabled={loading || success}
                style={{ flex: 1 }}
              >
                {loading ? `Uploading… ${progress}%` : success ? (isStaff ? '✓ Saved to Patient Profile!' : '✓ Uploaded!') : isStaff ? '📤 Upload & Save to Patient Profile' : '📤 Upload & Save Memory'}
              </button>
              <button className="large-btn secondary" onClick={onDone} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
