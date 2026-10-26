/**
 * EchoMind Backend — Places routes
 *
 * GET    /api/places           — List all places for this user
 * POST   /api/places           — Add a new place
 * GET    /api/places/:id       — Get a place + its memories
 * PATCH  /api/places/:id       — Update a place
 * DELETE /api/places/:id       — Remove a place
 */
import { Router } from 'express'
import { body, param } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import { getFirestore } from '../config/firebase.js'
import { authenticate, requireCaregiver } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import logger from '../config/logger.js'

const router = Router()
router.use(authenticate)

async function resolveUserId(req, db = getFirestore()) {
  if (req.user.role === 'caregiver' || req.user.role === 'admin') {
    const specified = req.query.patientId || req.body?.patientId
    if (specified) return specified
    const userDoc = await db.collection('users').doc(req.user.uid).get()
    if (userDoc.exists && userDoc.data().patientId) {
      return userDoc.data().patientId
    }
    const snap = await db.collection('users').where('role', '==', 'patient').limit(1).get()
    if (!snap.empty) {
      return snap.docs[0].id
    }
  }
  return req.user.uid
}

// ─── GET /places ───────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)

    const snap = await db.collection('users').doc(userId).collection('places').get()
    const places = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Attach memory counts
    const memoriesSnap = await db.collection('users').doc(userId).collection('memories').get()
    const memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const enriched = places.map((p) => ({
      ...p,
      memoryCount: memories.filter(
        (m) => m.location && m.location.toLowerCase() === p.name.toLowerCase()
      ).length,
    }))

    return res.json({ places: enriched })
  } catch (err) {
    next(err)
  }
})

// ─── POST /places ──────────────────────────────────────────────────────────

router.post(
  '/',
  requireCaregiver,
  [
    body('name').trim().notEmpty().withMessage('Place name is required'),
    body('label').optional().trim(),
    body('description').optional().trim(),
    body('patientId').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const db = getFirestore()
      const userId = await resolveUserId(req, db)
      const { name, label, description } = req.body
      const placeId = uuidv4()
      const now = new Date().toISOString()

      const place = {
        name,
        label: label || name,
        description: description || null,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user.uid,
      }

      await db.collection('users').doc(userId).collection('places').doc(placeId).set(place)
      logger.info('Place added', { placeId, userId, name })

      return res.status(201).json({ place: { id: placeId, ...place } })
    } catch (err) {
      next(err)
    }
  }
)

// ─── GET /places/:id ───────────────────────────────────────────────────────

router.get('/:id', [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)

    const doc = await db.collection('users').doc(userId).collection('places').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Place not found' })

    const place = { id: doc.id, ...doc.data() }

    // Get related memories (by location string match)
    const memoriesSnap = await db.collection('users').doc(userId).collection('memories').get()
    const memories = memoriesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => m.location && m.location.toLowerCase() === place.name.toLowerCase())

    return res.json({ place, memories })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /places/:id ─────────────────────────────────────────────────────

router.patch(
  '/:id',
  requireCaregiver,
  [
    param('id').notEmpty(),
    body('name').optional().trim().notEmpty(),
    body('label').optional().trim(),
    body('description').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const db = getFirestore()
      const userId = await resolveUserId(req, db)
      const ref = db.collection('users').doc(userId).collection('places').doc(req.params.id)
      const doc = await ref.get()
      if (!doc.exists) return res.status(404).json({ error: 'Place not found' })

      const updates = {}
      if (req.body.name) updates.name = req.body.name
      if (req.body.label) updates.label = req.body.label
      if (req.body.description !== undefined) updates.description = req.body.description
      updates.updatedAt = new Date().toISOString()

      await ref.update(updates)
      return res.json({ place: { id: doc.id, ...doc.data(), ...updates } })
    } catch (err) {
      next(err)
    }
  }
)

// ─── DELETE /places/:id ────────────────────────────────────────────────────

router.delete('/:id', requireCaregiver, [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)
    const ref = db.collection('users').doc(userId).collection('places').doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: 'Place not found' })

    await ref.delete()
    logger.info('Place deleted', { placeId: req.params.id, userId })

    return res.json({ message: 'Place removed successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
