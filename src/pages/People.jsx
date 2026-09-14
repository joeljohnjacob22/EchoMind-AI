import React, { useEffect } from 'react'
import { people, memories } from '../mock/data'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'

export default function People({ onOpenMemory }) {
  useEffect(() => { document.body.classList.add('bg-people'); return () => document.body.classList.remove('bg-people') }, [])
  return (
    <PageLayout>
      <PageHeader title="People I Know" subtitle="Tap a face to view related memories" />
      <div className="people-grid">
        {people.map(p => (
          <article key={p.id} className="person-card large">
            <img src={p.photo} alt={p.name} />
            <div className="person-body">
              <span className="person-tag">{p.relation}</span>
              <strong>{p.name}</strong>
              <div className="muted">{p.count} memories shared</div>
              <button className="large-btn secondary" onClick={() => onOpenMemory(memories[0])}>View memories</button>
            </div>
          </article>
        ))}
      </div>
    </PageLayout>
  )
}
