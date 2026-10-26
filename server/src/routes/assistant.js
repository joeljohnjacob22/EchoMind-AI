/**
 * EchoMind Backend — AI Assistant routes
 *
 * POST /api/assistant/chat       — Send a message, get an AI reply
 * POST /api/assistant/tts        — Generate TTS SSML for a given text
 * POST /api/assistant/narrate    — Narrate a given memory object
 * POST /api/assistant/recognize  — Run face recognition on an uploaded image
 * GET  /api/assistant/suggestions — Get smart conversation suggestions
 */
import { Router } from 'express'
import { body } from 'express-validator'
import { getFirestore } from '../config/firebase.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { uploadMemoryFiles } from '../config/multer.js'
import { uploadToStorage, cleanLocalFile, buildStoragePath } from '../services/storageService.js'
import {
  generateAssistantReply,
  generateNarration,
  generateSSML,
  recognizeFaces,
  recognizeEntity,
} from '../services/aiService.js'
import logger from '../config/logger.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
router.use(authenticate)

async function resolveUserId(req, db = getFirestore()) {
  if (req.user.role === 'caregiver' || req.user.role === 'admin') {
    const specified = req.query.patientId || req.body?.patientId
    if (specified) return specified
    // Check if user has patientId linked
    const userDoc = await db.collection('users').doc(req.user.uid).get()
    if (userDoc.exists && userDoc.data().patientId) {
      return userDoc.data().patientId
    }
    // Fallback to first patient in database for seamless experience
    const snap = await db.collection('users').where('role', '==', 'patient').limit(1).get()
    if (!snap.empty) {
      return snap.docs[0].id
    }
  }
  return req.user.uid
}

// ─── POST /assistant/chat ──────────────────────────────────────────────────

router.post(
  '/chat',
  [
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('memoryId').optional({ nullable: true }).isString(),
    body('patientId').optional({ nullable: true }).isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const db = getFirestore()
      const { message, memoryId } = req.body
      const userId = await resolveUserId(req, db)

      // Load context: current memory (if any), all people, all memories
      let memory = null
      if (memoryId) {
        const doc = await db
          .collection('users').doc(userId).collection('memories').doc(memoryId).get()
        if (doc.exists) memory = { id: doc.id, ...doc.data() }
      }

      const [peopleSnap, memoriesSnap] = await Promise.all([
        db.collection('users').doc(userId).collection('people').get(),
        db.collection('users').doc(userId).collection('memories').get(),
      ])

      const people = peopleSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      const {
        reply,
        intent,
        suggestions,
        matchedMemories = [],
        matchedPeople = [],
      } = await generateAssistantReply(message, memory, people, memories)

      // Persist conversation to Firestore
      const convRef = db
        .collection('users').doc(userId).collection('conversations')
        .doc('assistant')

      const entry = {
        userMessage: message,
        aiReply: reply,
        intent,
        memoryId: memoryId || null,
        timestamp: new Date().toISOString(),
      }

      await convRef.collection('messages').add(entry)

      logger.debug('Assistant reply generated', { intent, userId })

      return res.json({ reply, intent, suggestions, matchedMemories, matchedPeople })
    } catch (err) {
      next(err)
    }
  }
)

// ─── GET /assistant/history ────────────────────────────────────────────────

router.get('/history', async (req, res, next) => {
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)
    const limit = parseInt(req.query.limit || '50')

    const snap = await db
      .collection('users').doc(userId).collection('conversations')
      .doc('assistant').collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()

    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()
    return res.json({ messages })
  } catch (err) {
    next(err)
  }
})

// ─── POST /assistant/tts ───────────────────────────────────────────────────

router.post(
  '/tts',
  [
    body('text').trim().notEmpty().withMessage('Text is required'),
    body('rate').optional().isFloat({ min: 0.1, max: 3.0 }),
    body('pitch').optional().isFloat({ min: 0.0, max: 2.0 }),
    body('volume').optional().isFloat({ min: 0.0, max: 1.0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { text, rate = 0.85, pitch = 1.0, volume = 1.0 } = req.body
      const ssml = generateSSML(text, { rate, pitch, volume })

      // Also return phoneme hints for the frontend Web Speech API
      return res.json({
        text,
        ssml,
        settings: { rate, pitch, volume },
        hint: 'Use the ssml field with the Web Speech API on the client for best results.',
      })
    } catch (err) {
      next(err)
    }
  }
)

// ─── POST /assistant/narrate ───────────────────────────────────────────────

router.post(
  '/narrate',
  [body('memoryId').trim().notEmpty().withMessage('memoryId is required')],
  validate,
  async (req, res, next) => {
    try {
      const db = getFirestore()
      const userId = await resolveUserId(req, db)

      const doc = await db
        .collection('users').doc(userId).collection('memories').doc(req.body.memoryId).get()

      if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

      const memory = { id: doc.id, ...doc.data() }

      const peopleSnap = await db.collection('users').doc(userId).collection('people').get()
      const allPeople = peopleSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const names = allPeople
        .filter((p) => (memory.people || []).includes(p.id))
        .map((p) => p.name)

      const text = generateNarration(memory, names)
      const ssml = generateSSML(text)

      return res.json({ text, ssml, memory: { id: memory.id, title: memory.title } })
    } catch (err) {
      next(err)
    }
  }
)

// ─── POST /assistant/recognize (FR-FRM-01 to FR-FRM-06) ───────────────────
router.post('/recognize', uploadMemoryFiles, async (req, res, next) => {
  let localFile = null
  try {
    const db = getFirestore()
    const userId = await resolveUserId(req, db)

    let imageUrl = req.body.imageUrl
    const imageHint = req.body.imageHint || req.body.label || ''

    // If an image was uploaded, store it temporarily then process
    if (req.files?.photos?.[0]) {
      localFile = req.files.photos[0].path
      const sp = buildStoragePath(['users', userId, 'recognize', uuidv4() + '.jpg'])
      imageUrl = await uploadToStorage(localFile, sp)
    }

    const [peopleSnap, objectsSnap, memoriesSnap] = await Promise.all([
      db.collection('users').doc(userId).collection('people').get(),
      db.collection('users').doc(userId).collection('enrolled_objects').get(),
      db.collection('users').doc(userId).collection('memories').get(),
    ])

    const knownPeople = peopleSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const knownObjects = objectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const memories = memoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const result = await recognizeEntity({
      imageUrl,
      imageHint,
      knownPeople,
      knownObjects,
      memories,
    })

    // If unrecognized entity, notify caregiver (FR-FRM-06 & FR-CGD-05)
    if (!result.recognized) {
      await db.collection('users').doc(userId).collection('alerts').add({
        type: 'unrecognized_entity',
        title: 'Unrecognized Face / Object Encountered',
        message: 'The patient scanned an unfamiliar face or object using the camera.',
        imageUrl: imageUrl || null,
        timestamp: new Date().toISOString(),
        status: 'unread',
      })
      logger.info('Unrecognized entity alert logged for caregiver', { userId })
    }

    return res.json(result)
  } catch (err) {
    next(err)
  } finally {
    if (localFile) cleanLocalFile(localFile)
  }
})

// ─── GET /assistant/suggestions ───────────────────────────────────────────

router.get('/suggestions', async (_req, res) => {
  const suggestions = [
    'Who is in this memory?',
    'Where was this photo taken?',
    'Tell me about this memory',
    'Show my favorites',
    'Memories from 2022',
    'Who are the people I know?',
    'What happened on my birthday?',
    'Narrate this memory for me',
    'Show me garden memories',
    'When was this taken?',
  ]
  return res.json({ suggestions })
})

export default router
