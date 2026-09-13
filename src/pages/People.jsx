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
            <img src={p.photo} alt="" />
            <div>
              <strong>{p.name}</strong>
              <div className="muted">{p.relation} • {p.count} memories</div>
              <div className="row">
                <button className="large-btn" onClick={() => onOpenMemory(memories[0])}>Show Memories</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageLayout>
  )
}
