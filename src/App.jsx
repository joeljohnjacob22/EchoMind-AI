import React from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import MemoryDetails from './pages/MemoryDetails'
import MemoryPage from './pages/MemoryPage'
import Assistant from './pages/Assistant'
import People from './pages/People'
import Places from './pages/Places'
import CaregiverDashboard from './pages/CaregiverDashboard'
import Upload from './pages/Upload'
import Settings from './pages/Settings'

import './styles.css'
import { ThemeProvider } from './context/ThemeContext'
import ThemeToggle from './components/ThemeToggle'
import Logo from './components/Logo'
import FloatingLogout from './components/FloatingLogout'

export default function App() {
  const navigate = useNavigate()

  return (
    <ThemeProvider>
      <div className="app-root">
        <header className="topbar">
          <Link to="/dashboard" className="home-link" aria-label="Go to home"><Logo /></Link>
          <nav className="nav" aria-label="Main navigation">
            <Link className="nav-btn" to="/memories">Memories</Link>
            <Link className="nav-btn" to="/people">People</Link>
            <Link className="nav-btn" to="/places">Places</Link>
            <Link className="nav-btn" to="/assistant">AI Assistant</Link>
            <Link className="nav-btn" to="/settings">Settings</Link>
          </nav>
          <div className="top-controls">
            <ThemeToggle />
            <button className="logout-btn" onClick={() => { localStorage.removeItem('echomind-theme'); navigate('/'); }} title="Logout">Log out</button>
          </div>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Login onContinue={(asCaregiver) => navigate(asCaregiver ? '/caregiver' : '/dashboard')} />} />
            <Route path="/dashboard" element={<Dashboard onOpenMemory={(m) => navigate(`/memory/${m.id}`)} />} />
            <Route path="/memories" element={<Gallery onOpenMemory={(m) => navigate(`/memory/${m.id}`)} />} />
            <Route path="/memory/:id" element={<MemoryPage />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/people" element={<People onOpenMemory={(m) => navigate(`/memory/${m.id}`)} />} />
            <Route path="/places" element={<Places onOpenMemory={(m) => navigate(`/memory/${m.id}`)} />} />
            <Route path="/caregiver" element={<CaregiverDashboard onNavigate={(r) => navigate('/' + r)} />} />
            <Route path="/upload" element={<Upload onDone={() => navigate('/caregiver')} />} />
            <Route path="/settings" element={<Settings onBack={() => navigate('/dashboard')} />} />
          </Routes>
        </main>

        {/* Floating logout for inner pages (hidden on login) */}
        {useLocation().pathname !== '/' && <FloatingLogout />}

        <footer className="footer">© EchoMind</footer>
      </div>
    </ThemeProvider>
  )
}
