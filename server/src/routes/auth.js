/**
 * EchoMind Backend — Auth routes
 *
 * POST /api/auth/register   — Register a new user (patient or caregiver)
 * POST /api/auth/login      — Login and get a JWT token
 * POST /api/auth/refresh    — Refresh token (returns new JWT)
 * GET  /api/auth/me         — Get current user profile
 * POST /api/auth/logout     — Invalidate token (client-side; logged server-side)
 */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body } from 'express-validator'
import { getFirestore } from '../config/firebase.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import logger from '../config/logger.js'

const router = Router()

// ─── Helpers ───────────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

function safeUser(doc) {
  const { passwordHash, ...rest } = doc
  return rest
}

// ─── POST /register ────────────────────────────────────────────────────────

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role')
      .optional()
      .isIn(['patient', 'caregiver'])
      .withMessage('Role must be patient or caregiver'),
    body('caregiverCode')
      .if(body('role').equals('caregiver'))
      .notEmpty()
      .withMessage('Caregiver access code required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, name, role = 'patient', caregiverCode, patientId } = req.body
      const db = getFirestore()

      // Check caregiver code
      if (role === 'caregiver') {
        if (caregiverCode !== process.env.CAREGIVER_ACCESS_CODE) {
          return res.status(403).json({ error: 'Invalid caregiver access code' })
        }
      }

      // Check if email is already taken
      const existing = await db.collection('users').where('email', '==', email).limit(1).get()
      if (!existing.empty) {
        return res.status(409).json({ error: 'An account with this email already exists' })
      }

      const passwordHash = await bcrypt.hash(password, 12)
      const now = new Date().toISOString()

      const userDoc = {
        email,
        name,
        role,
        passwordHash,
        createdAt: now,
        updatedAt: now,
        settings: {
          theme: 'warm',
          fontSize: 'medium',
          speechRate: 0.85,
          voiceName: '',
          ttsEnabled: true,
        },
        ...(role === 'caregiver' && patientId ? { patientId } : {}),
      }

      const ref = await db.collection('users').add(userDoc)
      logger.info('New user registered', { uid: ref.id, role })

      const token = signToken({ uid: ref.id, email, role })
      return res.status(201).json({
        token,
        user: safeUser({ id: ref.id, ...userDoc }),
      })
    } catch (err) {
      next(err)
    }
  }
)

// ─── POST /login ───────────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body
      const db = getFirestore()

      const snap = await db.collection('users').where('email', '==', email).limit(1).get()
      if (snap.empty) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      const doc = snap.docs[0]
      const user = { id: doc.id, ...doc.data() }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      const token = signToken({ uid: user.id, email: user.email, role: user.role })
      logger.info('User logged in', { uid: user.id, role: user.role })

      // Update last login timestamp
      await doc.ref.update({ lastLoginAt: new Date().toISOString() })

      return res.json({ token, user: safeUser(user) })
    } catch (err) {
      next(err)
    }
  }
)

// ─── GET /me ───────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const db = getFirestore()
    const doc = await db.collection('users').doc(req.user.uid).get()
    if (!doc.exists) return res.status(404).json({ error: 'User not found' })

    return res.json({ user: safeUser({ id: doc.id, ...doc.data() }) })
  } catch (err) {
    next(err)
  }
})

// ─── POST /refresh ─────────────────────────────────────────────────────────

router.post('/refresh', authenticate, async (req, res) => {
  const token = signToken({
    uid: req.user.uid,
    email: req.user.email,
    role: req.user.role,
  })
  return res.json({ token })
})

// ─── POST /logout ──────────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  logger.info('User logged out', { uid: req.user.uid })
  return res.json({ message: 'Logged out successfully' })
})

// ─── POST /recover (FR-AUT-04) ─────────────────────────────────────────────
/**
 * Caregiver credential recovery / password reset mechanism.
 */
router.post(
  '/recover',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, newPassword } = req.body
      const db = getFirestore()

      const snap = await db.collection('users').where('email', '==', email).limit(1).get()
      if (snap.empty) {
        return res.status(404).json({ error: 'No account found with this email' })
      }

      const doc = snap.docs[0]
      const passwordHash = await bcrypt.hash(newPassword, 12)
      await doc.ref.update({
        passwordHash,
        updatedAt: new Date().toISOString(),
      })

      logger.info('User password reset successfully', { email })
      return res.json({ message: 'Password reset successfully. You can now log in.' })
    } catch (err) {
      next(err)
    }
  }
)

// ─── POST /quick-access (FR-AUT-02) ────────────────────────────────────────
/**
 * Simplified, low-friction access for patients on a dedicated device or kiosk.
 */
router.post('/quick-access', async (_req, res, next) => {
  try {
    const db = getFirestore()
    const snap = await db.collection('users').where('role', '==', 'patient').limit(1).get()

    if (snap.empty) {
      return res.status(404).json({ error: 'No patient profile found. Please register a patient first.' })
    }

    const doc = snap.docs[0]
    const user = { id: doc.id, ...doc.data() }
    const token = signToken({ uid: user.id, email: user.email, role: user.role })

    logger.info('Patient quick access logged in', { uid: user.id })
    return res.json({ token, user: safeUser(user) })
  } catch (err) {
    next(err)
  }
})

export default router
