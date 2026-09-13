import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function FloatingLogout(){
  const navigate = useNavigate()
  function logout(){
    localStorage.removeItem('echomind-theme')
    // clear other session items if present
    navigate('/')
  }

  return (
    <button className="floating-logout" onClick={logout} aria-label="Log out">⎋</button>
  )
}
