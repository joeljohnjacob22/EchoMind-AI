import React, { useEffect } from 'react'

export default function MemoryDetails({ memory, onBack }) {
  useEffect(() => { document.body.classList.add('bg-memory'); return () => document.body.classList.remove('bg-memory') }, [])
  return (
    <div className="memory-details">
      <button className="nav-btn" onClick={onBack}>← Back</button>
      <div className="media">
        <img src={memory.thumbnail} alt="" />
      </div>
      <h2>{memory.title}</h2>
      <div className="muted">📅 {memory.date} • 📍 {memory.location}</div>
      <p className="description">{memory.description}</p>

      <div className="actions">
        <button className="large-btn primary">Play Memory</button>
        <button className="large-btn">Listen</button>
        <button className="large-btn">Add to Favorites</button>
      </div>

      <section>
        <h3>Related</h3>
        <div className="cards muted">
          <div className="card small">Related photo 1</div>
          <div className="card small">Related video</div>
        </div>
      </section>
    </div>
  )
}
