const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const Database = require('better-sqlite3')

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'lms.sqlite')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, 'sha512')
    .toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') {
    return false
  }

  const [salt, originalHash] = stored.split(':')
  if (!salt || !originalHash) {
    return false
  }

  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, 'sha512')
    .toString('hex')

  const originalBuffer = Buffer.from(originalHash, 'hex')
  const hashBuffer = Buffer.from(hash, 'hex')
  if (originalBuffer.length !== hashBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(originalBuffer, hashBuffer)
}

function createSession(adminId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  db.prepare(
    'INSERT INTO admin_sessions (admin_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(adminId, token, expiresAt)

  return { token, expiresAt }
}

function seedAdmin() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get()
  if (count > 0) {
    return
  }

  const adminName = process.env.ADMIN_NAME || 'Admin'
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@lms.local')
    .trim()
    .toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  const passwordHash = hashPassword(adminPassword)
  db.prepare(
    'INSERT INTO admin_users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(adminName, adminEmail, passwordHash)
}

function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  db.exec(schema)
  seedAdmin()
}

module.exports = {
  db,
  initDb,
  hashPassword,
  verifyPassword,
  createSession,
}
