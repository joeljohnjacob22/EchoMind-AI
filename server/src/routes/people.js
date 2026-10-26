/**
 * EchoMind Backend — People routes
 *
 * GET    /api/people           — List all known people for this user
 * POST   /api/people           — Add a new person (with optional avatar upload)
 * GET    /api/people/:id       — Get a single person + their memories
 * PATCH  /api/people/:id       — Update person details
 * DELETE /api/people/:id       — Remove a person
 * POST   /api/people/:id/recognize — Run face recognition on an image
 */
import { Router } from 'express'
import { body, param } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import { getFirestore } from '../config/firebase.js'
import { authenticate, requireCaregiver } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { uploadAvatar } from '../config/multer.js'
import {
  uploadToStorage,
  deleteFromStorage,
  cleanLocalFile,
  buildStoragePath,
} from '../services/storageService.js'
import { recognizeFaces } from '../services/aiService.js'
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

// ─── GET /people ───────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)

    const snap = await db.collection('users').doc(userId).collection('people').get()
    const people = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Attach memory count to each person
    const memoriesSnap = await db.collection('users').doc(userId).collection('memories').get()
    const memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const enriched = people.map((p) => ({
      ...p,
      memoryCount: memories.filter((m) => (m.people || []).includes(p.id)).length,
    }))

    return res.json({ people: enriched })
  } catch (err) {
    next(err)
  }
})

// ─── POST /people ──────────────────────────────────────────────────────────

router.post(
  '/',
  requireCaregiver,
  uploadAvatar,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('relation').trim().notEmpty().withMessage('Relation is required'),
    body('notes').optional().trim(),
    body('patientId').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    let localFile = null
    try {
      const userId = resolveUserId(req)
      const db = getFirestore()
      const { name, relation, notes } = req.body
      const personId = uuidv4()

      let photoUrl = null
      if (req.file) {
        localFile = req.file.path
        const sp = buildStoragePath(['users', userId, 'people', personId, req.file.filename])
        photoUrl = await uploadToStorage(req.file.path, sp)
      }

      const now = new Date().toISOString()
      const person = {
        name,
        relation,
        notes: notes || null,
        photo: photoUrl,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user.uid,
      }

      await db.collection('users').doc(userId).collection('people').doc(personId).set(person)
      logger.info('Person added', { personId, userId, name })

      return res.status(201).json({ person: { id: personId, ...person } })
    } catch (err) {
      next(err)
    } finally {
      if (localFile) cleanLocalFile(localFile)
    }
  }
)

// ─── GET /people/:id ───────────────────────────────────────────────────────

router.get('/:id', [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)

    const doc = await db.collection('users').doc(userId).collection('people').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Person not found' })

    // Get associated memories
    const memoriesSnap = await db
      .collection('users').doc(userId).collection('memories')
      .where('people', 'array-contains', req.params.id).get()

    const memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    return res.json({ person: { id: doc.id, ...doc.data() }, memories })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /people/:id ─────────────────────────────────────────────────────

router.patch(
  '/:id',
  requireCaregiver,
  uploadAvatar,
  [
    param('id').notEmpty(),
    body('name').optional().trim().notEmpty(),
    body('relation').optional().trim(),
    body('notes').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    let localFile = null
    try {
      const db = getFirestore()
      const userId = await resolveUserId(req, db)
      const ref = db.collection('users').doc(userId).collection('people').doc(req.params.id)
      const doc = await ref.get()
      if (!doc.exists) return res.status(404).json({ error: 'Person not found' })

      const updates = {}
      if (req.body.name) updates.name = req.body.name
      if (req.body.relation) updates.relation = req.body.relation
      if (req.body.notes !== undefined) updates.notes = req.body.notes

      if (req.file) {
        localFile = req.file.path
        const sp = buildStoragePath(['users', userId, 'people', req.params.id, req.file.filename])
        updates.photo = await uploadToStorage(req.file.path, sp)
      }

      updates.updatedAt = new Date().toISOString()
      await ref.update(updates)

      return res.json({ person: { id: doc.id, ...doc.data(), ...updates } })
    } catch (err) {
      next(err)
    } finally {
      if (localFile) cleanLocalFile(localFile)
    }
  }
)

// ─── DELETE /people/:id ────────────────────────────────────────────────────

router.delete('/:id', requireCaregiver, [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)
    const ref = db.collection('users').doc(userId).collection('people').doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: 'Person not found' })

    await ref.delete()
    logger.info('Person deleted', { personId: req.params.id, userId })

    return res.json({ message: 'Person removed successfully' })
  } catch (err) {
    next(err)
  }
})

// ─── POST /people/:id/recognize ───────────────────────────────────────────

router.post('/:id/recognize', requireCaregiver, async (req, res, next) => {
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)
    const { imageUrl } = req.body

    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' })

    const peopleSnap = await db.collection('users').doc(userId).collection('people').get()
    const people = peopleSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const results = await recognizeFaces(imageUrl, people)

    return res.json({ recognized: results })
  } catch (err) {
    next(err)
  }
})

export default router
