import React, { useEffect } from 'react'
import { places } from '../mock/data'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'

export default function Places({ onOpenMemory }) {
  useEffect(() => { document.body.classList.add('bg-places'); return () => document.body.classList.remove('bg-places') }, [])
  return (
    <PageLayout>
      <PageHeader title="Places" subtitle="Locations that matter" />
      <div className="places-grid">
        {places.map(p => (
          <article key={p.id} className="place-card large">
            <div className="place-thumb" aria-hidden>📍</div>
            <div className="place-body">
              <span className="place-tag">Favorite place</span>
              <strong>{p.name}</strong>
              <div className="muted">{p.label}</div>
              <button className="large-btn secondary" onClick={() => onOpenMemory && onOpenMemory(null)}>Show memories</button>
            </div>
          </article>
        ))}
      </div>
    </PageLayout>
  )
}
