/**
 * EchoMind Backend — Express application entry point
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  Express App                                                     │
 *  │  ├── CORS + Helmet + Compression                                 │
 *  │  ├── Rate limiting                                               │
 *  │  ├── Morgan HTTP logging                                         │
 *  │  ├── Routes                                                      │
 *  │  │   ├── /api/auth           → auth.js                           │
 *  │  │   ├── /api/memories       → memories.js                       │
 *  │  │   ├── /api/people         → people.js                         │
 *  │  │   ├── /api/places         → places.js                         │
 *  │  │   ├── /api/assistant      → assistant.js                      │
 *  │  │   ├── /api/settings       → settings.js                       │
 *  │  │   └── /api/caregiver      → caregiver.js                      │
 *  │  └── Global error handler                                        │
 *  └─────────────────────────────────────────────────────────────────┘
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { rateLimit } from 'express-rate-limit'

import { initFirebase } from './config/firebase.js'
import logger from './config/logger.js'

import authRoutes from './routes/auth.js'
import memoriesRoutes from './routes/memories.js'
import peopleRoutes from './routes/people.js'
import placesRoutes from './routes/places.js'
import assistantRoutes from './routes/assistant.js'
import settingsRoutes from './routes/settings.js'
import caregiverRoutes from './routes/caregiver.js'

import { errorHandler, notFound } from './middleware/errorHandler.js'

// ─── Firebase ──────────────────────────────────────────────────────────────
initFirebase()

// ─── App ───────────────────────────────────────────────────────────────────
const app = express()
const PORT = process.env.PORT || 5000

// ─── Security & performance middleware ────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images from Firebase Storage
}))

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. Postman, mobile apps)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error(`CORS: origin "${origin}" not allowed`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(compression())

// ─── Rate limiting ─────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit for auth endpoints
  message: { error: 'Too many authentication attempts. Please try again later.' },
})

app.use(globalLimiter)

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// ─── HTTP logging ──────────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
)

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'EchoMind Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

app.get('/', (_req, res) => {
  res.json({
    name: 'EchoMind API',
    version: '1.0.0',
    docs: 'See /health for status. See server/README.md for API reference.',
  })
})

// ─── Static files (Local storage fallback) ─────────────────────────────────
import path from 'path'
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads', 'public')))

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/memories', memoriesRoutes)
app.use('/api/people', peopleRoutes)
app.use('/api/places', placesRoutes)
app.use('/api/assistant', assistantRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/caregiver', caregiverRoutes)

// ─── 404 & Error handling ──────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── Start server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🧠 EchoMind backend running at http://localhost:${PORT}`)
  logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`   Firebase project: ${process.env.FIREBASE_PROJECT_ID || '(not set)'}`)
})

export default app
