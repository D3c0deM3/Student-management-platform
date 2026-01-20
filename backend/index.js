const express = require('express')
const cors = require('cors')
const { db, initDb, verifyPassword, createSession } = require('./db')

initDb()

const app = express()
const port = process.env.PORT || 3001

app.use(
  cors({
    origin: 'http://localhost:9000',
    credentials: true,
  })
)
app.use(express.json())

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const session = db
    .prepare(
      `
      SELECT s.token, s.expires_at, a.id, a.name, a.email
      FROM admin_sessions s
      JOIN admin_users a ON a.id = s.admin_id
      WHERE s.token = ?
    `
    )
    .get(token)

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (new Date(session.expires_at) <= new Date()) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token)
    res.status(401).json({ error: 'Session expired' })
    return
  }

  req.admin = {
    id: session.id,
    name: session.name,
    email: session.email,
  }

  next()
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' })
    return
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const admin = db
    .prepare(
      'SELECT id, name, email, password_hash FROM admin_users WHERE email = ?'
    )
    .get(normalizedEmail)

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials.' })
    return
  }

  const session = createSession(admin.id)
  res.json({
    token: session.token,
    expiresAt: session.expiresAt,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  })
})

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const header = req.headers.authorization || ''
  const token = header.split(' ')[1]

  if (token) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token)
  }

  res.json({ success: true })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ admin: req.admin })
})

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`)
})
