import React, { useEffect, useState } from 'react'
import { memories } from '../mock/data'
import HeroCarousel from '../components/HeroCarousel'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import AppIcon from '../assets/app-icon.svg'
import CameraIcon from '../assets/icons/camera.svg'

const rotatingWords = ['Reconnect', 'Remember', 'Celebrate', 'Cherish']

const quoteCards = [
  {
    text: '“Every memory is a quiet story waiting to be heard again.”',
    accent: 'warm'
  },
  {
    text: '“A gentle reminder that love never really leaves us.”',
    accent: 'calm'
  },
  {
    text: '“Small moments become lasting comfort when shared with care.”',
    accent: 'night'
  }
]

export default function Dashboard({ onOpenMemory }) {
  useEffect(() => {
    document.body.classList.add('bg-dashboard')
    return () => document.body.classList.remove('bg-dashboard')
  }, [])

  const [activeWord, setActiveWord] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWord((current) => (current + 1) % rotatingWords.length)
    }, 2200)

    return () => clearInterval(interval)
  }, [])

  const now = new Date()

  return (
    <PageLayout>
      <div className="dashboard-shell">
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <div className="eyebrow">Memory care, reimagined</div>
            <h1>
              Bring the past back to life with{' '}
              <span className="word-rotator" aria-live="polite">
                <span className="rotating-word">{rotatingWords[activeWord]}</span>
              </span>
            </h1>
            <p className="lead">
              EchoMind helps families revisit meaningful moments, reconnect with loved ones,
              and build a calmer, more confident daily rhythm.
            </p>
            <div className="hero-actions">
              <button className="large-btn primary">Explore memories</button>
              <button className="large-btn secondary">View care plan</button>
            </div>
          </div>

          <div className="dashboard-hero-visual">
            <div className="mini-well">
              <div className="mini-header">
                <img src={AppIcon} alt="EchoMind" className="mini-app-icon" />
                <div>
                  <strong>Today’s reflection</strong>
                  <span>Warm and comforting</span>
                </div>
              </div>

              <div className="mini-feature">
                <div className="mini-card-image">
                  <img src={memories[0].thumbnail} alt={memories[0].title} />
                </div>
                <div className="mini-card-copy">
                  <label>Featured moment</label>
                  <h3>{memories[0].title}</h3>
                  <p>{memories[0].date} • {memories[0].location}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="quote-strip">
          {quoteCards.map((quote, index) => (
            <blockquote key={index} className={`quote-card quote-card-${index + 1}`}>
              <span className="quote-mark">“</span>
              <p>{quote.text}</p>
            </blockquote>
          ))}
        </div>

        <PageHeader title="Welcome back" subtitle={now.toLocaleString()} actions={<button className="large-btn">Explore</button>} />

        <HeroCarousel items={memories} onOpen={onOpenMemory} />

        <section>
          <h3>Recently viewed</h3>
          <div className="cards">
            {memories.map(m => (
              <article key={m.id} className="memory-card small" onClick={() => onOpenMemory(m)}>
                <div className="thumb-wrap">
                  <img src={m.thumbnail} alt="" />
                  <img src={CameraIcon} className="type-icon" alt="photo" />
                </div>
                <div>
                  <strong>{m.title}</strong>
                  <div className="muted">{m.date}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  )
}
