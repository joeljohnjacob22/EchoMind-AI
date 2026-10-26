import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import MemoryDetails from './MemoryDetails'

export default function MemoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [memory, setMemory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.memories.get(id)
      .then(data => { setMemory(data.memory); setLoading(false); })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✨</div>
        <p style={{ fontSize: 16 }}>Loading memory…</p>
      </div>
    )
  }

  if (!memory) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: 'var(--primary)', marginBottom: 8 }}>Memory not found</h2>
        <button className="large-btn primary" onClick={() => navigate('/memories')}>Back to Gallery</button>
      </div>
    )
  }

  return <MemoryDetails key={memory.id} memory={memory} onBack={() => navigate('/memories')} />
}
