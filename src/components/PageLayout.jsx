import React from 'react'
import { Link } from 'react-router-dom'

export default function PageLayout({ children, sidebar = true }){
  return (
    <div className="page-wrap">
      {sidebar && (
        <aside className="page-sidebar" aria-label="Sidebar navigation">
          <nav>
            <Link to="/dashboard" className="side-link"><span className="side-icon home">🏠</span><span>Home</span></Link>
            <Link to="/memories" className="side-link"><span className="side-icon photos">🖼️</span><span>Memories</span></Link>
            <Link to="/people" className="side-link"><span className="side-icon people">👪</span><span>People</span></Link>
            <Link to="/places" className="side-link"><span className="side-icon places">📍</span><span>Places</span></Link>
            <Link to="/assistant" className="side-link"><span className="side-icon assistant">💬</span><span>Assistant</span></Link>
            <Link to="/memories" className="side-link"><span className="side-icon fav">⭐</span><span>Favorites</span></Link>
          </nav>
        </aside>
      )}
      <div className="page-content">{children}</div>
    </div>
  )
}
