/**
 * EchoMind Backend — Memories routes
 *
 * GET    /api/memories              — List all memories for the current user
 * POST   /api/memories              — Create a new memory (with file upload)
 * GET    /api/memories/:id          — Get a single memory
 * PATCH  /api/memories/:id          — Update a memory (title, description, tags, etc.)
 * DELETE /api/memories/:id          — Delete a memory (and its files)
 * POST   /api/memories/:id/favorite — Toggle favorite
 * GET    /api/memories/:id/narrate  — Get AI narration for a memory
 * GET    /api/memories/search       — Full-text search across memories
 */
import { Router } from 'express'
import { body, query, param } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import { getFirestore } from '../config/firebase.js'
import { authenticate, requireCaregiver } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { uploadMemoryFiles } from '../config/multer.js'
import {
  uploadToStorage,
  deleteFromStorage,
  cleanLocalFile,
  buildStoragePath,
} from '../services/storageService.js'
import { generateNarration, generateTags, generateSSML } from '../services/aiService.js'
import logger from '../config/logger.js'

const router = Router()
router.use(authenticate)

// ─── Helpers ───────────────────────────────────────────────────────────────

async function fetchPeopleNames(db, userId, peopleIds) {
  if (!peopleIds || peopleIds.length === 0) return []
  const snaps = await Promise.all(
    peopleIds.map((id) => db.collection('users').doc(userId).collection('people').doc(id).get())
  )
  return snaps.filter((s) => s.exists).map((s) => s.data().name)
}

function resolveUserId(req) {
  // Caregivers and Admins can manage a patient's memories via ?patientId= or body.patientId
  if (req.user.role === 'caregiver' || req.user.role === 'admin') {
    return req.query.patientId || req.body?.patientId || req.user.uid
  }
  return req.user.uid
}

// ─── GET /memories ─────────────────────────────────────────────────────────

router.get(
  '/',
  [
    query('patientId').optional().isString(),
    query('favorite').optional().isBoolean(),
    query('type').optional().isIn(['photo', 'video', 'audio']),
    query('year').optional().isInt({ min: 1900, max: 2100 }),
    query('personId').optional().isString(),
    query('placeId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = resolveUserId(req)
      const db = getFirestore()
      const { favorite, type, year, personId, limit = 50, offset = 0 } = req.query

      let ref = db.collection('users').doc(userId).collection('memories')
      let q = ref.orderBy('createdAt', 'desc')

      if (favorite === 'true') q = ref.where('favorite', '==', true).orderBy('createdAt', 'desc')
      if (type) q = ref.where('type', '==', type).orderBy('createdAt', 'desc')
      if (personId) q = ref.where('people', 'array-contains', personId).orderBy('createdAt', 'desc')

      const snap = await q.get()
      let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      // Client-side filters for unsupported Firestore compound queries
      if (year) {
        const y = parseInt(year)
        docs = docs.filter((m) => m.date && new Date(m.date).getFullYear() === y)
      }

      // Safety requirement (SRS 5.2): Never present content that could cause distress to patient
      if (req.user.role === 'patient') {
        docs = docs.filter((m) => !m.distressing)
      }

      const total = docs.length
      const paginated = docs.slice(parseInt(offset), parseInt(offset) + parseInt(limit))

      return res.json({ memories: paginated, total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) {
      next(err)
    }
  }
)

// ─── GET /memories/timeline (FR-MCM-02) ────────────────────────────────────
/**
 * Organize memory content into chronological timelines representing life events.
 */
router.get('/timeline', async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()

    const snap = await db.collection('users').doc(userId).collection('memories').get()
    let memories = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Filter out distressing memories for patient safety
    if (req.user.role === 'patient') {
      memories = memories.filter((m) => !m.distressing)
    }

    // Sort chronologically (oldest to newest for timeline journey, or newest to oldest)
    memories.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || '1970-01-01').getTime()
      const dateB = new Date(b.date || b.createdAt || '1970-01-01').getTime()
      return dateA - dateB
    })

    // Group into chronological eras / years
    const timelineByYear = {}
    for (const mem of memories) {
      const d = mem.date ? new Date(mem.date) : new Date(mem.createdAt || Date.now())
      const year = isNaN(d.getFullYear()) ? 'Other Times' : d.getFullYear().toString()
      if (!timelineByYear[year]) {
        timelineByYear[year] = {
          year,
          memories: [],
          milestoneCount: 0,
        }
      }
      timelineByYear[year].memories.push(mem)
      if (mem.favorite || mem.tags?.includes('birthday') || mem.tags?.includes('celebration')) {
        timelineByYear[year].milestoneCount++
      }
    }

    const eras = Object.values(timelineByYear)

    return res.json({
      totalMemories: memories.length,
      eras,
      chronologicalList: memories,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /memories/recommendations (FR-REC-01 to FR-REC-04) ────────────────
/**
 * Contextual recommendation engine: recommends memories as a narrative sequence
 * adapted to time-of-day, caregiver priorities, and engagement history.
 */
router.get('/recommendations', async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()

    const snap = await db.collection('users').doc(userId).collection('memories').get()
    let memories = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Filter out distressing content
    memories = memories.filter((m) => !m.distressing)

    // Determine time of day (morning: 5-12, afternoon: 12-17, evening: 17-23/night: 23-5)
    const hour = new Date().getHours()
    let timeOfDay = 'morning'
    let narrativeTheme = 'Gentle Morning Reminiscence'
    let promptText = 'Start your day with these sunny, heartwarming moments from your family.'

    if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon'
      narrativeTheme = 'Afternoon Journeys & Adventures'
      promptText = 'A pleasant afternoon stroll through your favorite travels and scenic places.'
    } else if (hour >= 17) {
      timeOfDay = 'evening'
      narrativeTheme = 'Comforting Evening Family Stories'
      promptText = 'Relax and wind down with cherished family celebrations and peaceful stories.'
    }

    // Score and rank memories:
    // 1. Caregiver prioritized memories (FR-REC-04) get highest weight (+100)
    // 2. Favorites (+40)
    // 3. Time-of-day matching (+30)
    // 4. Low access count boost to re-introduce forgotten memories (+20)
    const scored = memories.map((m) => {
      let score = 0
      if (m.priority) score += 100
      if (m.favorite) score += 40

      const tags = (m.tags || []).map((t) => t.toLowerCase())
      const titleDesc = `${m.title || ''} ${m.description || ''}`.toLowerCase()

      if (timeOfDay === 'morning' && (tags.includes('garden') || tags.includes('morning') || titleDesc.includes('garden') || titleDesc.includes('walk'))) {
        score += 30
      } else if (timeOfDay === 'afternoon' && (tags.includes('travel') || tags.includes('trip') || titleDesc.includes('munnar') || titleDesc.includes('tea'))) {
        score += 30
      } else if (timeOfDay === 'evening' && (tags.includes('dinner') || tags.includes('birthday') || tags.includes('celebration') || titleDesc.includes('family') || titleDesc.includes('feast'))) {
        score += 30
      }

      // Re-surfacing less-viewed memories for gentle cognitive stimulation
      const accessCount = m.accessCount || 0
      if (accessCount === 0) score += 25
      else if (accessCount < 3) score += 15

      return { ...m, recommendationScore: score }
    })

    scored.sort((a, b) => b.recommendationScore - a.recommendationScore)

    // Return as a structured narrative sequence (FR-REC-02)
    const narrativeSequence = scored.slice(0, 6)

    return res.json({
      timeOfDay,
      narrativeTheme,
      promptText,
      narrativeSequence,
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /memories/:id/engage (FR-REC-03 & FR-CGD-02) ────────────────────
/**
 * Track patient engagement with a memory (views, narrations, audio plays).
 */
router.post('/:id/engage', async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()
    const memoryId = req.params.id

    const ref = db.collection('users').doc(userId).collection('memories').doc(memoryId)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

    const currentAccess = (doc.data().accessCount || 0) + 1
    await ref.update({
      accessCount: currentAccess,
      lastAccessedAt: new Date().toISOString(),
    })

    // Log engagement entry
    await db.collection('users').doc(userId).collection('engagementLogs').add({
      memoryId,
      memoryTitle: doc.data().title || 'Untitled',
      type: req.body.type || 'view', // 'view' | 'narration' | 'voice_play' | 'recognized'
      timestamp: new Date().toISOString(),
      userId,
    })

    return res.json({ success: true, accessCount: currentAccess })
  } catch (err) {
    next(err)
  }
})

// ─── GET /memories/search ──────────────────────────────────────────────────

router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' })
    }

    const userId = resolveUserId(req)
    const db = getFirestore()
    const snap = await db.collection('users').doc(userId).collection('memories').get()
    const query = q.toLowerCase()

    const results = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => {
        const text = `${m.title} ${m.description} ${m.location} ${(m.tags || []).join(' ')}`.toLowerCase()
        return text.includes(query)
      })

    return res.json({ memories: results, total: results.length })
  } catch (err) {
    next(err)
  }
})

// ─── POST /memories ────────────────────────────────────────────────────────

router.post(
  '/',
  uploadMemoryFiles,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').optional().trim(),
    body('location').optional().trim(),
    body('description').optional().trim(),
    body('people').optional(),
    body('favorite').optional().isBoolean(),
    body('type').optional().isIn(['photo', 'video', 'audio']).withMessage('type must be photo, video, or audio'),
    body('patientId').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    const localFiles = []
    try {
      const userId = resolveUserId(req)
      const db = getFirestore()

      const {
        title, date, location, description,
        favorite = false, type = 'photo',
      } = req.body

      let people = []
      try {
        people = req.body.people
          ? (typeof req.body.people === 'string' ? JSON.parse(req.body.people) : req.body.people)
          : []
      } catch {
        people = []
      }

      const memoryId = uuidv4()
      const photoUrls = []
      let videoUrl = null
      let audioUrl = null
      let thumbnailUrl = null

      // Upload photos
      if (req.files?.photos) {
        for (const f of req.files.photos) {
          localFiles.push(f.path)
          const sp = buildStoragePath(['users', userId, 'memories', memoryId, 'photos', f.filename])
          const url = await uploadToStorage(f.path, sp)
          photoUrls.push({ url, filename: f.originalname, storagePath: sp })
        }
        if (photoUrls.length > 0) thumbnailUrl = photoUrls[0].url
      }

      // Upload video
      if (req.files?.video?.[0]) {
        const f = req.files.video[0]
        localFiles.push(f.path)
        const sp = buildStoragePath(['users', userId, 'memories', memoryId, 'video', f.filename])
        videoUrl = await uploadToStorage(f.path, sp)
        if (!thumbnailUrl) thumbnailUrl = videoUrl
      }

      // Upload audio
      if (req.files?.audio?.[0]) {
        const f = req.files.audio[0]
        localFiles.push(f.path)
        const sp = buildStoragePath(['users', userId, 'memories', memoryId, 'audio', f.filename])
        audioUrl = await uploadToStorage(f.path, sp)
      }

      const now = new Date().toISOString()

      const memory = {
        title,
        date: date || null,
        location: location || null,
        description: description || null,
        people,
        favorite: favorite === true || favorite === 'true',
        type,
        photos: photoUrls,
        videoUrl,
        audioUrl,
        thumbnail: thumbnailUrl,
        tags: generateTags({ title, date, location, description, favorite, type }),
        createdAt: now,
        updatedAt: now,
        createdBy: req.user.uid,
      }

      await db
        .collection('users')
        .doc(userId)
        .collection('memories')
        .doc(memoryId)
        .set(memory)

      logger.info('Memory created', { memoryId, userId, title })

      return res.status(201).json({ memory: { id: memoryId, ...memory } })
    } catch (err) {
      next(err)
    } finally {
      // Clean up local temp files
      for (const f of localFiles) cleanLocalFile(f)
    }
  }
)

// ─── GET /memories/:id ─────────────────────────────────────────────────────

router.get('/:id', [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()
    const doc = await db
      .collection('users').doc(userId).collection('memories').doc(req.params.id).get()

    if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

    return res.json({ memory: { id: doc.id, ...doc.data() } })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /memories/:id ───────────────────────────────────────────────────

router.patch(
  '/:id',
  requireCaregiver,
  [
    param('id').notEmpty(),
    body('title').optional().trim().notEmpty(),
    body('date').optional().isISO8601(),
    body('location').optional().trim(),
    body('description').optional().trim(),
    body('people').optional(),
    body('favorite').optional().isBoolean(),
    body('tags').optional().isArray(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = resolveUserId(req)
      const db = getFirestore()
      const ref = db.collection('users').doc(userId).collection('memories').doc(req.params.id)
      const doc = await ref.get()
      if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

      const allowed = ['title', 'date', 'location', 'description', 'people', 'favorite', 'tags']
      const updates = {}
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key]
      }
      updates.updatedAt = new Date().toISOString()

      await ref.update(updates)
      logger.info('Memory updated', { memoryId: req.params.id, userId })

      return res.json({ memory: { id: doc.id, ...doc.data(), ...updates } })
    } catch (err) {
      next(err)
    }
  }
)

// ─── DELETE /memories/:id ──────────────────────────────────────────────────

router.delete('/:id', requireCaregiver, [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()
    const ref = db.collection('users').doc(userId).collection('memories').doc(req.params.id)
    const doc = await ref.get()

    if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

    const data = doc.data()

    // Delete all files from Firebase Storage
    const storageDeletions = []
    if (data.photos) {
      for (const p of data.photos) {
        if (p.storagePath) storageDeletions.push(deleteFromStorage(p.storagePath))
      }
    }
    if (data.videoUrl) {
      // Extract storage path from URL
      const match = data.videoUrl.match(/\/o\/(.*?)\?/)
      if (match) storageDeletions.push(deleteFromStorage(decodeURIComponent(match[1])))
    }
    await Promise.allSettled(storageDeletions)

    await ref.delete()
    logger.info('Memory deleted', { memoryId: req.params.id, userId })

    return res.json({ message: 'Memory deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// ─── POST /memories/:id/favorite ──────────────────────────────────────────

router.post('/:id/favorite', [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()
    const ref = db.collection('users').doc(userId).collection('memories').doc(req.params.id)
    const doc = await ref.get()

    if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

    const current = doc.data().favorite
    await ref.update({ favorite: !current, updatedAt: new Date().toISOString() })

    return res.json({ favorite: !current })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /memories/:id/distressing (5.2 Safety Requirements) ─────────────
router.patch('/:id/distressing', requireCaregiver, [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()
    const ref = db.collection('users').doc(userId).collection('memories').doc(req.params.id)
    const doc = await ref.get()

    if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

    const current = !!doc.data().distressing
    await ref.update({ distressing: !current, updatedAt: new Date().toISOString() })

    logger.info('Memory distressing flag toggled', { memoryId: req.params.id, distressing: !current })
    return res.json({ distressing: !current })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /memories/:id/priority (FR-REC-04) ──────────────────────────────
router.patch('/:id/priority', requireCaregiver, [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()
    const ref = db.collection('users').doc(userId).collection('memories').doc(req.params.id)
    const doc = await ref.get()

    if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

    const current = !!doc.data().priority
    await ref.update({ priority: !current, updatedAt: new Date().toISOString() })

    logger.info('Memory priority flag toggled', { memoryId: req.params.id, priority: !current })
    return res.json({ priority: !current })
  } catch (err) {
    next(err)
  }
})

// ─── GET /memories/:id/narrate ────────────────────────────────────────────

router.get('/:id/narrate', [param('id').notEmpty()], validate, async (req, res, next) => {
  try {
    const userId = resolveUserId(req)
    const db = getFirestore()

    const doc = await db.collection('users').doc(userId).collection('memories').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Memory not found' })

    const memory = { id: doc.id, ...doc.data() }

    // Fetch people names
    const peopleSnap = await db.collection('users').doc(userId).collection('people').get()
    const allPeople = peopleSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const names = allPeople
      .filter((p) => (memory.people || []).includes(p.id))
      .map((p) => p.name)

    const text = generateNarration(memory, names)
    const ssml = generateSSML(text)

    return res.json({ text, ssml })
  } catch (err) {
    next(err)
  }
})

export default router
