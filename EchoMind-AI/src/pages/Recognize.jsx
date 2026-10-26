import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, speakText } from '../api'
import PageLayout from '../components/PageLayout'
import PageHeader from '../components/PageHeader'

const QUICK_SAMPLES = [
  { label: 'Anna Sharma (Daughter)', hint: 'Anna', icon: '👩' },
  { label: 'Ravi Sharma (Son)', hint: 'Ravi', icon: '👨' },
  { label: 'Mohan Sharma (Brother)', hint: 'Mohan', icon: '👴' },
  { label: 'Dr. Priya Mehta (Doctor)', hint: 'Priya', icon: '👩‍⚕️' },
  { label: 'Munnar Tea Box (Keepsake)', hint: 'Tea Box', icon: '🍵' },
  { label: '75th Birthday Photo (Keepsake)', hint: 'Birthday Album', icon: '🎂' },
  { label: 'Unrecognized Visitor', hint: 'unrecognized_stranger', icon: '❓' },
]

export default function Recognize() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [stream, setStream] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [activeHint, setActiveHint] = useState('')
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  // Initialize camera stream
  useEffect(() => {
    document.body.classList.add('bg-recognize')
    startCamera()
    return () => {
      document.body.classList.remove('bg-recognize')
      stopCamera()
      stopSpeech()
    }
  }, [])

  // Ensure video element receives stream whenever stream or camera status updates
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
      }
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Auto-play prevented or stream paused:', err)
        })
      }
    }
  }, [stream, cameraActive])

  async function startCamera() {
    setCameraError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Live camera not supported in this browser. You can use sample cards below.')
        return
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      setStream(mediaStream)
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play().catch((e) => console.warn('Play error:', e))
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err)
      setCameraError('Camera access unavailable. Using high-fidelity sample scanner mode.')
      setCameraActive(false)
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
    setCameraActive(false)
  }

  function stopSpeech() {
    try {
      window.speechSynthesis?.cancel()
      window._speechUtterances = []
    } catch {}
    setIsPlayingAudio(false)
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  }

  async function handleScan(explicitHint = '') {
    stopSpeech()
    setScanning(true)
    setResult(null)
    const hint = explicitHint || activeHint

    let frameData = null
    if (cameraActive) {
      frameData = captureFrame()
    }

    try {
      const res = await api.assistant.recognize({
        imageUrl: frameData || '/anna.jpg',
        imageHint: hint,
      })

      setResult(res)

      // Spoken prompt aloud (TTS) for dementia accessibility (FR-VIM-03, FR-FRM-04)
      if (res.spokenPrompt) {
        setIsPlayingAudio(true)
        speakText(res.spokenPrompt, {
          onStart: () => setIsPlayingAudio(true),
          onEnd: () => setIsPlayingAudio(false),
          onError: () => setIsPlayingAudio(false),
        })
      } else if (res.reassurance) {
        setIsPlayingAudio(true)
        speakText(res.reassurance, {
          onStart: () => setIsPlayingAudio(true),
          onEnd: () => setIsPlayingAudio(false),
          onError: () => setIsPlayingAudio(false),
        })
      }
    } catch (err) {
      setResult({
        recognized: false,
        reassurance: "I'm having trouble connecting right now. Please try again in a moment.",
      })
    } finally {
      setScanning(false)
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="Who or What is This?"
        subtitle="Point device camera to recognize family members, personal keepsakes, or photographs"
      />

      <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Viewfinder and Scan Panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 440px) 1fr',
          gap: 24,
          alignItems: 'start',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.8))',
          borderRadius: 24,
          padding: 24,
          border: '1px solid rgba(91,110,246,0.14)',
          boxShadow: '0 12px 36px rgba(91,110,246,0.08)',
          backdropFilter: 'blur(10px)',
        }}>
          {/* Camera Frame */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              position: 'relative',
              width: '100%',
              height: 320,
              borderRadius: 20,
              overflow: 'hidden',
              background: '#0f172a',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              border: cameraActive ? '3px solid #10b981' : '3px solid rgba(91,110,246,0.3)',
            }}>
              {/* Video element is permanently rendered so videoRef.current is never null */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: cameraActive ? 'block' : 'none',
                  transform: 'scaleX(-1)', // Front-facing mirror mode
                }}
              />

              {!cameraActive && (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  textAlign: 'center',
                  padding: 20,
                }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>📷</div>
                  <strong style={{ fontSize: 16 }}>Live Camera Scanner</strong>
                  <span style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    {cameraError || 'Allow camera access to scan in real-time'}
                  </span>
                  <button
                    className="large-btn secondary"
                    onClick={startCamera}
                    style={{ marginTop: 14, fontSize: 13, padding: '6px 14px' }}
                  >
                    Enable Camera
                  </button>
                </div>
              )}

              {/* Viewfinder Target / Reticle Overlay when camera is active */}
              {cameraActive && !scanning && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* Subtle target frame for face alignment */}
                  <div style={{
                    width: 170,
                    height: 210,
                    border: '2px dashed rgba(16,185,129,0.75)',
                    borderRadius: 24,
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', top: -3, left: -3, width: 14, height: 14, borderTop: '4px solid #10b981', borderLeft: '4px solid #10b981', borderRadius: '4px 0 0 0' }} />
                    <div style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderTop: '4px solid #10b981', borderRight: '4px solid #10b981', borderRadius: '0 4px 0 0' }} />
                    <div style={{ position: 'absolute', bottom: -3, left: -3, width: 14, height: 14, borderBottom: '4px solid #10b981', borderLeft: '4px solid #10b981', borderRadius: '0 0 0 4px' }} />
                    <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderBottom: '4px solid #10b981', borderRight: '4px solid #10b981', borderRadius: '0 0 4px 0' }} />
                  </div>
                  <div style={{
                    marginTop: 10,
                    background: 'rgba(15,23,42,0.75)',
                    color: '#6ee7b7',
                    padding: '3px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.3px',
                  }}>
                    👤 Center face or keepsake
                  </div>
                </div>
              )}

              {/* Scanning Overlay Animation */}
              {scanning && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(91,110,246,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 12,
                  color: 'white',
                  backdropFilter: 'blur(2px)',
                }}>
                  <div style={{ fontSize: 36, animation: 'spin 1.5s linear infinite' }}>✨</div>
                  <strong style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>Identifying person / object…</strong>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Scan Action Button */}
            <button
              className="large-btn primary"
              onClick={() => handleScan()}
              disabled={scanning}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '14px 20px',
                fontSize: 16,
                borderRadius: 16,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 8px 20px rgba(91,110,246,0.3)',
              }}
            >
              <span>{scanning ? '⏳ Scanning…' : '📸 Scan Now (Recognize)'}</span>
            </button>
          </div>

          {/* Recognition Result Card */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
            <h3 style={{ margin: '0 0 12px', color: '#1d2433', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔍</span>
              <span>Recognition Result</span>
            </h3>

            {!result && !scanning && (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 16,
                padding: 30,
                textAlign: 'center',
                border: '1px dashed rgba(91,110,246,0.2)',
              }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>✨</div>
                <strong style={{ color: 'var(--primary)', fontSize: 16 }}>Ready to Identify</strong>
                <p style={{ color: 'var(--muted)', fontSize: 14, margin: '6px 0 0', maxWidth: 280 }}>
                  Point your camera at a family member or object, or select one of the sample cards below to test recognition.
                </p>
              </div>
            )}

            {scanning && (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 16,
                padding: 30,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, animation: 'float 1.5s ease-in-out infinite' }}>🧠</div>
                <strong style={{ color: 'var(--primary)', marginTop: 12 }}>EchoMind is matching with memory book…</strong>
              </div>
            )}

            {result && (
              <div style={{
                flex: 1,
                background: 'white',
                borderRadius: 18,
                padding: 20,
                border: result.recognized ? '2px solid #10b981' : '2px solid #f59e0b',
                boxShadow: '0 8px 24px rgba(16,24,40,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
                {/* Header status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: result.recognized ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: result.recognized ? '#059669' : '#d97706',
                  }}>
                    <span>{result.recognized ? '✓ Identified Entity' : '⚠️ Unrecognized'}</span>
                  </span>

                  {result.confidence && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                      Accuracy: {(result.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {/* Entity Details */}
                {result.recognized ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <img
                        src={result.entity.photo}
                        alt={result.entity.name}
                        style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', flexShrink: 0 }}
                      />
                      <div>
                        <strong style={{ display: 'block', fontSize: 18, color: '#1d2433' }}>
                          {result.entity.name}
                        </strong>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 8,
                          background: 'rgba(91,110,246,0.1)',
                          color: 'var(--primary)',
                          fontSize: 12,
                          fontWeight: 700,
                          marginTop: 4,
                        }}>
                          {result.entity.relation || result.entity.category}
                        </span>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#334155', background: 'rgba(91,110,246,0.04)', padding: 12, borderRadius: 12 }}>
                      {result.spokenPrompt || result.entity.notes || result.entity.description}
                    </p>

                    {/* Audio playback indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => {
                          if (isPlayingAudio) stopSpeech()
                          else {
                            setIsPlayingAudio(true)
                            speakText(result.spokenPrompt, {
                              onStart: () => setIsPlayingAudio(true),
                              onEnd: () => setIsPlayingAudio(false),
                              onError: () => setIsPlayingAudio(false),
                            })
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <span>{isPlayingAudio ? '⏹' : '🔊'}</span>
                        <span>{isPlayingAudio ? 'Stop Speaking' : 'Play Voice Prompt'}</span>
                      </button>
                    </div>

                    {/* Associated Memory Collection (FR-FRM-04) */}
                    {result.associatedMemories?.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                          Associated Memories:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {result.associatedMemories.slice(0, 2).map((mem) => (
                            <div
                              key={mem.id}
                              onClick={() => navigate(`/memory/${mem.id}`)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 12px',
                                background: 'rgba(255,255,255,0.9)',
                                borderRadius: 12,
                                border: '1px solid rgba(91,110,246,0.15)',
                                cursor: 'pointer',
                                transition: 'all .15s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(91,110,246,0.06)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
                            >
                              <img
                                src={mem.thumbnail || mem.fileUrl || '/family-garden.jpg'}
                                alt={mem.title}
                                style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <strong style={{ display: 'block', fontSize: 13, color: '#1d2433', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {mem.title}
                                </strong>
                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                                  {mem.date || mem.location || 'Explore memory'}
                                </span>
                              </div>
                              <span style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>→</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Unrecognized fallback (FR-FRM-06) */
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🌸</div>
                    <strong style={{ fontSize: 15, color: '#1d2433', display: 'block', marginBottom: 8 }}>
                      Gentle Reassurance
                    </strong>
                    <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      {result.reassurance}
                    </p>
                    <div style={{
                      marginTop: 14,
                      padding: 10,
                      background: 'rgba(245,158,11,0.08)',
                      borderRadius: 10,
                      border: '1px solid rgba(245,158,11,0.2)',
                      fontSize: 12,
                      color: '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      justifyContent: 'center',
                    }}>
                      <span>🔔</span>
                      <span>Your caregiver has been notified to add this new entry.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Testing & Enrollment Samples (FR-FRM-02, FR-FRM-03) */}
        <section style={{
          background: 'rgba(255,255,255,0.75)',
          borderRadius: 20,
          padding: 20,
          border: '1px solid rgba(91,110,246,0.1)',
        }}>
          <h4 style={{ margin: '0 0 10px', color: '#1d2433', fontSize: 15 }}>
            ⚡ Quick Scan Samples (Face & Object Test Cards)
          </h4>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)' }}>
            Select an enrolled family face or personal keepsake to test recognition accuracy under normal conditions:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {QUICK_SAMPLES.map((sample) => (
              <button
                key={sample.hint}
                onClick={() => {
                  setActiveHint(sample.hint)
                  handleScan(sample.hint)
                }}
                disabled={scanning}
                style={{
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(91,110,246,0.2)',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all .15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(91,110,246,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <span>{sample.icon}</span>
                <span>{sample.label}</span>
              </button>
            ))}
          </div>
        </section>

      </div>
    </PageLayout>
  )
}
