import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, speakText } from '../api'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function Timeline() {
  const navigate = useNavigate()
  const [eras, setEras] = useState([])
  const [chronologicalList, setChronologicalList] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'celebration' | 'travel' | 'family'
  const [narratingId, setNarratingId] = useState(null)

  useEffect(() => {
    document.body.classList.add('bg-timeline')
    api.memories.timeline()
      .then((data) => {
        setEras(data.eras || [])
        setChronologicalList(data.chronologicalList || [])
      })
      .catch((err) => console.error('Failed to load timeline:', err))
      .finally(() => setLoading(false))

    return () => {
      document.body.classList.remove('bg-timeline')
      try {
        window.speechSynthesis?.cancel()
        window._speechUtterances = []
      } catch {}
    }
  }, [])

  function handleNarrate(mem, e) {
    e.stopPropagation()
    if (narratingId === mem.id) {
      try {
        window.speechSynthesis?.cancel()
        window._speechUtterances = []
      } catch {}
      setNarratingId(null)
      return
    }

    setNarratingId(mem.id)
    const textToSpeak = mem.narration || mem.description || mem.title
    speakText(textToSpeak, {
      onStart: () => setNarratingId(mem.id),
      onEnd: () => setNarratingId(null),
      onError: () => setNarratingId(null),
    })

    // Track engagement
    api.memories.engage(mem.id, 'narration').catch(() => {})
  }

  // Filter memories
  const filteredList = chronologicalList.filter((m) => {
    if (activeFilter === 'all') return true
    const tags = (m.tags || []).map((t) => t.toLowerCase())
    const text = `${m.title} ${m.description}`.toLowerCase()
    if (activeFilter === 'celebration') return tags.includes('birthday') || tags.includes('celebration') || text.includes('birthday')
    if (activeFilter === 'travel') return tags.includes('travel') || tags.includes('trip') || text.includes('munnar')
    if (activeFilter === 'family') return (m.people && m.people.length > 0) || text.includes('family') || text.includes('anna')
    return true
  })

  return (
    <PageLayout>
      <PageHeader
        title="Life Events Timeline"
        subtitle="Walk through your cherished milestones organized chronologically"
        actions={
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: '🌟 All Events' },
              { id: 'celebration', label: '🎂 Celebrations' },
              { id: 'travel', label: '🏔️ Travels' },
              { id: 'family', label: '👥 Family Times' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: activeFilter === f.id ? 'var(--primary)' : 'rgba(91,110,246,0.15)',
                  background: activeFilter === f.id ? 'var(--primary)' : 'white',
                  color: activeFilter === f.id ? 'white' : 'var(--muted)',
                  fontSize: 13,
                  fontWeight: activeFilter === f.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 44, animation: 'float 1.8s ease-in-out infinite' }}>⏳</div>
          <p style={{ marginTop: 12 }}>Organizing your life events timeline…</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="center-card" style={{ marginTop: 30 }}>
          <EmptyState
            title="No timeline events found"
            subtitle="Add memories with dates to see them ordered in your life journey."
          />
        </div>
      ) : (
        <div style={{ maxWidth: 840, margin: '20px auto 60px', position: 'relative' }}>
          
          {/* Vertical connecting spine */}
          <div style={{
            position: 'absolute',
            left: 28,
            top: 20,
            bottom: 20,
            width: 4,
            background: 'linear-gradient(180deg, var(--primary), #8b5cf6, #3b82f6)',
            borderRadius: 999,
            opacity: 0.35,
          }} />

          {/* Timeline Milestones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {filteredList.map((mem, index) => {
              const d = mem.date ? new Date(mem.date) : null
              const formattedDate = d && !isNaN(d.getTime())
                ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : mem.date || 'Cherished Era'

              const yearOnly = d && !isNaN(d.getTime()) ? d.getFullYear() : 'Milestone'

              return (
                <div
                  key={mem.id}
                  style={{
                    position: 'relative',
                    paddingLeft: 72,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Timeline Node Badge */}
                  <div style={{
                    position: 'absolute',
                    left: 12,
                    top: 14,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: mem.favorite ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    boxShadow: '0 4px 14px rgba(91,110,246,0.3)',
                    zIndex: 2,
                  }}>
                    {mem.favorite ? '❤️' : index + 1}
                  </div>

                  {/* Event Card */}
                  <article
                    onClick={() => navigate(`/memory/${mem.id}`)}
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      borderRadius: 20,
                      border: '1px solid rgba(91,110,246,0.14)',
                      boxShadow: '0 10px 28px rgba(16,24,40,0.06)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all .2s ease',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 240px) 1fr',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)'
                      e.currentTarget.style.boxShadow = '0 16px 36px rgba(91,110,246,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = '0 10px 28px rgba(16,24,40,0.06)'
                    }}
                  >
                    {/* Media Thumbnail */}
                    <div style={{ position: 'relative', height: '100%', minHeight: 180, background: '#f8fafc' }}>
                      <img
                        src={mem.thumbnail || mem.fileUrl || '/family-garden.jpg'}
                        alt={mem.title}
                        onError={(e) => e.target.src = '/family-garden.jpg'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: 'rgba(15,23,42,0.75)',
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 700,
                        backdropFilter: 'blur(6px)',
                      }}>
                        {yearOnly}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>
                            📅 {formattedDate}
                          </span>
                          {mem.location && (
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                              📍 {mem.location}
                            </span>
                          )}
                        </div>

                        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#1d2433' }}>
                          {mem.title}
                        </h3>

                        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#475569', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {mem.narration || mem.description || 'A cherished life memory.'}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 12 }}>
                        <button
                          onClick={(e) => handleNarrate(mem, e)}
                          style={{
                            background: narratingId === mem.id ? 'rgba(239,68,68,0.1)' : 'rgba(91,110,246,0.08)',
                            color: narratingId === mem.id ? '#dc2626' : 'var(--primary)',
                            border: '1px solid',
                            borderColor: narratingId === mem.id ? 'rgba(239,68,68,0.3)' : 'rgba(91,110,246,0.2)',
                            borderRadius: 10,
                            padding: '6px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>{narratingId === mem.id ? '⏹' : '🔊'}</span>
                          <span>{narratingId === mem.id ? 'Stop Voice' : 'Listen to Story'}</span>
                        </button>

                        <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span>Explore</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </PageLayout>
  )
}
