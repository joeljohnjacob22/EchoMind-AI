/**
 * EchoMind Backend — Winston logger
 */
import { createLogger, format, transports } from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.resolve(__dirname, '../../logs')
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true })

const { combine, timestamp, colorize, printf, json } = format

const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
  return `${timestamp} [${level}]: ${message}${metaStr}`
})

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      )
    }),
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
})

export default logger
