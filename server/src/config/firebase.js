/**
 * EchoMind Backend — Firebase Admin SDK initializer
 * Supports both service-account JSON file and base64-encoded env var.
 */
import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from './logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let app

export function initFirebase() {
  if (admin.apps.length > 0) {
    app = admin.apps[0]
    return app
  }

  let credential

  // Option A: base64 env var (useful for CI / cloud platforms)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const json = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_B64,
      'base64'
    ).toString('utf8')
    credential = admin.credential.cert(JSON.parse(json))
    logger.info('Firebase: using base64 service account from env')

  // Option B: path to JSON file on disk
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const p = path.resolve(__dirname, '../../', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    if (existsSync(p)) {
      const json = JSON.parse(readFileSync(p, 'utf8'))
      credential = admin.credential.cert(json)
      logger.info(`Firebase: using service account file at ${p}`)
    } else {
      logger.warn(`Firebase: service account file not found at ${p}; falling back to application default credentials`)
      credential = admin.credential.applicationDefault()
    }

  } else {
    logger.warn('Firebase: no credentials configured; using application default credentials')
    credential = admin.credential.applicationDefault()
  }

  app = admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    projectId: process.env.FIREBASE_PROJECT_ID,
  })

  logger.info('Firebase Admin SDK initialized')
  return app
}

export function getFirestore() {
  return admin.firestore()
}

export function getStorage() {
  return admin.storage()
}

export function getAuth() {
  return admin.auth()
}

export default admin
