import React from 'react'
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import MemoryDetails from './pages/MemoryDetails'
import MemoryPage from './pages/MemoryPage'
import Assistant from './pages/Assistant'
import People from './pages/People'
import Places from './pages/Places'
import Recognize from './pages/Recognize'
import Timeline from './pages/Timeline'
import CaregiverDashboard from './pages/CaregiverDashboard'
import Upload from './pages/Upload'
import Settings from './pages/Settings'

import './styles.css'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import ThemeToggle from './components/ThemeToggle'
import Logo from './components/Logo'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48, animation: 'float 2s ease-in-out infinite' }}>🧠</div>
      <p style={{ color: 'var(--muted)', fontSize: 16 }}>Loading EchoMind…</p>
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  return children
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🔍</div>
      <h2 style={{ color: 'var(--primary)', marginBottom: 8 }}>Page Not Found</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>The page you're looking for doesn't exist.</p>
      <button className="large-btn primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
    </div>
  )
}

function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <button
      className="logout-btn"
      onClick={() => { logout(); navigate('/') }}
      title="Logout"
    >
      Log out
    </button>
  )
}

function AppInner() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLogin = location.pathname === '/'
  const { user } = useAuth()

  return (
    <div className="app-root">
      <header className="topbar">
        <Link to="/dashboard" className="home-link" aria-label="Go to home">
          <Logo />
        </Link>

        {!isLogin && (
          <>
            <nav className="nav" aria-label="Main navigation">
              <Link className={`nav-btn ${location.pathname === '/dashboard' ? 'active' : ''}`} to="/dashboard">
                <span className="nav-icon">🏠</span><span>Home</span>
              </Link>
              <Link className={`nav-btn ${location.pathname === '/recognize' ? 'active' : ''}`} to="/recognize">
                <span className="nav-icon">📷</span><span>Recognize</span>
              </Link>
              <Link className={`nav-btn ${location.pathname === '/memories' ? 'active' : ''}`} to="/memories">
                <span className="nav-icon">🖼️</span><span>Memories</span>
              </Link>
              <Link className={`nav-btn ${location.pathname === '/timeline' ? 'active' : ''}`} to="/timeline">
                <span className="nav-icon">⏳</span><span>Timeline</span>
              </Link>
              <Link className={`nav-btn ${location.pathname === '/people' ? 'active' : ''}`} to="/people">
                <span className="nav-icon">👥</span><span>People</span>
              </Link>
              <Link className={`nav-btn ${location.pathname === '/upload' ? 'active' : ''}`} to="/upload">
                <span className="nav-icon">📤</span><span>Add Memory</span>
              </Link>
              <Link className={`nav-btn ${location.pathname === '/assistant' ? 'active' : ''}`} to="/assistant">
                <span className="nav-icon">✨</span><span>AI Voice</span>
              </Link>
              {(user?.role === 'caregiver' || user?.role === 'admin') && (
                <Link className={`nav-btn ${location.pathname === '/caregiver' ? 'active' : ''}`} to="/caregiver">
                  <span className="nav-icon">{user?.role === 'admin' ? '🛡️' : '🏥'}</span>
                  <span>{user?.role === 'admin' ? 'Admin Portal' : 'Caregiver'}</span>
                </Link>
              )}
              <Link className={`nav-btn ${location.pathname === '/settings' ? 'active' : ''}`} to="/settings">
                <span className="nav-icon">⚙️</span><span>Settings</span>
              </Link>
            </nav>

            <div className="top-controls">
              {user && (
                <div
                  title={`Signed in as ${user.email} (${user.role})`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    background: user.role === 'admin'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : user.role === 'caregiver'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(91, 110, 246, 0.1)',
                    border: user.role === 'admin'
                      ? '1px solid rgba(239, 68, 68, 0.28)'
                      : user.role === 'caregiver'
                      ? '1px solid rgba(16, 185, 129, 0.28)'
                      : '1px solid rgba(91, 110, 246, 0.25)',
                    color: user.role === 'admin' ? '#dc2626' : user.role === 'caregiver' ? '#059669' : 'var(--primary)',
                  }}
                >
                  <span>{user.role === 'admin' ? '🛡️ Admin' : user.role === 'caregiver' ? '🏥 Caregiver' : '👤 Patient'}</span>
                  <span style={{ fontWeight: 500, opacity: 0.85, fontSize: 11, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name || user.email?.split('@')[0]}
                  </span>
                </div>
              )}
              <ThemeToggle />
              <LogoutButton />
            </div>
          </>
        )}
      </header>

      <main className="main">
        <Routes>
          <Route
            path="/"
            element={
              <Login
                onContinue={(asCaregiver) =>
                  navigate(asCaregiver ? '/caregiver' : '/dashboard')
                }
              />
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard onOpenMemory={(m) => navigate(`/memory/${m.id}`)} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recognize"
            element={
              <ProtectedRoute>
                <Recognize />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timeline"
            element={
              <ProtectedRoute>
                <Timeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/memories"
            element={
              <ProtectedRoute>
                <Gallery onOpenMemory={(m) => navigate(`/memory/${m.id}`)} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/memory/:id"
            element={
              <ProtectedRoute>
                <MemoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <Assistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/people"
            element={
              <ProtectedRoute>
                <People onOpenMemory={(m) => m && navigate(`/memory/${m.id}`)} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/places"
            element={
              <ProtectedRoute>
                <Places onOpenMemory={(m) => m && navigate(`/memory/${m.id}`)} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver"
            element={
              <ProtectedRoute>
                <CaregiverDashboard onNavigate={(r) => navigate('/' + r)} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload
                  onDone={() =>
                    navigate(user?.role === 'caregiver' || user?.role === 'admin' ? '/caregiver' : '/memories')
                  }
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings onBack={() => navigate('/dashboard')} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} EchoMind — Memory Care Companion &nbsp;|&nbsp;
        <span style={{ color: 'var(--primary)' }}>Built with ❤️ for families</span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AuthProvider>
  )
}
