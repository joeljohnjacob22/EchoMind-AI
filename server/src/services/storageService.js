/**
 * EchoMind Backend — Firebase Storage service
 * Handles uploading, deleting, and generating signed URLs for media files.
 */
import { getStorage } from '../config/firebase.js'
import { readFileSync, unlinkSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import path from 'path'
import mime from 'mime-types'
import logger from '../config/logger.js'

/**
 * Upload a local file (placed by Multer) to Firebase Storage.
 * @param {string} localPath   - Absolute path to the temp file on disk
 * @param {string} storagePath - Destination path inside the bucket, e.g. "memories/uid/file.jpg"
 * @returns {Promise<string>}  - Public download URL
 */
export async function uploadToStorage(localPath, storagePath) {
  try {
    const bucket = getStorage().bucket()
    const contentType = mime.lookup(localPath) || 'application/octet-stream'

    await bucket.upload(localPath, {
      destination: storagePath,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
    })

    // Make the file publicly readable
    const file = bucket.file(storagePath)
    await file.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`
    logger.debug('Uploaded to Firebase Storage', { storagePath, publicUrl })
    return publicUrl
  } catch (err) {
    logger.warn('Firebase Storage failed, falling back to local storage', { error: err.message })
    
    // Create local public directory
    const publicDir = path.join(process.cwd(), 'uploads', 'public', path.dirname(storagePath))
    if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true })
    
    // Copy the file
    const destPath = path.join(process.cwd(), 'uploads', 'public', storagePath)
    copyFileSync(localPath, destPath)
    
    // Return localhost URL
    const port = process.env.PORT || 5000
    return `http://localhost:${port}/uploads/${storagePath}`
  }
}

/**
 * Delete a file from Firebase Storage by its full storage path.
 * @param {string} storagePath
 */
export async function deleteFromStorage(storagePath) {
  try {
    const bucket = getStorage().bucket()
    await bucket.file(storagePath).delete()
    logger.debug('Deleted from Firebase Storage', { storagePath })
  } catch (err) {
    logger.warn('Could not delete from storage (may not exist)', { storagePath, error: err.message })
  }
}

/**
 * Generate a signed URL valid for a given duration (default 1 hour).
 * Useful for private files.
 */
export async function getSignedUrl(storagePath, expiresInMs = 3600 * 1000) {
  const bucket = getStorage().bucket()
  const [url] = await bucket.file(storagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMs,
  })
  return url
}

/**
 * Clean up a local temp file created by Multer.
 */
export function cleanLocalFile(localPath) {
  try {
    if (existsSync(localPath)) unlinkSync(localPath)
  } catch (err) {
    logger.warn('Could not clean temp file', { localPath, error: err.message })
  }
}

/**
 * Build a Firebase Storage destination path.
 * e.g. "users/{uid}/memories/{memoryId}/photos/{filename}"
 */
export function buildStoragePath(parts) {
  return parts.join('/')
}
