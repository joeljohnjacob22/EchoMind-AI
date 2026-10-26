/**
 * EchoMind Backend — Caregiver dashboard routes
 *
 * GET  /api/caregiver/patients        — List patients linked to this caregiver
 * GET  /api/caregiver/dashboard/:uid  — Overview stats for a patient
 * POST /api/caregiver/link            — Link caregiver to a patient
 */
import { Router } from 'express'
import { body, param } from 'express-validator'
import { getFirestore } from '../config/firebase.js'
import { authenticate, requireCaregiver } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { v4 as uuidv4 } from 'uuid'
import logger from '../config/logger.js'

const router = Router()
router.use(authenticate, requireCaregiver)

// ─── GET /caregiver/patients ───────────────────────────────────────────────

router.get('/patients', async (req, res, next) => {
  try {
    const db = getFirestore()
    let snap
    if (req.user.role === 'admin') {
      snap = await db.collection('users').where('role', '==', 'patient').get()
    } else {
      snap = await db
        .collection('users')
        .where('role', '==', 'patient')
        .where('caregiverId', '==', req.user.uid)
        .get()
    }

    const patients = snap.docs.map((d) => {
      const { passwordHash, ...rest } = d.data()
      return { id: d.id, ...rest }
    })

    return res.json({ patients })
  } catch (err) {
    next(err)
  }
})

// ─── POST /caregiver/link ─────────────────────────────────────────────────

router.post(
  '/link',
  [body('patientEmail').isEmail().normalizeEmail().withMessage('Valid patient email required')],
  validate,
  async (req, res, next) => {
    try {
      const db = getFirestore()
      const snap = await db
        .collection('users')
        .where('email', '==', req.body.patientEmail)
        .where('role', '==', 'patient')
        .limit(1)
        .get()

      if (snap.empty) {
        return res.status(404).json({ error: 'No patient found with that email' })
      }

      const patientRef = snap.docs[0].ref
      await patientRef.update({ caregiverId: req.user.uid })

      logger.info('Caregiver linked to patient', {
        caregiverId: req.user.uid,
        patientId: snap.docs[0].id,
      })

      return res.json({ message: 'Linked successfully', patientId: snap.docs[0].id })
    } catch (err) {
      next(err)
    }
  }
)

// ─── GET /caregiver/dashboard/:uid ────────────────────────────────────────

router.get(
  '/dashboard/:uid',
  [param('uid').notEmpty().withMessage('Patient UID required')],
  validate,
  async (req, res, next) => {
    try {
      const db = getFirestore()
      const patientId = req.params.uid

      const [userDoc, memoriesSnap, peopleSnap, placesSnap] = await Promise.all([
        db.collection('users').doc(patientId).get(),
        db.collection('users').doc(patientId).collection('memories').get(),
        db.collection('users').doc(patientId).collection('people').get(),
        db.collection('users').doc(patientId).collection('places').get(),
      ])

      if (!userDoc.exists) return res.status(404).json({ error: 'Patient not found' })

      const memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const favorites = memories.filter((m) => m.favorite)

      // Recent activity — last 5 memories
      const recent = [...memories]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((m) => ({ id: m.id, title: m.title, date: m.date, thumbnail: m.thumbnail }))

      // Type breakdown
      const typeBreakdown = memories.reduce((acc, m) => {
        acc[m.type || 'photo'] = (acc[m.type || 'photo'] || 0) + 1
        return acc
      }, {})

      const { passwordHash, ...patientData } = userDoc.data()

      return res.json({
        patient: { id: patientId, ...patientData },
        stats: {
          totalMemories: memories.length,
          favorites: favorites.length,
          people: peopleSnap.size,
          places: placesSnap.size,
          typeBreakdown,
        },
        recentMemories: recent,
      })
    } catch (err) {
      next(err)
    }
  }
)

// ─── GET /caregiver/enrolled (FR-FRM-05) ──────────────────────────────────
/**
 * Get all enrolled faces and personal objects for this patient.
 */
router.get('/enrolled', async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.user.uid
    const db = getFirestore()

    const [peopleSnap, objectsSnap] = await Promise.all([
      db.collection('users').doc(patientId).collection('people').get(),
      db.collection('users').doc(patientId).collection('enrolled_objects').get(),
    ])

    const faces = peopleSnap.docs.map((d) => ({ id: d.id, entityType: 'face', ...d.data() }))
    const objects = objectsSnap.docs.map((d) => ({ id: d.id, entityType: 'object', ...d.data() }))

    return res.json({ enrolled: [...faces, ...objects], faces, objects })
  } catch (err) {
    next(err)
  }
})

// ─── POST /caregiver/enrolled (FR-FRM-05) ─────────────────────────────────
/**
 * Register/enroll a new face or personal object with reference photo and labels.
 */
router.post('/enrolled', async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.body.patientId || req.user.uid
    const db = getFirestore()
    const { name, entityType = 'face', relation = '', category = '', notes = '', photo = '', tags = [] } = req.body

    if (!name?.trim()) return res.status(400).json({ error: 'Name / Label is required' })

    const id = uuidv4()
    const now = new Date().toISOString()

    if (entityType === 'face') {
      const personData = {
        name: name.trim(),
        relation: relation.trim() || 'Family',
        notes: notes.trim(),
        photo: photo || '/anna.jpg',
        createdAt: now,
        updatedAt: now,
      }
      await db.collection('users').doc(patientId).collection('people').doc(id).set(personData)
      return res.status(201).json({ entity: { id, entityType: 'face', ...personData } })
    } else {
      const objectData = {
        name: name.trim(),
        category: category.trim() || 'Personal Keepsake',
        description: notes.trim(),
        photo: photo || '/munnar.jpg',
        tags: Array.isArray(tags) ? tags : [name.trim().toLowerCase()],
        createdAt: now,
        updatedAt: now,
      }
      await db.collection('users').doc(patientId).collection('enrolled_objects').doc(id).set(objectData)
      return res.status(201).json({ entity: { id, entityType: 'object', ...objectData } })
    }
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /caregiver/enrolled/:id ───────────────────────────────────────
router.delete('/enrolled/:id', async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.user.uid
    const db = getFirestore()
    const { id } = req.params

    // Try deleting from both collections
    await Promise.all([
      db.collection('users').doc(patientId).collection('people').doc(id).delete(),
      db.collection('users').doc(patientId).collection('enrolled_objects').doc(id).delete(),
    ])

    return res.json({ message: 'Enrolled entity deleted' })
  } catch (err) {
    next(err)
  }
})

// ─── GET /caregiver/engagement/:uid (FR-CGD-02) ───────────────────────────
/**
 * Display patient engagement summaries, memories accessed, and interaction frequency.
 */
router.get('/engagement/:uid', async (req, res, next) => {
  try {
    const patientId = req.params.uid
    const db = getFirestore()

    const [memoriesSnap, logsSnap] = await Promise.all([
      db.collection('users').doc(patientId).collection('memories').get(),
      db.collection('users').doc(patientId).collection('engagementLogs').orderBy('timestamp', 'desc').limit(100).get(),
    ])

    const memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const logs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const totalAccesses = memories.reduce((acc, m) => acc + (m.accessCount || 0), 0)
    const voicePlays = logs.filter((l) => l.type === 'narration' || l.type === 'voice_play').length

    // Interaction frequency grouped by date (last 7 days)
    const dailyFrequency = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateKey = d.toISOString().split('T')[0]
      dailyFrequency[dateKey] = 0
    }

    logs.forEach((l) => {
      if (l.timestamp) {
        const k = l.timestamp.split('T')[0]
        if (dailyFrequency[k] !== undefined) dailyFrequency[k]++
      }
    })

    // Cognitive stimulation score
    let stimulationLevel = 'Active & Engaged'
    if (totalAccesses < 5) stimulationLevel = 'Needs Encouragement'
    else if (totalAccesses < 15) stimulationLevel = 'Moderate Engagement'

    return res.json({
      summary: {
        totalMemoriesAccessed: totalAccesses,
        voiceInteractions: voicePlays,
        stimulationLevel,
        recentLogs: logs.slice(0, 10),
      },
      dailyFrequency,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET & POST /caregiver/reminders (FR-CGD-03) ──────────────────────────
/**
 * Reminders schedules and prompts alongside memory content.
 */
router.get('/reminders', async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.user.uid
    const db = getFirestore()
    const snap = await db.collection('users').doc(patientId).collection('reminders').get()
    const reminders = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return res.json({ reminders })
  } catch (err) {
    next(err)
  }
})

router.post('/reminders', async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.body.patientId || req.user.uid
    const db = getFirestore()
    const { time, title, prompt, memoryId } = req.body

    if (!time || !title) return res.status(400).json({ error: 'Time and title required' })

    const id = uuidv4()
    const reminder = {
      id,
      time,
      title,
      prompt: prompt || '',
      memoryId: memoryId || null,
      active: true,
      createdAt: new Date().toISOString(),
    }

    await db.collection('users').doc(patientId).collection('reminders').doc(id).set(reminder)
    return res.status(201).json({ reminder })
  } catch (err) {
    next(err)
  }
})

router.delete('/reminders/:id', async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.user.uid
    const db = getFirestore()
    await db.collection('users').doc(patientId).collection('reminders').doc(req.params.id).delete()
    return res.json({ message: 'Reminder deleted' })
  } catch (err) {
    next(err)
  }
})

// ─── GET & POST /caregiver/alerts (FR-CGD-05) ─────────────────────────────
/**
 * Alerts for unrecognized faces/objects or low engagement patterns.
 */
router.get('/alerts', async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.user.uid
    const db = getFirestore()
    const snap = await db.collection('users').doc(patientId).collection('alerts').orderBy('timestamp', 'desc').limit(20).get()
    const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return res.json({ alerts })
  } catch (err) {
    next(err)
  }
})

router.post('/alerts/:id/resolve', async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.user.uid
    const db = getFirestore()
    await db.collection('users').doc(patientId).collection('alerts').doc(req.params.id).update({
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    })
    return res.json({ message: 'Alert resolved' })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /caregiver/patient/:uid/permanent (NFR-SEC-05) ────────────────
/**
 * Permanently delete a patient's data upon request (Right to be Forgotten).
 */
router.delete('/patient/:uid/permanent', async (req, res, next) => {
  try {
    const patientId = req.params.uid
    const db = getFirestore()

    // Delete subcollections
    const collections = ['memories', 'people', 'enrolled_objects', 'reminders', 'alerts', 'engagementLogs', 'places']
    for (const col of collections) {
      const snap = await db.collection('users').doc(patientId).collection(col).get()
      for (const d of snap.docs) {
        await d.ref.delete()
      }
    }

    // Delete patient user document
    await db.collection('users').doc(patientId).delete()

    logger.info('Patient data permanently deleted per GDPR/NFR-SEC-05 request', { patientId })
    return res.json({ message: 'Patient data permanently deleted' })
  } catch (err) {
    next(err)
  }
})

export default router
