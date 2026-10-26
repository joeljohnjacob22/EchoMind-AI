import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PageLayout({ children, sidebar = true }){
  const location = useLocation()
  const { user } = useAuth()

  return (
    <div className="page-wrap">
      {sidebar && (
        <aside className="page-sidebar" aria-label="Sidebar navigation">
          <nav>
            <Link to="/dashboard" className={`side-link ${location.pathname === '/dashboard' ? 'active' : ''}`}><span className="side-icon home">🏠</span><span>Home</span></Link>
            <Link to="/recognize" className={`side-link ${location.pathname === '/recognize' ? 'active' : ''}`}><span className="side-icon recognize">📷</span><span>Recognize</span></Link>
            <Link to="/memories" className={`side-link ${location.pathname === '/memories' ? 'active' : ''}`}><span className="side-icon photos">🖼️</span><span>Memories</span></Link>
            <Link to="/timeline" className={`side-link ${location.pathname === '/timeline' ? 'active' : ''}`}><span className="side-icon timeline">⏳</span><span>Timeline</span></Link>
            <Link to="/people" className={`side-link ${location.pathname === '/people' ? 'active' : ''}`}><span className="side-icon people">👥</span><span>People</span></Link>
            <Link to="/upload" className={`side-link ${location.pathname === '/upload' ? 'active' : ''}`}><span className="side-icon upload">📤</span><span>Add Memory</span></Link>
            <Link to="/assistant" className={`side-link ${location.pathname === '/assistant' ? 'active' : ''}`}><span className="side-icon assistant">💬</span><span>AI Voice</span></Link>
            {user?.role === 'caregiver' && (
              <Link to="/caregiver" className={`side-link ${location.pathname === '/caregiver' ? 'active' : ''}`}><span className="side-icon caregiver">🏥</span><span>Caregiver</span></Link>
            )}
            <Link to="/settings" className={`side-link ${location.pathname === '/settings' ? 'active' : ''}`}><span className="side-icon settings">⚙️</span><span>Settings</span></Link>
          </nav>
        </aside>
      )}
      <div className="page-content">{children}</div>
    </div>
  )
}
