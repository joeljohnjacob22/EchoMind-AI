import React, { useState, useEffect } from 'react'
import { api } from '../api'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useNavigate } from 'react-router-dom'

const STOCK_PHOTOS = {
  anna: '/anna.jpg',
  daughter: '/anna.jpg',
  ravi: '/ravi.jpg',
  son: '/ravi.jpg',
  mohan: '/mohan.jpg',
  brother: '/mohan.jpg',
  priya: '/priya.jpg',
  doctor: '/priya.jpg',
  physician: '/priya.jpg',
}

function getPlaceholderPhoto(name, relation) {
  const key = (name || '').toLowerCase()
  const rel = (relation || '').toLowerCase()
  for (const [k, src] of Object.entries(STOCK_PHOTOS)) {
    if (key.includes(k) || rel.includes(k)) return src
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5b6ef6&color=fff&size=200`
}

export default function People({ onOpenMemory }) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [personMemories, setPersonMemories] = useState([])
  const [loadingMemories, setLoadingMemories] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add('bg-people')
    api.people.list()
      .then(data => setPeople(data.people || []))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => document.body.classList.remove('bg-people')
  }, [])

  async function handleSelectPerson(person) {
    setSelectedPerson(person)
    setLoadingMemories(true)
    try {
      const data = await api.people.get(person.id)
      setPersonMemories(data.memories || [])
    } catch {
      setPersonMemories([])
    } finally {
      setLoadingMemories(false)
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="People I Know"
        subtitle="Tap a face to view related memories"
      />

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          Loading people…
        </div>
      ) : people.length === 0 ? (
        <div className="center-card" style={{ marginTop: 30 }}>
          <EmptyState
            title="No people added yet"
            subtitle="Caregivers can add family members and friends from the Caregiver Dashboard."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
          {/* People Grid */}
          <div className="people-grid" style={{ flex: 1, minWidth: 0 }}>
            {people.map(p => (
              <article
                key={p.id}
                className="person-card large"
                style={{
                  cursor: 'pointer',
                  border: selectedPerson?.id === p.id ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all .2s ease',
                }}
                onClick={() => handleSelectPerson(p)}
              >
                <img
                  src={p.photo || getPlaceholderPhoto(p.name, p.relation)}
                  alt={p.name}
                  onError={e => {
                    e.target.src = getPlaceholderPhoto(p.name, p.relation)
                  }}
                />
                <div className="person-body">
                  <span className="person-tag">{p.relation}</span>
                  <strong>{p.name}</strong>
                  <div className="muted">{p.memoryCount || 0} memories shared</div>
                  {p.notes && <div className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>{p.notes}</div>}
                  <button
                    className="large-btn secondary"
                    style={{ marginTop: 8 }}
                    onClick={e => { e.stopPropagation(); handleSelectPerson(p) }}
                  >
                    View memories
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Side panel: memories of selected person */}
          {selectedPerson && (
            <aside style={{
              width: 320,
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 20,
              padding: 20,
              border: '1px solid rgba(91,110,246,0.1)',
              boxShadow: '0 12px 30px rgba(91,110,246,0.08)',
              flexShrink: 0,
              alignSelf: 'flex-start',
              position: 'sticky',
              top: 90,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <img
                  src={selectedPerson.photo || getPlaceholderPhoto(selectedPerson.name, selectedPerson.relation)}
                  alt={selectedPerson.name}
                  style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover' }}
                  onError={e => { e.target.src = getPlaceholderPhoto(selectedPerson.name, selectedPerson.relation) }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: 16 }}>{selectedPerson.name}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{selectedPerson.relation}</span>
                </div>
                <button
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)' }}
                  onClick={() => setSelectedPerson(null)}
                >✕</button>
              </div>

              <h4 style={{ margin: '0 0 12px', color: 'var(--primary)' }}>
                Memories ({personMemories.length})
              </h4>

              {loadingMemories ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
              ) : personMemories.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
                  No memories tagged with {selectedPerson.name} yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {personMemories.map(m => (
                    <article
                      key={m.id}
                      onClick={() => navigate(`/memory/${m.id}`)}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'center',
                        padding: '10px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.6)',
                        border: '1px solid rgba(16,24,40,0.06)',
                        cursor: 'pointer',
                        transition: 'transform .15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      {m.thumbnail && (
                        <img
                          src={m.thumbnail}
                          alt={m.title}
                          style={{ width: 52, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.date}</div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      )}
    </PageLayout>
  )
}
