import React, { useEffect, useState } from 'react'
import { api, speakText } from '../api'
import { useNavigate } from 'react-router-dom'

export default function MemoryDetails({ memory, onBack }) {
  const navigate = useNavigate()
  const [isFavorite, setIsFavorite] = useState(memory.favorite || false)
  const [isNarrating, setIsNarrating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [narration, setNarration] = useState(memory.narration || null)
  const [relatedMemories, setRelatedMemories] = useState([])
  const [togglingFav, setTogglingFav] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    document.body.classList.add('bg-memory')
    return () => {
      document.body.classList.remove('bg-memory')
      try {
        window.speechSynthesis?.cancel()
        window._speechUtterances = []
      } catch (err) {}
    }
  }, [])

  // Sync state whenever viewing a different memory
  useEffect(() => {
    setIsFavorite(memory.favorite || false)
    setNarration(memory.narration || null)
    setIsPlaying(false)
    try {
      window.speechSynthesis?.cancel()
      window._speechUtterances = []
    } catch (err) {}

    // Track memory access engagement (FR-CGD-02)
    if (memory?.id) {
      api.memories.engage(memory.id, 'view').catch(() => {})
    }
  }, [memory.id, memory.narration, memory.favorite])

  // Load related memories (same location or same people)
  useEffect(() => {
    api.memories.list()
      .then(data => {
        const all = data.memories || []
        const related = all
          .filter(m => m.id !== memory.id)
          .filter(m =>
            (m.location && m.location === memory.location) ||
            (m.people?.length && memory.people?.some(pid => m.people.includes(pid)))
          )
          .slice(0, 4)
        setRelatedMemories(related)
      })
      .catch(() => {})
  }, [memory.id])

  async function handleToggleFavorite() {
    setTogglingFav(true)
    try {
      const result = await api.memories.toggleFavorite(memory.id)
      setIsFavorite(result.favorite)
    } catch (e) {
      console.error('Failed to toggle favorite', e)
    } finally {
      setTogglingFav(false)
    }
  }

  function handleStopSpeech() {
    try {
      window.speechSynthesis?.cancel()
      window._speechUtterances = []
    } catch (e) {}
    setIsPlaying(false)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      handleStopSpeech()
      await api.memories.delete(memory.id)
      if (onBack) onBack()
      else navigate('/memories')
    } catch (err) {
      alert('Failed to delete memory: ' + (err.message || 'Unknown error'))
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  async function handleNarrate() {
    if (isPlaying) {
      handleStopSpeech()
      return
    }

    let textToSpeak = narration
    if (!textToSpeak) {
      setIsNarrating(true)
      try {
        const data = await api.memories.narrate(memory.id)
        textToSpeak = data.text
        setNarration(data.text)
      } catch (e) {
        textToSpeak = memory.description || memory.title || 'No description available for this memory.'
        setNarration(textToSpeak)
      } finally {
        setIsNarrating(false)
      }
    }

    if (textToSpeak) {
      speakText(textToSpeak, {
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      })
    }
  }

  const mediaUrl = memory.thumbnail || memory.fileUrl || memory.photos?.[0]?.url

  return (
    <div className="memory-details" style={{ maxWidth: 800, margin: '0 auto' }}>
      <button className="nav-btn" onClick={onBack} style={{ marginBottom: 18 }}>← Back to Gallery</button>

      {/* Media */}
      <div className="media" style={{ marginBottom: 22, borderRadius: 18, overflow: 'hidden', boxShadow: '0 16px 40px rgba(16,24,40,0.1)' }}>
        {memory.type === 'video' && memory.videoUrl ? (
          <video
            src={memory.videoUrl}
            controls
            style={{ width: '100%', maxHeight: 420, display: 'block', background: '#000' }}
          />
        ) : mediaUrl ? (
          <img
            src={mediaUrl}
            alt={memory.title}
            style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(91,110,246,0.06)', fontSize: 60 }}>
            🖼️
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.7rem', color: '#1d2433' }}>{memory.title}</h2>
          <div className="muted" style={{ marginTop: 6, fontSize: 15 }}>
            {memory.date && <span>📅 {memory.date}</span>}
            {memory.date && memory.location && <span> &nbsp;•&nbsp; </span>}
            {memory.location && <span>📍 {memory.location}</span>}
          </div>
        </div>
        <button
          onClick={handleToggleFavorite}
          disabled={togglingFav}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 28, transition: 'transform .15s ease',
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Tags */}
      {memory.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
          {memory.tags.map(tag => (
            <span key={tag} style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(91,110,246,0.08)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {memory.description && (
        <p style={{ fontSize: 16, lineHeight: 1.75, color: '#384355', background: 'rgba(255,255,255,0.7)', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(16,24,40,0.06)', margin: '16px 0' }}>
          {memory.description}
        </p>
      )}

      {/* Familiar Voice Recording (FR-VIM-04) */}
      {memory.audioUrl && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.7), rgba(253, 230, 138, 0.5))',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 16, padding: '18px 22px', margin: '16px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>🎙️</span>
            <div>
              <strong style={{ color: '#92400e', fontSize: 15, display: 'block' }}>
                Familiar Voice Recording (Family Member)
              </strong>
              <span style={{ fontSize: 13, color: '#b45309' }}>
                A comforting audio message recorded specifically for this memory.
              </span>
            </div>
          </div>
          <audio
            controls
            src={memory.audioUrl}
            onPlay={() => api.memories.engage(memory.id, 'voice_play').catch(() => {})}
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>
      )}

      {/* AI Narration output */}
      {narration && (
        <div style={{
          background: isPlaying ? 'linear-gradient(135deg, rgba(91,110,246,0.12), rgba(139,227,199,0.12))' : 'linear-gradient(135deg, rgba(91,110,246,0.06), rgba(139,227,199,0.06))',
          border: isPlaying ? '2px solid var(--primary)' : '1px solid rgba(91,110,246,0.15)',
          borderRadius: 16, padding: '18px 22px', margin: '16px 0',
          boxShadow: isPlaying ? '0 12px 30px rgba(91,110,246,0.15)' : 'none',
          transition: 'all .25s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{isPlaying ? '🔊' : '✨'}</span>
            <strong style={{ color: 'var(--primary)', fontSize: 15 }}>
              {isPlaying ? 'Voice Narration is Speaking…' : 'AI Voice Narration'}
            </strong>
            {isPlaying && (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e53e3e', fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e53e3e', display: 'inline-block' }} />
                Playing Audio
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.75, color: '#2d3748', fontStyle: 'italic' }}>
            "{narration}"
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
        <button
          className="large-btn primary"
          onClick={handleNarrate}
          disabled={isNarrating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: isPlaying ? 'linear-gradient(90deg, #ff6b6b, #ff8e53)' : undefined,
            boxShadow: isPlaying ? '0 10px 24px rgba(255,107,107,0.3)' : undefined
          }}
        >
          {isNarrating
            ? '⏳ Generating…'
            : isPlaying
              ? '⏹ Stop Voice Narration'
              : narration
                ? '🔊 Play Voice Narration'
                : '✨ Narrate Memory'}
        </button>

        {isPlaying && (
          <button className="large-btn secondary" onClick={handleStopSpeech} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ⏸ Pause / Stop
          </button>
        )}

        <button
          className="large-btn"
          style={{ background: isFavorite ? 'rgba(255,80,80,0.08)' : undefined }}
          onClick={handleToggleFavorite}
          disabled={togglingFav}
        >
          {isFavorite ? '❤️ Favourited' : '🤍 Add to Favourites'}
        </button>

        <button
          className="large-btn"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#dc2626',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginLeft: 'auto'
          }}
          onClick={() => setShowDeleteModal(true)}
        >
          🗑️ Delete Memory
        </button>
      </div>

      {/* Guided Verbal Memory Prompts (FR-VIM-05) */}
      <div style={{
        marginTop: 24,
        padding: '20px 22px',
        borderRadius: 18,
        background: 'rgba(255, 255, 255, 0.75)',
        border: '1px solid rgba(91, 110, 246, 0.12)',
        boxShadow: '0 8px 24px rgba(91, 110, 246, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>💡</span>
          <div>
            <strong style={{ color: 'var(--primary)', fontSize: 15, display: 'block' }}>
              Guided Memory Prompts (Gentle Recall)
            </strong>
            <span className="muted" style={{ fontSize: 13 }}>
              Click any prompt to listen to it read softly to help gently spark personal recall.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            `Do you remember what made "${memory.title}" such a happy occasion?`,
            memory.location ? `How did it feel when we spent time at ${memory.location}?` : `Do you remember who was standing closest to you in this picture?`,
            `Take all the time you need. What warm thought or memory comes to you first?`,
          ].map((prompt, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(91, 110, 246, 0.04)',
                border: '1px solid rgba(91, 110, 246, 0.08)',
              }}
            >
              <span style={{ fontSize: 14, color: '#374151' }}>{prompt}</span>
              <button
                className="large-btn secondary"
                onClick={() => {
                  speakText(prompt)
                  api.memories.engage(memory.id, 'guided_prompt').catch(() => {})
                }}
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
                title="Hear prompt spoken aloud"
              >
                <span>🔊</span>
                <span>Read Aloud</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Additional photos */}
      {memory.photos?.length > 1 && (
        <section style={{ marginTop: 28 }}>
          <h3 style={{ marginBottom: 12, color: 'var(--primary)' }}>All Photos ({memory.photos.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {memory.photos.map((ph, i) => (
              <img
                key={i}
                src={ph.url}
                alt={`Photo ${i + 1}`}
                style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, cursor: 'pointer' }}
                onClick={() => window.open(ph.url, '_blank')}
              />
            ))}
          </div>
        </section>
      )}

      {/* Related Memories */}
      {relatedMemories.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 14, color: 'var(--primary)' }}>Related Memories</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {relatedMemories.map(m => (
              <article
                key={m.id}
                className="memory-tile"
                onClick={() => navigate(`/memory/${m.id}`)}
                style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden' }}
              >
                {m.thumbnail ? (
                  <img src={m.thumbnail} alt={m.title} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ height: 130, background: 'rgba(91,110,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🖼️</div>
                )}
                <div className="memory-overlay">
                  <strong style={{ fontSize: 13 }}>{m.title}</strong>
                  <div className="muted" style={{ fontSize: 11 }}>{m.date}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
              Are you sure you want to permanently delete <strong>"{memory.title}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="large-btn secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="large-btn"
                onClick={handleDelete}
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

      <div style={{ height: 40 }} />
    </div>
  )
}
