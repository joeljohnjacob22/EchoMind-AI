import React, { useEffect } from 'react'
import { memories } from '../mock/data'
import HeroCarousel from '../components/HeroCarousel'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'
import AppIcon from '../assets/app-icon.svg'
import CameraIcon from '../assets/icons/camera.svg'

export default function Dashboard({ onOpenMemory }) {
  useEffect(() => {
    document.body.classList.add('bg-dashboard')
    return () => document.body.classList.remove('bg-dashboard')
  }, [])
  const now = new Date()
  return (
    <PageLayout>
      <div className="dashboard-hero-top">
        <img src={AppIcon} alt="EchoMind" className="app-icon" />
        <div className="hero-text">
          <h1>EchoMind</h1>
          <div className="muted">Your memory companion</div>
        </div>
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
    </PageLayout>
  )
}
