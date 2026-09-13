import React, { useEffect } from 'react'

export default function Upload({ onDone }) {
  useEffect(() => { document.body.classList.add('bg-upload'); return () => document.body.classList.remove('bg-upload') }, [])
  return (
    <div>
      <h2>Upload Memory</h2>
      <div className="upload-box">
        <p>Drag & drop photos, videos or audio here</p>
        <input type="file" aria-label="file" multiple />
      </div>
      <div className="form">
        <label className="label">Title<input className="input" /></label>
        <label className="label">Date<input className="input" /></label>
        <label className="label">Location<input className="input" /></label>
        <label className="label">People<input className="input" /></label>
        <label className="label">Description<textarea className="input" /></label>
        <div className="row">
          <button className="large-btn primary" onClick={onDone}>Upload & Process (AI)</button>
        </div>
      </div>
    </div>
  )
}
