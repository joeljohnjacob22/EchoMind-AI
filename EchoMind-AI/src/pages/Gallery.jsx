import React, { useState, useEffect } from 'react'
import { api } from '../api'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useNavigate } from 'react-router-dom'

const FILTERS = ['All', 'photo', 'video', 'audio', 'Favorites']

export default function Gallery({ onOpenMemory }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add('bg-gallery')
    api.memories.list()
      .then(data => setMemories(data.memories || []))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => document.body.classList.remove('bg-gallery')
  }, [])

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.memories.delete(deleteTarget.id)
      setMemories(prev => prev.filter(m => m.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      alert('Failed to delete memory: ' + (err.message || 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  const filtered = memories.filter(m => {
    const matchQuery = m.title.toLowerCase().includes(query.toLowerCase()) ||
      (m.location || '').toLowerCase().includes(query.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(query.toLowerCase())
    const matchFilter = activeFilter === 'All'
      ? true
      : activeFilter === 'Favorites'
        ? m.favorite
        : m.type === activeFilter
    return matchQuery && matchFilter
  })

  return (
    <PageLayout>
      <PageHeader
        title="Memory Gallery"
        subtitle={`${memories.length} memories • Browse photos, videos and audio`}
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              aria-label="search"
              placeholder="🔍 Search memories…"
              className="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ minWidth: 200 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <span>📤</span>
              <span>Add Photos from Device</span>
            </button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid',
              borderColor: activeFilter === f ? 'var(--primary)' : 'rgba(16,24,40,0.08)',
              background: activeFilter === f ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
              color: activeFilter === f ? '#fff' : 'var(--muted)',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: activeFilter === f ? 700 : 400,
              transition: 'all .15s ease',
            }}
          >
            {f === 'photo' ? '📷 Photos' : f === 'video' ? '🎥 Videos' : f === 'audio' ? '🎵 Audio' : f === 'Favorites' ? '❤️ Favorites' : '🗂 All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
          Loading memories…
        </div>
      ) : filtered.length === 0 ? (
        <div className="center-card">
          <EmptyState
            title={query ? 'No results found' : 'No memories yet'}
            subtitle={query ? 'Try a different search term or upload a new photo' : 'Upload photos or videos from your local device storage to get started'}
            action={
              <button
                className="btn btn-primary"
                onClick={() => navigate('/upload')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600 }}
              >
                <span>📤</span>
                <span>Upload Photos from Device</span>
              </button>
            }
          />
        </div>
      ) : (
        <div className="masonry">
          {filtered.map(m => (
            <article
              key={m.id}
              className="memory-card masonry-item memory-tile"
              onClick={() => onOpenMemory(m)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <button
                type="button"
                aria-label={`Delete ${m.title}`}
                title="Delete memory"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget(m)
                }}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  cursor: 'pointer',
                  zIndex: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  transition: 'all .15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#fee2e2'
                  e.currentTarget.style.transform = 'scale(1.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                🗑️
              </button>

              {m.thumbnail || m.fileUrl ? (
                <img
                  src={m.thumbnail || m.fileUrl}
                  alt={m.title}
                  loading="lazy"
                  onError={e => {
                    e.target.style.display = 'none'
                    e.target.nextSibling?.removeAttribute('style')
                  }}
                />
              ) : (
                <div style={{ height: 200, background: 'linear-gradient(135deg, rgba(91,110,246,0.1), rgba(139,227,199,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>
                  {m.type === 'video' ? '🎥' : m.type === 'audio' ? '🎵' : '🖼️'}
                </div>
              )}
              <div className="memory-overlay">
                <span className="memory-tag">{m.type || 'photo'}{m.favorite ? ' ❤️' : ''}</span>
                <strong>{m.title}</strong>
                <div className="muted">{m.date}{m.location ? ` • ${m.location}` : ''}</div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'white', borderRadius: 24, padding: 32, maxWidth: 420, width: '90%',
            textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 10px', fontSize: 22, color: '#1d2433' }}>Delete Memory?</h3>
            <p className="muted" style={{ marginBottom: 24, fontSize: 15, lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="large-btn secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="large-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  background: 'linear-gradient(90deg, #ff4d4f, #d9363e)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
