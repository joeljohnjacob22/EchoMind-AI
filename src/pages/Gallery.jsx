import React, { useState, useEffect } from 'react'
import { memories } from '../mock/data'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function Gallery({ onOpenMemory }) {
  useEffect(() => { document.body.classList.add('bg-gallery'); return () => document.body.classList.remove('bg-gallery') }, [])
  const [query, setQuery] = useState('')
  const filtered = memories.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <PageLayout>
      <PageHeader title="Memory Gallery" subtitle="Browse photos, videos and audio" actions={<input aria-label="search" placeholder="Search memories" className="search" value={query} onChange={e => setQuery(e.target.value)} />} />

      {filtered.length === 0 ? (
        <div className="center-card"><EmptyState title="No memories found" subtitle="Try uploading or changing your search" /></div>
      ) : (
        <div className="masonry">
          {filtered.map(m => (
            <article key={m.id} className="memory-card masonry-item memory-tile" onClick={() => onOpenMemory(m)}>
              <img src={m.thumbnail} alt={m.title} />
              <div className="memory-overlay">
                <span className="memory-tag">{m.type}</span>
                <strong>{m.title}</strong>
                <div className="muted">{m.date} • {m.location}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
