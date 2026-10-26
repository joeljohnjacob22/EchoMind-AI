import React, { useEffect, useState } from 'react'
import { api, speakText } from '../api'
import HeroCarousel from '../components/HeroCarousel'
import PageLayout from '../components/PageLayout'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const rotatingWords = ['Reconnect', 'Remember', 'Celebrate', 'Cherish']

const quoteCards = [
  { text: '"Every memory is a quiet story waiting to be heard again."' },
  { text: '"A gentle reminder that love never really leaves us."' },
  { text: '"Small moments become lasting comfort when shared with care."' },
]

export default function Dashboard({ onOpenMemory }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [memories, setMemories] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [narrativeTheme, setNarrativeTheme] = useState('Daily Reflection')
  const [narrativePrompt, setNarrativePrompt] = useState('Gentle memories curated for this moment.')
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeWord, setActiveWord] = useState(0)

  // Interactive Storytelling State (FR-REC-01, FR-REC-02)
  const [isStoryPlaying, setIsStoryPlaying] = useState(false)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)

  useEffect(() => {
    document.body.classList.add('bg-dashboard')

    // Fetch memories, recommendations, and active reminders in parallel
    Promise.all([
      api.memories.list({ limit: 12 }),
      api.memories.recommendations().catch(() => ({ recommendations: [] })),
      api.caregiver.reminders().catch(() => ({ reminders: [] })),
    ])
      .then(([memData, recData, remData]) => {
        setMemories(memData.memories || [])
        if (recData?.recommendations?.length > 0) {
          setRecommendations(recData.recommendations)
          setNarrativeTheme(recData.narrativeTheme || 'Daily Reflection')
          setNarrativePrompt(recData.promptText || 'Moments from your life to bring peace and familiarity.')
        }
        setReminders(remData?.reminders || [])
      })
      .catch((err) => console.error('Dashboard data load error:', err))
      .finally(() => setLoading(false))

    return () => {
      document.body.classList.remove('bg-dashboard')
      try {
        window.speechSynthesis?.cancel()
        window._speechUtterances = []
      } catch {}
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWord((w) => (w + 1) % rotatingWords.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  const now = new Date()
  const displayMemories = recommendations.length > 0 ? recommendations : memories
  const activeStoryMemory = displayMemories[currentStoryIndex] || displayMemories[0]

  // Storytelling player controller
  function playStoryStep(index) {
    if (!displayMemories.length) return
    const mem = displayMemories[index]
    if (!mem) return

    setCurrentStoryIndex(index)
    setIsStoryPlaying(true)

    // Track engagement
    api.memories.engage(mem.id, 'storytelling').catch(() => {})

    const speechText = mem.narration || mem.description || `Here is a memory titled ${mem.title} from ${mem.date || 'the past'}.`
    speakText(speechText, {
      onEnd: () => {
        // Automatically proceed to next memory if still in story mode
        if (index + 1 < displayMemories.length) {
          setTimeout(() => {
            playStoryStep(index + 1)
          }, 1400)
        } else {
          setIsStoryPlaying(false)
        }
      },
      onError: () => setIsStoryPlaying(false),
    })
  }

  function handleStopStory() {
    try {
      window.speechSynthesis?.cancel()
      window._speechUtterances = []
    } catch {}
    setIsStoryPlaying(false)
  }

  function handleSpeakReminder(rem) {
    const msg = `Gentle reminder for you: ${rem.title}. ${rem.message || ''}`
    speakText(msg)
  }

  return (
    <PageLayout>
      <div className="dashboard-shell" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Active Reminders Banner (FR-CGD-03) */}
        {reminders.length > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(253, 230, 138, 0.85))',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 20,
              padding: '16px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 32 }}>⏰</span>
              <div>
                <strong style={{ fontSize: 16, color: '#92400e', display: 'block' }}>
                  Care Schedule & Reminders
                </strong>
                <span style={{ fontSize: 14, color: '#78350f' }}>
                  {reminders[0].time} • {reminders[0].title}
                  {reminders[0].message ? ` — ${reminders[0].message}` : ''}
                </span>
              </div>
            </div>
            <button
              className="large-btn"
              onClick={() => handleSpeakReminder(reminders[0])}
              style={{
                background: '#f59e0b',
                color: '#fff',
                fontSize: 14,
                padding: '10px 16px',
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>🔊</span>
              <span>Hear Reminder</span>
            </button>
          </div>
        )}

        {/* Hero Banner */}
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <div className="eyebrow">EchoMind-AI • Cognitive Memory Care</div>
            <h1>
              Bring the past back to life with{' '}
              <span className="word-rotator" aria-live="polite">
                <span className="rotating-word" key={activeWord}>{rotatingWords[activeWord]}</span>
              </span>
            </h1>
            <p className="lead">
              A multimedia memory reconstruction system designed to stimulate recall, recognize familiar
              faces & keepsakes, and create calm, comforting moments every day.
            </p>
            <div className="hero-actions">
              <button className="large-btn primary" onClick={() => navigate('/recognize')}>
                📷 Live Scanner
              </button>
              <button className="large-btn secondary" onClick={() => navigate('/timeline')}>
                ⏳ Life Timeline
              </button>
              <button className="large-btn secondary" onClick={() => navigate('/memories')}>
                🖼️ All Memories
              </button>
              <button className="large-btn secondary" onClick={() => navigate('/assistant')}>
                ✨ AI Voice
              </button>
            </div>
          </div>

          <div className="dashboard-hero-visual">
            <div className="mini-well">
              <div className="mini-header">
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,var(--primary),#7b9bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  🧠
                </div>
                <div>
                  <strong>Today's Reflection</strong>
                  <span>{now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
              <div className="mini-feature">
                {activeStoryMemory ? (
                  <>
                    <div className="mini-card-image" style={{ cursor: 'pointer' }} onClick={() => onOpenMemory && onOpenMemory(activeStoryMemory)}>
                      <img src={activeStoryMemory.thumbnail} alt={activeStoryMemory.title} onError={(e) => (e.target.src = '/family-garden.jpg')} />
                    </div>
                    <div className="mini-card-copy">
                      <label>Featured Moment</label>
                      <h3>{activeStoryMemory.title}</h3>
                      <p>{activeStoryMemory.date} • {activeStoryMemory.location || 'Home'}</p>
                    </div>
                  </>
                ) : (
                  <div className="mini-card-copy" style={{ padding: 20 }}>
                    <p>No memories yet. Add some to begin.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Intelligent Multimedia Storytelling Player (FR-REC-01 & FR-REC-02) */}
        {displayMemories.length > 0 && (
          <section
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(243,246,255,0.9))',
              border: '1px solid rgba(91,110,246,0.15)',
              borderRadius: 24,
              padding: '24px 28px',
              boxShadow: '0 16px 36px rgba(91,110,246,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(91,110,246,0.1)',
                    color: 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  📖 Intelligent Storytelling • {narrativeTheme}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1d2433' }}>
                  {narrativePrompt}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isStoryPlaying ? (
                  <button
                    className="large-btn"
                    onClick={handleStopStory}
                    style={{
                      background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                      color: '#fff',
                      fontSize: 15,
                      padding: '10px 18px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>⏹</span>
                    <span>Stop Story</span>
                  </button>
                ) : (
                  <button
                    className="large-btn primary"
                    onClick={() => playStoryStep(currentStoryIndex)}
                    style={{
                      fontSize: 15,
                      padding: '10px 20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>▶️</span>
                    <span>Play Today's Story</span>
                  </button>
                )}
              </div>
            </div>

            {/* Story Showcase Frame */}
            {activeStoryMemory && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px, 340px) 1fr',
                  gap: 24,
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.7)',
                  borderRadius: 20,
                  padding: 18,
                  border: isStoryPlaying ? '2px solid var(--primary)' : '1px solid rgba(16,24,40,0.06)',
                  transition: 'all .25s ease',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 220,
                    borderRadius: 16,
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                  }}
                  onClick={() => onOpenMemory && onOpenMemory(activeStoryMemory)}
                >
                  <img
                    src={activeStoryMemory.thumbnail}
                    alt={activeStoryMemory.title}
                    onError={(e) => (e.target.src = '/family-garden.jpg')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Step {currentStoryIndex + 1} of {displayMemories.length}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1d2433' }}>
                      {activeStoryMemory.title}
                    </h3>
                    {isStoryPlaying && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: 'var(--primary)',
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.2s infinite' }} />
                        Speaking…
                      </span>
                    )}
                  </div>

                  <div className="muted" style={{ fontSize: 13 }}>
                    📅 {activeStoryMemory.date || 'Cherished moment'} {activeStoryMemory.location && `• 📍 ${activeStoryMemory.location}`}
                  </div>

                  <p
                    style={{
                      margin: '4px 0 10px',
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: '#374151',
                      fontStyle: 'italic',
                      background: 'rgba(255,255,255,0.85)',
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid rgba(91,110,246,0.1)',
                    }}
                  >
                    "{activeStoryMemory.narration || activeStoryMemory.description || 'A timeless moment with family.'}"
                  </p>

                  {/* Navigation controls within story */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="large-btn secondary"
                      disabled={currentStoryIndex === 0}
                      onClick={() => playStoryStep(currentStoryIndex - 1)}
                      style={{ padding: '8px 14px', fontSize: 13 }}
                    >
                      ◀ Previous
                    </button>
                    <button
                      className="large-btn secondary"
                      disabled={currentStoryIndex + 1 >= displayMemories.length}
                      onClick={() => playStoryStep(currentStoryIndex + 1)}
                      style={{ padding: '8px 14px', fontSize: 13 }}
                    >
                      Next ▶
                    </button>
                    <button
                      className="large-btn secondary"
                      onClick={() => onOpenMemory && onOpenMemory(activeStoryMemory)}
                      style={{ padding: '8px 14px', fontSize: 13, marginLeft: 'auto' }}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Quote Strip */}
        <div className="quote-strip">
          {quoteCards.map((q, i) => (
            <blockquote key={i} className={`quote-card quote-card-${i + 1}`}>
              <span className="quote-mark">"</span>
              <p>{q.text}</p>
            </blockquote>
          ))}
        </div>

        {/* Greet + Quick Stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#1d2433' }}>
              Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}
              {user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {loading ? 'Loading your memories…' : `You have ${memories.length} memories stored in your collection`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: '12px 18px', background: 'rgba(255,255,255,0.7)', borderRadius: 14, border: '1px solid rgba(91,110,246,0.08)' }}>
              <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--primary)' }}>{memories.length}</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Memories</span>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 18px', background: 'rgba(255,255,255,0.7)', borderRadius: 14, border: '1px solid rgba(91,110,246,0.08)' }}>
              <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--primary)' }}>{memories.filter((m) => m.favorite).length}</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Favourites</span>
            </div>
          </div>
        </div>

        {/* Carousel */}
        <HeroCarousel items={displayMemories.slice(0, 6)} onOpen={(m) => onOpenMemory && onOpenMemory(m)} />

        {/* Recently Viewed */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Recent Memories</h3>
            <button className="large-btn secondary" onClick={() => navigate('/memories')} style={{ fontSize: 13, padding: '8px 14px' }}>
              View all →
            </button>
          </div>
          <div className="cards">
            {displayMemories.slice(0, 6).map((m) => (
              <article key={m.id} className="memory-card small" onClick={() => onOpenMemory && onOpenMemory(m)} style={{ cursor: 'pointer' }}>
                <div className="thumb-wrap" style={{ flexShrink: 0 }}>
                  <img src={m.thumbnail} alt={m.title} onError={(e) => (e.target.src = '/family-garden.jpg')} style={{ width: 96, height: 76, objectFit: 'cover', borderRadius: 10 }} />
                  <span style={{ position: 'absolute', right: 4, bottom: 4, fontSize: 14 }}>
                    {m.type === 'video' ? '🎥' : m.audioUrl ? '🎙️' : '📷'}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 14, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</strong>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>{m.date}</div>
                  {m.location && <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {m.location}</div>}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Quick Nav Section (Updated to match SRS Core Modules) */}
        <section>
          <h3 style={{ marginBottom: 14 }}>Quick Access</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { icon: '📷', label: 'Face & Object Scanner', sub: 'Recognize family & keepsakes', path: '/recognize' },
              { icon: '⏳', label: 'Life Timeline', sub: 'Chronological life events', path: '/timeline' },
              { icon: '👥', label: 'People I Know', sub: 'Family, friends & doctors', path: '/people' },
              { icon: '✨', label: 'AI Voice Assistant', sub: 'Spoken memory companion', path: '/assistant' },
              { icon: '⚙️', label: 'Settings & Safety', sub: 'Accessibility & consent', path: '/settings' },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 18px',
                  borderRadius: 18,
                  border: '1px solid rgba(91,110,246,0.08)',
                  background: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(91,110,246,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <span style={{ fontSize: 32 }}>{item.icon}</span>
                <div>
                  <strong style={{ display: 'block', fontSize: 15, color: '#1d2433' }}>{item.label}</strong>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  )
}
