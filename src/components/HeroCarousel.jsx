import React, { useState, useEffect, useRef } from 'react'

export default function HeroCarousel({ items = [], onOpen }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!paused && items.length > 1) {
      timer.current = setInterval(() => setIndex(i => (i + 1) % items.length), 5000)
    }
    return () => clearInterval(timer.current)
  }, [paused, items.length])

  function go(delta) {
    setIndex(i => {
      const next = (i + delta + items.length) % items.length
      return next
    })
  }

  return (
    <div className="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {items.map((it, idx) => (
          <figure className="carousel-slide" key={it.id} aria-hidden={idx !== index}>
            <img src={it.thumbnail} alt={it.title} />
            <figcaption className="carousel-caption">
              <h3>{it.title}</h3>
              <p className="muted">{it.date} • {it.location}</p>
              <div className="row">
                <button className="large-btn primary" onClick={() => onOpen && onOpen(it)}>Explore</button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="carousel-controls">
        <button aria-label="Previous" className="carousel-arrow" onClick={() => go(-1)}>‹</button>
        <div className="carousel-dots" role="tablist">
          {items.map((_, i) => (
            <button key={i} className={"dot " + (i === index ? 'active' : '')} onClick={() => setIndex(i)} aria-selected={i===index} role="tab" />
          ))}
        </div>
        <button aria-label="Next" className="carousel-arrow" onClick={() => go(1)}>›</button>
      </div>
    </div>
  )
}
