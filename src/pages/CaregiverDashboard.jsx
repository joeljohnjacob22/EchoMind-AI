import React, { useEffect } from 'react'

export default function CaregiverDashboard({ onNavigate }) {
  useEffect(() => { document.body.classList.add('bg-caregiver'); return () => document.body.classList.remove('bg-caregiver') }, [])
  return (
    <div>
      <h2>Caregiver Dashboard</h2>
      <div className="row">
        <button className="large-btn" onClick={() => onNavigate('upload')}>Upload Photos / Videos</button>
        <button className="large-btn" onClick={() => onNavigate('gallery')}>Review Memories</button>
      </div>

      <section>
        <h3>Recently accessed</h3>
        <div className="cards muted">
          <div className="card small">Munnar trip</div>
        </div>
      </section>
    </div>
  )
}
