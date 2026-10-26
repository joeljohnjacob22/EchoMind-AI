/**
 * EchoMind Backend — Global error handler middleware
 */
import logger from '../config/logger.js'

export function errorHandler(err, req, res, _next) {
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum allowed size is 50 MB.' })
  }

  // Multer unexpected field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: `Unexpected file field: ${err.field}` })
  }

  // Validation errors from express-validator (manually passed)
  if (err.type === 'validation') {
    return res.status(422).json({ error: 'Validation failed', details: err.details })
  }

  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'

  logger.error('Unhandled error', {
    message,
    status,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  })
}

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
}
