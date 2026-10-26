/**
 * EchoMind Backend — Multer file upload configuration
 * Handles photos, videos, and audio files.
 * Files are stored locally in /uploads then uploaded to Firebase Storage.
 */
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { mkdirSync, existsSync } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_MIME = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  // Videos
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/aac',
])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed`), false)
  }
}

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10) // 50 MB default

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
})

/** Multer middleware accepting multiple files (photos, video, audio) */
export const uploadMemoryFiles = upload.fields([
  { name: 'photos', maxCount: 20 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'avatar', maxCount: 1 },
])

/** Single avatar upload */
export const uploadAvatar = upload.single('avatar')
