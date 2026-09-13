import React, { useEffect } from 'react'

export default function Settings({ onBack }) {
  useEffect(() => { document.body.classList.add('bg-settings'); return () => document.body.classList.remove('bg-settings') }, [])
  return (
    <div>
      <h2>Settings</h2>
      <section>
        <h3>Accessibility</h3>
        <div className="row">
          <button className="large-btn">Increase Font</button>
          <button className="large-btn">Decrease Font</button>
        </div>
      </section>

      <section>
        <h3>Voice</h3>
        <div className="row">
          <button className="large-btn">Speech Rate</button>
          <button className="large-btn">Voice Selection</button>
        </div>
      </section>

      <div className="row">
        <button className="large-btn" onClick={onBack}>Back</button>
      </div>
    </div>
  )
}
