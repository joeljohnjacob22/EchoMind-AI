/**
 * EchoMind Backend — Validation middleware helpers
 * Built on top of express-validator
 */
import { validationResult } from 'express-validator'

/**
 * Run after express-validator chains.
 * If there are errors, respond 422 immediately.
 */
export function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    })
  }
  next()
}
