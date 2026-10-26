/**
 * EchoMind Frontend — API client
 *
 * All API calls go through this module. Swap the VITE_API_URL environment
 * variable to point at any environment (dev, staging, production).
 *
 * Usage:
 *   import { api } from './api'
 *   const { memories } = await api.memories.list()
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ─── Token management ─────────────────────────────────────────────────────

export const tokenStore = {
  get: () => localStorage.getItem('echomind-token'),
  set: (t) => localStorage.setItem('echomind-token', t),
  clear: () => localStorage.removeItem('echomind-token'),
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────

async function request(method, path, body = null, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = tokenStore.get()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const config = { method, headers }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (body instanceof FormData) {
    delete headers['Content-Type']
    config.body = body
  } else if (body) {
    config.body = JSON.stringify(body)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  config.signal = controller.signal

  try {
    const res = await fetch(`${BASE_URL}${path}`, config)
    clearTimeout(timeoutId)

    if (res.status === 204) return null

    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))

    if (!res.ok) {
      const err = new Error(data.error || `Request failed with status ${res.status}`)
      err.status = res.status
      err.details = data.details
      throw err
    }

    return data
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. Please check your network connection and try again.')
    }
    throw err
  }
}

const get = (path, params = {}) => {
  const patientId = localStorage.getItem('echomind-patient-id')
  if (patientId) params.patientId = patientId

  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString()
  return request('GET', qs ? `${path}?${qs}` : path)
}

const appendPatientIdToBody = (body) => {
  if (body instanceof FormData) {
    const patientId = localStorage.getItem('echomind-patient-id')
    if (patientId && !body.has('patientId')) body.append('patientId', patientId)
    return body
  }
  if (body && typeof body === 'object') {
    const patientId = localStorage.getItem('echomind-patient-id')
    if (patientId && body.patientId === undefined) {
      return { ...body, patientId }
    }
  }
  return body
}

const post = (path, body) => request('POST', path, appendPatientIdToBody(body))
const patch = (path, body) => request('PATCH', path, appendPatientIdToBody(body))
const del = (path, params = {}) => {
  const patientId = localStorage.getItem('echomind-patient-id')
  if (patientId) params.patientId = patientId

  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString()
  return request('DELETE', qs ? `${path}?${qs}` : path)
}

async function postForm(path, formData) {
  const token = tokenStore.get()
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const body = appendPatientIdToBody(formData)
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body })
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  if (!res.ok) {
    const err = new Error(data.error || `Upload failed`)
    err.status = res.status
    throw err
  }
  return data
}

// ─── Auth ─────────────────────────────────────────────────────────────────

export const auth = {
  register: (body) => post('/auth/register', body),
  login: async (body) => {
    const data = await post('/auth/login', body)
    if (data.token) tokenStore.set(data.token)
    return data
  },
  quickAccess: async () => {
    const data = await post('/auth/quick-access')
    if (data.token) tokenStore.set(data.token)
    return data
  },
  recover: (body) => post('/auth/recover', body),
  logout: async () => {
    await post('/auth/logout').catch(() => {})
    tokenStore.clear()
    localStorage.removeItem('echomind-patient-id')
  },
  me: () => get('/auth/me'),
  refresh: async () => {
    const data = await post('/auth/refresh')
    if (data.token) tokenStore.set(data.token)
    return data
  },
}

// ─── Memories ─────────────────────────────────────────────────────────────

export const memories = {
  list: (params = {}) => get('/memories', params),
  timeline: (params = {}) => get('/memories/timeline', params),
  recommendations: (params = {}) => get('/memories/recommendations', params),
  search: (q, params = {}) => get('/memories/search', { q, ...params }),
  get: (id, params = {}) => get(`/memories/${id}`, params),
  create: (formData) => postForm('/memories', formData),
  engage: (id, type = 'view') => post(`/memories/${id}/engage`, { type }),
  toggleDistressing: (id) => patch(`/memories/${id}/distressing`),
  togglePriority: (id) => patch(`/memories/${id}/priority`),
  update: (id, body, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ).toString()
    return patch(`/memories/${id}${qs ? '?' + qs : ''}`, body)
  },
  delete: (id, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ).toString()
    return del(`/memories/${id}${qs ? '?' + qs : ''}`)
  },
  toggleFavorite: (id, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ).toString()
    return post(`/memories/${id}/favorite${qs ? '?' + qs : ''}`)
  },
  narrate: (id, params = {}) => get(`/memories/${id}/narrate`, params),
}

// ─── People ───────────────────────────────────────────────────────────────

export const people = {
  list: (params = {}) => get('/people', params),
  get: (id, params = {}) => get(`/people/${id}`, params),
  create: (formData) => postForm('/people', formData),
  update: (id, formData) => {
    const token = tokenStore.get()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return fetch(`${BASE_URL}/people/${id}`, { method: 'PATCH', headers, body: formData })
      .then((r) => r.json())
  },
  delete: (id, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ).toString()
    return del(`/people/${id}${qs ? '?' + qs : ''}`)
  },
  recognize: (imageUrl, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ).toString()
    return post(`/people/recognize${qs ? '?' + qs : ''}`, { imageUrl })
  },
}

// ─── Places ───────────────────────────────────────────────────────────────

export const places = {
  list: (params = {}) => get('/places', params),
  get: (id, params = {}) => get(`/places/${id}`, params),
  create: (body, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ).toString()
    return post(`/places${qs ? '?' + qs : ''}`, body)
  },
  update: (id, body) => patch(`/places/${id}`, body),
  delete: (id) => del(`/places/${id}`),
}

// ─── AI Assistant & Recognition ───────────────────────────────────────────

export const assistant = {
  chat: (message, memoryId = null, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ).toString()
    return post(`/assistant/chat${qs ? '?' + qs : ''}`, { message, memoryId })
  },
  history: (params = {}) => get('/assistant/history', params),
  tts: (text, settings = {}) => post('/assistant/tts', { text, ...settings }),
  narrate: (memoryId, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ).toString()
    return post(`/assistant/narrate${qs ? '?' + qs : ''}`, { memoryId })
  },
  recognize: (payload) => post('/assistant/recognize', typeof payload === 'string' ? { imageUrl: payload } : payload),
  suggestions: () => get('/assistant/suggestions'),
}

// ─── Settings ─────────────────────────────────────────────────────────────

export const settings = {
  get: () => get('/settings'),
  update: (body) => patch('/settings', body),
}

// ─── Caregiver ────────────────────────────────────────────────────────────

export const caregiver = {
  patients: () => get('/caregiver/patients'),
  link: (patientEmail) => post('/caregiver/link', { patientEmail }),
  dashboard: (patientUid) => get(`/caregiver/dashboard/${patientUid}`),
  enrolled: (params = {}) => get('/caregiver/enrolled', params),
  saveEnrolled: (body) => post('/caregiver/enrolled', body),
  deleteEnrolled: (id, params = {}) => del(`/caregiver/enrolled/${id}`, params),
  engagement: (patientUid) => get(`/caregiver/engagement/${patientUid}`),
  reminders: (params = {}) => get('/caregiver/reminders', params),
  saveReminder: (body) => post('/caregiver/reminders', body),
  deleteReminder: (id, params = {}) => del(`/caregiver/reminders/${id}`, params),
  alerts: (params = {}) => get('/caregiver/alerts', params),
  resolveAlert: (id, params = {}) => post(`/caregiver/alerts/${id}/resolve`, params),
  deletePatientPermanently: (patientUid) => del(`/caregiver/patient/${patientUid}/permanent`),
}

// Global reference array to prevent Chromium Garbage Collection bug
if (typeof window !== 'undefined') {
  window._speechUtterances = window._speechUtterances || []
}

export function speakText(
  text,
  {
    rate = 0.88,
    pitch = 1.0,
    volume = 1.0,
    voice = null,
    onStart,
    onEnd,
    onError,
  } = {}
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('EchoMind TTS: Web Speech API not supported in this browser')
    if (onError) onError(new Error('TTS not supported'))
    return null
  }

  // Cancel any ongoing speech and ensure synthesis is unpaused
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
    window.speechSynthesis.cancel()
    window._speechUtterances = []
  } catch (err) {
    console.warn('TTS reset error:', err)
  }

  if (!text || typeof text !== 'string') return null

  // Strip SSML / HTML tags
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim()
  if (!cleanText) return null

  // Small timeout to allow cancel() to complete in Chromium
  setTimeout(() => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }

      // Load available voices
      let voices = window.speechSynthesis.getVoices() || []

      function pickVoice() {
        if (voice) {
          const match = voices.find((v) => v.name === voice || v.voiceURI === voice)
          if (match) return match
        }
        // Choose best English natural voice
        return (
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Zira') || v.name.includes('David') || v.name.includes('Samantha') || v.name.includes('Google'))) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0] ||
          null
        )
      }

      const chosenVoice = pickVoice()

      // Split into sentence chunks to prevent Chrome 15-second speech cutoff on Windows
      const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText]

      sentences.forEach((sentence, idx) => {
        const trimmed = sentence.trim()
        if (!trimmed) return

        const utt = new SpeechSynthesisUtterance(trimmed)
        utt.rate = rate
        utt.pitch = pitch
        utt.volume = volume
        if (chosenVoice) utt.voice = chosenVoice

        if (idx === 0) {
          utt.onstart = () => {
            if (onStart) onStart()
          }
        }

        if (idx === sentences.length - 1) {
          utt.onend = () => {
            window._speechUtterances = []
            if (onEnd) onEnd()
          }
        }

        utt.onerror = (e) => {
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.warn('TTS utterance error:', e.error)
          }
          if (idx === sentences.length - 1) {
            window._speechUtterances = []
            if (onError) onError(e)
          }
        }

        // Store reference on window to prevent Chromium GC bug
        window._speechUtterances.push(utt)
        window.speechSynthesis.speak(utt)
      })

      // Chromium keep-alive timer for speech longer than 15s
      if (window._ttsKeepAlive) clearInterval(window._ttsKeepAlive)
      window._ttsKeepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(window._ttsKeepAlive)
        } else if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
      }, 3000)

    } catch (e) {
      console.error('SpeechSynthesis speak error:', e)
      if (onError) onError(e)
    }
  }, 60)
}

// ─── Default export ───────────────────────────────────────────────────────

export const api = { auth, memories, people, places, assistant, settings, caregiver, speakText }
export default api
