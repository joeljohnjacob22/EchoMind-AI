import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { memories } from '../mock/data'
import MemoryDetails from './MemoryDetails'

export default function MemoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const memory = memories.find(m => m.id === id)
  if (!memory) return (
    <div>
      <h2>Memory not found</h2>
      <button className="large-btn" onClick={() => navigate('/memories')}>Back to Gallery</button>
    </div>
  )

  return <MemoryDetails memory={memory} onBack={() => navigate('/memories')} />
}
