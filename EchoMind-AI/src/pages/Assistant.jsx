import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { assistant, speakText } from '../api'
import { useAuth } from '../context/AuthContext'
import PageLayout from '../components/PageLayout'

const CATEGORIZED_PROMPTS = {
  '🌟 Quick': [
    'Who is in my family?',
    'Show my favorite memories',
    'Where was my Munnar trip?',
    'Tell me a comforting story',
  ],
  '👥 Family': [
    'Who is Anna?',
    'Tell me about Ravi',
    'Who are all the people I know?',
  ],
  '📸 Memories': [
    'What did we do in the Rose Garden?',
    'Tell me about my 75th birthday celebration',
    'Show memories from 2023',
    'Tell me about our Sunday family dinner',
  ],
  '🌸 Comfort': [
    'I feel a little confused, can you help?',
    'Tell me a calming story',
    'Remind me of happy times',
  ],
}

const STOCK_PHOTOS = {
  anna: '/anna.jpg',
  daughter: '/anna.jpg',
  ravi: '/ravi.jpg',
  son: '/ravi.jpg',
  mohan: '/mohan.jpg',
  brother: '/mohan.jpg',
  priya: '/priya.jpg',
  doctor: '/priya.jpg',
  physician: '/priya.jpg',
}

function getPersonPhoto(p) {
  if (p.photo) return p.photo
  if (p.avatar) return p.avatar
  const key = (p.name || '').toLowerCase()
  const rel = (p.relation || '').toLowerCase()
  for (const [k, src] of Object.entries(STOCK_PHOTOS)) {
    if (key.includes(k) || rel.includes(k)) return src
  }
  return '/anna.jpg'
}

export default function Assistant() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'ai',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Hello${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋 I'm your EchoMind AI memory companion.\n\nI'm here to help you recall your family members, revisit precious moments, or simply share a calming thought with you. You can type or tap the microphone to speak with me!`,
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState('🌟 Quick')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(() => {
    return localStorage.getItem('echomind-auto-speak') === 'true'
  })
  const [isListening, setIsListening] = useState(false)
  const [micSupported, setMicSupported] = useState(false)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('bg-assistant')
    return () => {
      document.body.classList.remove('bg-assistant')
      handleStopSpeech()
    }
  }, [])

  // Initialize SpeechRecognition if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setMicSupported(true)
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-IN'

      rec.onstart = () => setIsListening(true)
      rec.onend = () => setIsListening(false)
      rec.onerror = () => setIsListening(false)
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setInput(transcript)
          send(transcript)
        }
      }
      recognitionRef.current = rec
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function toggleAutoSpeak() {
    setAutoSpeak(prev => {
      const next = !prev
      localStorage.setItem('echomind-auto-speak', String(next))
      if (!next && isSpeaking) handleStopSpeech()
      return next
    })
  }

  function handleVoiceInput() {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your message.')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      handleStopSpeech()
      try {
        recognitionRef.current.start()
      } catch (err) {
        setIsListening(false)
      }
    }
  }

  async function send(text) {
    const message = text || input
    if (!message.trim()) return
    setInput('')
    setLoading(true)

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg = { id: Date.now(), from: 'user', text: message, time: now }
    setMessages(m => [...m, userMsg])

    try {
      const res = await assistant.chat(message)
      const aiMsg = {
        id: Date.now() + 1,
        from: 'ai',
        text: res.reply,
        matchedMemories: res.matchedMemories || [],
        matchedPeople: res.matchedPeople || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(m => [...m, aiMsg])

      // Auto read response aloud if enabled
      if (autoSpeak && res.reply) {
        handleListen(res.reply)
      }
    } catch (err) {
      const errMsg = {
        id: Date.now() + 1,
        from: 'ai',
        text: `I'm sorry, I couldn't process that right now. Please try again in a moment. 🌸`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(m => [...m, errMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleListen(text) {
    if (isSpeaking) {
      handleStopSpeech()
      return
    }
    // Clean markdown before speaking
    const clean = text.replace(/[*_#•]/g, '').trim()
    setIsSpeaking(true)
    speakText(clean, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    })
  }

  function handleStopSpeech() {
    try {
      window.speechSynthesis?.cancel()
      window._speechUtterances = []
    } catch (e) {}
    setIsSpeaking(false)
  }

  function handleClearChat() {
    handleStopSpeech()
    setMessages([
      {
        id: Date.now(),
        from: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Chat cleared! How can I help you explore your memories today? 🌸`,
      }
    ])
  }

  function formatMessage(text) {
    return text
      .split('\n')
      .map((line, i) => {
        const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        return `<span key="${i}">${boldLine}</span>`
      })
      .join('<br/>')
  }

  return (
    <PageLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 150px)',
        maxWidth: 880,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          padding: '14px 20px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.8))',
          borderRadius: 20,
          border: '1px solid rgba(91,110,246,0.14)',
          boxShadow: '0 8px 24px rgba(91,110,246,0.06)',
          backdropFilter: 'blur(10px)',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: 'white',
              boxShadow: '0 6px 16px rgba(91,110,246,0.25)',
              flexShrink: 0,
            }}>
              ✨
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 16, color: '#1d2433' }}>
                EchoMind AI Companion
              </strong>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                Memory assistance, family recall, and comforting support
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Auto Read Toggle */}
            <button
              className="btn btn-secondary"
              onClick={toggleAutoSpeak}
              title={autoSpeak ? 'Disable auto voice narration' : 'Enable auto voice narration'}
              style={{
                fontSize: 13,
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: autoSpeak ? 'rgba(91,110,246,0.1)' : undefined,
                borderColor: autoSpeak ? 'var(--primary)' : undefined,
                color: autoSpeak ? 'var(--primary)' : undefined,
                fontWeight: autoSpeak ? 600 : 400,
              }}
            >
              <span>{autoSpeak ? '🔊' : '🔈'}</span>
              <span>Auto-Read {autoSpeak ? 'ON' : 'OFF'}</span>
            </button>

            {/* Speaking active stop button */}
            {isSpeaking && (
              <button
                onClick={handleStopSpeech}
                className="btn btn-secondary"
                style={{
                  fontSize: 13,
                  padding: '6px 12px',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#dc2626',
                  borderColor: 'rgba(239,68,68,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>⏹</span>
                <span>Stop Speaking</span>
              </button>
            )}

            {/* Clear chat */}
            <button
              onClick={handleClearChat}
              className="btn btn-secondary"
              title="Clear conversation"
              style={{ fontSize: 13, padding: '6px 10px' }}
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Chat message history container */}
        <div
          className="chat"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 8px',
            maxHeight: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.from === 'user' ? 'flex-end' : 'flex-start',
                width: '100%',
              }}
            >
              <div
                className={`bubble ${m.from === 'ai' ? 'ai' : 'user'}`}
                style={{
                  maxWidth: '84%',
                  borderRadius: m.from === 'ai' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                  padding: '16px 20px',
                  background: m.from === 'user'
                    ? 'linear-gradient(135deg, var(--primary), #4f46e5)'
                    : 'rgba(255, 255, 255, 0.95)',
                  color: m.from === 'user' ? '#fff' : '#1d2433',
                  boxShadow: '0 8px 24px rgba(16,24,40,0.06)',
                  border: m.from === 'ai' ? '1px solid rgba(91,110,246,0.12)' : 'none',
                }}
              >
                {/* Header inside bubble */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 8,
                  fontSize: 12,
                  opacity: 0.8,
                  color: m.from === 'user' ? 'rgba(255,255,255,0.85)' : 'var(--primary)',
                  fontWeight: 700,
                }}>
                  <span>{m.from === 'ai' ? '✨ EchoMind Companion' : '👤 You'}</span>
                  <span style={{ fontSize: 11, fontWeight: 400 }}>{m.time}</span>
                </div>

                {/* Body */}
                <div
                  dangerouslySetInnerHTML={{ __html: formatMessage(m.text) }}
                  style={{ whiteSpace: 'pre-line', lineHeight: 1.65, fontSize: 15 }}
                />

                {/* Matched People Mini-Cards */}
                {m.matchedPeople?.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(91,110,246,0.1)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      👥 People Mentioned
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                      gap: 8,
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      {m.matchedPeople.map(p => (
                        <div
                          key={p.id}
                          onClick={() => navigate('/people')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            background: 'rgba(91,110,246,0.06)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            border: '1px solid rgba(91,110,246,0.12)',
                            boxSizing: 'border-box',
                            minWidth: 0,
                            transition: 'all .15s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,110,246,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(91,110,246,0.06)'}
                        >
                          <img
                            src={getPersonPhoto(p)}
                            alt={p.name}
                            onError={e => { e.target.src = getPersonPhoto(p) }}
                            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                            <strong style={{ display: 'block', fontSize: 13, color: '#1d2433', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </strong>
                            <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.relation}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Memories Mini-Cards */}
                {m.matchedMemories?.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(91,110,246,0.1)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🖼️ Related Memories
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                      gap: 10,
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      {m.matchedMemories.map(mem => (
                        <div
                          key={mem.id}
                          onClick={() => navigate(`/memory/${mem.id}`)}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            padding: 8,
                            background: 'rgba(255,255,255,0.92)',
                            borderRadius: 12,
                            border: '1px solid rgba(91,110,246,0.15)',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
                            boxSizing: 'border-box',
                            minWidth: 0,
                            transition: 'all .15s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 6px 14px rgba(91,110,246,0.12)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.04)'
                          }}
                        >
                          <img
                            src={mem.thumbnail || mem.image || '/family-garden.jpg'}
                            alt={mem.title}
                            onError={e => e.target.src = '/family-garden.jpg'}
                            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                            <strong style={{ display: 'block', fontSize: 13, color: '#1d2433', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {mem.title}
                            </strong>
                            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {mem.date || mem.location || 'Explore memory'}
                            </span>
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>→</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button inside AI bubble */}
                {m.from === 'ai' && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <button
                      onClick={() => handleListen(m.text)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 6px',
                        borderRadius: 6,
                      }}
                      title="Read response aloud"
                    >
                      <span>🔊</span>
                      <span>Listen to response</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div
                className="bubble ai"
                style={{
                  padding: '14px 20px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(91,110,246,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 18 }}>✨</div>
                <span style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 500 }}>
                  EchoMind is recalling your memories…
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Topic Suggestion Chips & Category Switcher */}
        <div style={{ margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Categories */}
          <div style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {Object.keys(CATEGORIZED_PROMPTS).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: activeCategory === cat ? 'var(--primary)' : 'rgba(91,110,246,0.12)',
                  background: activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
                  color: activeCategory === cat ? '#fff' : 'var(--muted)',
                  fontSize: 12,
                  fontWeight: activeCategory === cat ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all .15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick prompts for active category */}
          <div style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {CATEGORIZED_PROMPTS[activeCategory].map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  borderRadius: 14,
                  border: '1px solid rgba(91,110,246,0.15)',
                  background: 'rgba(255,255,255,0.85)',
                  color: 'var(--primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'all .15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,110,246,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.85)'}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar with Voice Microphone */}
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 20,
          border: '1px solid rgba(91,110,246,0.18)',
          boxShadow: '0 8px 24px rgba(16,24,40,0.06)',
          backdropFilter: 'blur(10px)',
        }}>
          {/* Microphone button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            title={isListening ? 'Click to stop listening' : 'Speak your question'}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: isListening ? '2px solid #ef4444' : '1px solid rgba(91,110,246,0.2)',
              background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(91,110,246,0.08)',
              color: isListening ? '#dc2626' : 'var(--primary)',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all .2s ease',
              animation: isListening ? 'pulse 1.2s infinite' : 'none',
            }}
          >
            {isListening ? '🎙️' : '🎤'}
          </button>

          <input
            ref={inputRef}
            aria-label="assistant-input"
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={isListening ? 'Listening… speak clearly into your mic!' : 'Ask about family, memories, or places…'}
            disabled={loading}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 16,
              padding: '8px 4px',
              outline: 'none',
              boxShadow: 'none',
            }}
          />

          <button
            className="large-btn primary"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 20px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 14,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Ask</span>
            <span>✨</span>
          </button>
        </div>
      </div>
    </PageLayout>
  )
}
