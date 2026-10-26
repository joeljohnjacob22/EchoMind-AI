import React, { useState, useEffect } from 'react'
import { api } from '../api'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { useNavigate } from 'react-router-dom'

const PLACE_ICONS = {
  home: '🏠', garden: '🌿', park: '🌳', beach: '🏖️', hospital: '🏥',
  church: '⛪', temple: '🛕', school: '🏫', restaurant: '🍽️',
  default: '📍',
}

const PLACE_IMAGES = {
  'garden': '/family-garden.jpg',
  'munnar': '/munnar.jpg',
  'tea': '/munnar.jpg',
  'living room': '/home.jpg',
  'room': '/home.jpg',
  'park': '/park.jpg',
  'lake': '/park.jpg',
  'dining': '/family-dinner.jpg',
  'dinner': '/family-dinner.jpg',
}

function getPlaceIcon(name) {
  const key = (name || '').toLowerCase()
  for (const [k, icon] of Object.entries(PLACE_ICONS)) {
    if (key.includes(k)) return icon
  }
  return PLACE_ICONS.default
}

function getPlaceImage(name, photo) {
  if (photo) return photo
  const key = (name || '').toLowerCase()
  for (const [k, img] of Object.entries(PLACE_IMAGES)) {
    if (key.includes(k)) return img
  }
  return null
}

export default function Places({ onOpenMemory }) {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [placeMemories, setPlaceMemories] = useState([])
  const [loadingMemories, setLoadingMemories] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add('bg-places')
    api.places.list()
      .then(data => setPlaces(data.places || []))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => document.body.classList.remove('bg-places')
  }, [])

  async function handleSelectPlace(place) {
    setSelectedPlace(place)
    setLoadingMemories(true)
    try {
      // Search memories by location name
      const data = await api.memories.list()
      const all = data.memories || []
      const filtered = all.filter(m => (m.location || '').toLowerCase().includes((place.name || '').toLowerCase()))
      setPlaceMemories(filtered)
    } catch {
      setPlaceMemories([])
    } finally {
      setLoadingMemories(false)
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="Places"
        subtitle="Meaningful locations and memories connected to them"
      />

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
          Loading places…
        </div>
      ) : places.length === 0 ? (
        <div className="center-card" style={{ marginTop: 30 }}>
          <EmptyState
            title="No places added yet"
            subtitle="Places are automatically discovered from memory locations. Upload a memory with a location to see it here."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
          {/* Places Grid */}
          <div className="places-grid" style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {places.map(p => {
              const placeImg = getPlaceImage(p.name, p.photo)
              return (
                <article
                  key={p.id}
                  className="place-card large"
                  style={{
                    cursor: 'pointer',
                    border: selectedPlace?.id === p.id ? '2px solid var(--primary)' : '1px solid rgba(91,110,246,0.12)',
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.85)',
                    boxShadow: '0 12px 30px rgba(91,110,246,0.06)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all .2s ease',
                  }}
                  onClick={() => handleSelectPlace(p)}
                >
                  {placeImg ? (
                    <div style={{ position: 'relative', height: 150, width: '100%', overflow: 'hidden' }}>
                      <img
                        src={placeImg}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 10,
                        left: 12,
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 16,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span>{getPlaceIcon(p.name)}</span>
                        <strong style={{ fontSize: 12, color: 'var(--primary)' }}>{p.memoryCount || 1} moments</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="place-thumb" aria-hidden style={{ fontSize: 44, padding: '24px 0', textAlign: 'center' }}>
                      {getPlaceIcon(p.name)}
                    </div>
                  )}

                  <div className="place-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <strong style={{ fontSize: 18, color: '#1d2433', marginBottom: 4 }}>{p.name}</strong>
                    <div className="muted" style={{ fontSize: 14, marginBottom: 6 }}>{p.label || p.address || p.name}</div>
                    {p.description && <div className="muted" style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, flex: 1, marginBottom: 12 }}>{p.description}</div>}
                    
                    <button
                      className="large-btn secondary"
                      style={{ marginTop: 'auto', padding: '10px 14px', fontSize: 14, borderRadius: 12 }}
                      onClick={e => { e.stopPropagation(); handleSelectPlace(p) }}
                    >
                      🗺️ View Memories ({p.memoryCount || 1})
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Side panel: memories at selected place */}
          {selectedPlace && (
            <aside style={{
              width: 340,
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(16px)',
              borderRadius: 22,
              padding: 20,
              border: '1px solid rgba(91,110,246,0.15)',
              boxShadow: '0 18px 40px rgba(91,110,246,0.1)',
              flexShrink: 0,
              alignSelf: 'flex-start',
              position: 'sticky',
              top: 90,
            }}>
              {getPlaceImage(selectedPlace.name, selectedPlace.photo) && (
                <div style={{ height: 140, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                  <img
                    src={getPlaceImage(selectedPlace.name, selectedPlace.photo)}
                    alt={selectedPlace.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 32, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(91,110,246,0.08)', borderRadius: 14 }}>
                  {getPlaceIcon(selectedPlace.name)}
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 17 }}>{selectedPlace.name}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{selectedPlace.label || selectedPlace.address}</span>
                </div>
                <button
                  style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: 'var(--muted)' }}
                  onClick={() => setSelectedPlace(null)}
                >✕</button>
              </div>

              <h4 style={{ margin: '0 0 12px', color: 'var(--primary)' }}>
                Memories here ({placeMemories.length})
              </h4>

              {loadingMemories ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
              ) : placeMemories.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
                  No memories tagged at {selectedPlace.name} yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {placeMemories.map(m => (
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
