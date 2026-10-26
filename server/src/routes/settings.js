/**
 * EchoMind Backend — Settings routes
 *
 * GET   /api/settings          — Get user settings
 * PATCH /api/settings          — Update user settings (theme, font, TTS, etc.)
 */
import { Router } from 'express'
import { body } from 'express-validator'
import { getFirestore } from '../config/firebase.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()
router.use(authenticate)

const DEFAULT_SETTINGS = {
  theme: 'warm',
  fontSize: 'medium',
  speechRate: 0.85,
  voiceName: '',
  ttsEnabled: true,
  highContrast: false,
  largeButtons: true,
  simplifiedNav: false,
  dailyReminderEnabled: false,
  dailyReminderTime: '09:00',
}

// ─── GET /settings ─────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const db = getFirestore()
    const targetUid = (req.user.role === 'caregiver' && req.query.patientId) ? req.query.patientId : req.user.uid
    const doc = await db.collection('users').doc(targetUid).get()

    if (!doc.exists) return res.status(404).json({ error: 'User not found' })

    const settings = { ...DEFAULT_SETTINGS, ...(doc.data().settings || {}) }
    return res.json({ settings })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /settings ───────────────────────────────────────────────────────

router.patch(
  '/',
  [
    body('theme').optional().isIn(['warm', 'calm', 'night', 'pastel']),
    body('fontSize').optional().isIn(['small', 'medium', 'large', 'xlarge']),
    body('speechRate').optional().isFloat({ min: 0.1, max: 3.0 }),
    body('voiceName').optional().isString(),
    body('ttsEnabled').optional().isBoolean(),
    body('highContrast').optional().isBoolean(),
    body('largeButtons').optional().isBoolean(),
    body('simplifiedNav').optional().isBoolean(),
    body('dailyReminderEnabled').optional().isBoolean(),
    body('dailyReminderTime').optional().matches(/^\d{2}:\d{2}$/),
    body('patientId').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const db = getFirestore()
      const targetUid = (req.user.role === 'caregiver' && (req.query.patientId || req.body?.patientId)) ? (req.query.patientId || req.body.patientId) : req.user.uid
      const ref = db.collection('users').doc(targetUid)
      const doc = await ref.get()
      if (!doc.exists) return res.status(404).json({ error: 'User not found' })

      const allowed = [
        'theme', 'fontSize', 'speechRate', 'voiceName', 'ttsEnabled',
        'highContrast', 'largeButtons', 'simplifiedNav',
        'dailyReminderEnabled', 'dailyReminderTime',
      ]

      const currentSettings = { ...DEFAULT_SETTINGS, ...(doc.data().settings || {}) }
      for (const key of allowed) {
        if (req.body[key] !== undefined) currentSettings[key] = req.body[key]
      }

      await ref.update({ settings: currentSettings, updatedAt: new Date().toISOString() })

      return res.json({ settings: currentSettings })
    } catch (err) {
      next(err)
    }
  }
)

export default router
