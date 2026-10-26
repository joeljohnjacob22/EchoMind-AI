/**
 * EchoMind Backend — JWT Authentication middleware
 *
 * Validates the Bearer token from the Authorization header.
 * Attaches decoded user payload to req.user.
 */
import jwt from 'jsonwebtoken'
import logger from '../config/logger.js'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded  // { uid, email, role }
    next()
  } catch (err) {
    logger.warn('JWT verification failed', { error: err.message })
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/** Only allow users with role = 'caregiver' or 'admin' */
export function requireCaregiver(req, res, next) {
  if (!req.user || (req.user.role !== 'caregiver' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Caregiver access required' })
  }
  next()
}

/** Only allow users with role = 'admin' */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

/** Allow both patient and caregiver */
export function requireAuth(req, res, next) {
  authenticate(req, res, next)
}
