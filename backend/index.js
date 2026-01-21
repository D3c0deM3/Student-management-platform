const express = require('express')
const cors = require('cors')
const { db, initDb, verifyPassword, createSession } = require('./db')

initDb()

const app = express()
const port = process.env.PORT || 8080
const host = process.env.HOST || '0.0.0.0'

const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  'http://localhost:9000,https://student-management-platform-onjsoqxag.vercel.app,https://student-management-platform.fly.dev'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS blocked: ${origin}`))
    },
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

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

function normalizeStatus(value, allowed, fallback) {
  if (!value) {
    return fallback
  }
  const normalized = String(value).toLowerCase()
  return allowed.includes(normalized) ? normalized : fallback
}

function isUniqueViolation(error) {
  return error && error.code === 'SQLITE_CONSTRAINT_UNIQUE'
}

function parseId(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
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

app.use('/api', authMiddleware)

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization || ''
  const token = header.split(' ')[1]

  if (token) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token)
  }

  res.json({ success: true })
})

app.get('/api/auth/me', (req, res) => {
  res.json({ admin: req.admin })
})

app.get('/api/dashboard', (req, res) => {
  const studentsTotal = db.prepare('SELECT COUNT(*) AS count FROM students').get().count
  const studentsActive = db
    .prepare("SELECT COUNT(*) AS count FROM students WHERE status = 'active'")
    .get().count
  const coursesTotal = db.prepare('SELECT COUNT(*) AS count FROM courses').get().count
  const coursesActive = db
    .prepare("SELECT COUNT(*) AS count FROM courses WHERE status = 'active'")
    .get().count
  const teachersTotal = db.prepare('SELECT COUNT(*) AS count FROM teachers').get().count
  const teachersActive = db
    .prepare("SELECT COUNT(*) AS count FROM teachers WHERE status = 'active'")
    .get().count

  const attendanceTotals = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('present', 'late', 'excused') THEN 1 ELSE 0 END) AS attended
      FROM attendance_records
    `
    )
    .get()

  const attendanceRate = attendanceTotals.total
    ? Math.round((attendanceTotals.attended / attendanceTotals.total) * 100)
    : 0

  const recentStudents = db
    .prepare(
      `
      SELECT id, full_name, email, status, created_at
      FROM students
      ORDER BY datetime(created_at) DESC
      LIMIT 4
    `
    )
    .all()

  const coursePulseRaw = db
    .prepare(
      `
      SELECT c.id, c.name, COUNT(e.id) AS enrolled
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id
      ORDER BY enrolled DESC, c.name COLLATE NOCASE ASC
      LIMIT 3
    `
    )
    .all()

  const coursePulse = coursePulseRaw.map((course) => {
    const enrolled = course.enrolled || 0
    const capacity = Math.max(10, enrolled + Math.max(5, Math.ceil(enrolled * 0.2)))
    return {
      id: course.id,
      name: course.name,
      enrolled,
      capacity,
      progress: capacity ? Math.min(1, enrolled / capacity) : 0,
    }
  })

  res.json({
    totals: {
      students: { total: studentsTotal, active: studentsActive },
      courses: { total: coursesTotal, active: coursesActive },
      teachers: { total: teachersTotal, active: teachersActive },
      attendanceRate,
    },
    recentStudents,
    coursePulse,
  })
})

app.get('/api/students', (req, res) => {
  const { page, limit, offset } = parsePagination(req.query)
  const search = (req.query.search || '').toString().trim()
  const status = normalizeStatus(req.query.status, ['active', 'inactive'], '')

  const conditions = []
  const params = []

  if (search) {
    const term = `%${search}%`
    conditions.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)')
    params.push(term, term, term)
  }

  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM students ${whereClause}`)
    .get(...params).count

  const rows = db
    .prepare(
      `
      SELECT id, full_name, email, phone, status, created_at
      FROM students
      ${whereClause}
      ORDER BY full_name COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `
    )
    .all(...params, limit, offset)

  res.json({ data: rows, total, page, limit })
})

app.get('/api/students/:id', (req, res) => {
  const student = db
    .prepare(
      'SELECT id, full_name, email, phone, status, created_at, updated_at FROM students WHERE id = ?'
    )
    .get(req.params.id)

  if (!student) {
    res.status(404).json({ error: 'Student not found.' })
    return
  }

  res.json({ student })
})

app.post('/api/students', (req, res) => {
  const fullName = String(req.body?.full_name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase() || null
  const phone = String(req.body?.phone || '').trim() || null
  const status = normalizeStatus(req.body?.status, ['active', 'inactive'], 'active')

  if (!fullName) {
    res.status(400).json({ error: 'Full name is required.' })
    return
  }

  try {
    const result = db
      .prepare(
        'INSERT INTO students (full_name, email, phone, status) VALUES (?, ?, ?, ?)'
      )
      .run(fullName, email, phone, status)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Email already exists.' })
      return
    }
    res.status(500).json({ error: 'Unable to create student.' })
  }
})

app.put('/api/students/:id', (req, res) => {
  const fullName = String(req.body?.full_name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase() || null
  const phone = String(req.body?.phone || '').trim() || null
  const status = normalizeStatus(req.body?.status, ['active', 'inactive'], 'active')

  if (!fullName) {
    res.status(400).json({ error: 'Full name is required.' })
    return
  }

  try {
    const result = db
      .prepare(
        `
        UPDATE students
        SET full_name = ?, email = ?, phone = ?, status = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      )
      .run(fullName, email, phone, status, req.params.id)

    if (result.changes === 0) {
      res.status(404).json({ error: 'Student not found.' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Email already exists.' })
      return
    }
    res.status(500).json({ error: 'Unable to update student.' })
  }
})

app.delete('/api/students/:id', (req, res) => {
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Student not found.' })
    return
  }

  res.json({ success: true })
})

app.get('/api/courses', (req, res) => {
  const { page, limit, offset } = parsePagination(req.query)
  const search = (req.query.search || '').toString().trim()
  const status = normalizeStatus(req.query.status, ['active', 'archived'], '')

  const conditions = []
  const params = []

  if (search) {
    const term = `%${search}%`
    conditions.push('(c.name LIKE ? OR c.level LIKE ?)')
    params.push(term, term)
  }

  if (status) {
    conditions.push('c.status = ?')
    params.push(status)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM courses c ${whereClause}`)
    .get(...params).count

  const rows = db
    .prepare(
      `
      SELECT
        c.id,
        c.name,
        c.level,
        c.price,
        c.duration,
        c.status,
        c.created_at,
        c.teacher_id,
        t.full_name AS teacher_name
      FROM courses c
      LEFT JOIN teachers t ON t.id = c.teacher_id
      ${whereClause}
      ORDER BY c.name COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `
    )
    .all(...params, limit, offset)

  res.json({ data: rows, total, page, limit })
})

app.get('/api/courses/:id/enrollments', (req, res) => {
  const courseId = Number(req.params.id)
  const courseExists = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId)

  if (!courseExists) {
    res.status(404).json({ error: 'Course not found.' })
    return
  }

  const rows = db
    .prepare(
      `
      SELECT
        e.id,
        e.student_id,
        e.course_id,
        e.status,
        e.grade,
        e.start_date,
        s.full_name AS student_name,
        s.email AS student_email
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.course_id = ?
      ORDER BY s.full_name COLLATE NOCASE ASC
    `
    )
    .all(courseId)

  res.json({ data: rows })
})

app.get('/api/courses/:id/attendance', (req, res) => {
  const courseId = Number(req.params.id)
  const date =
    String(req.query.date || '').trim() || new Date().toISOString().slice(0, 10)

  const courseExists = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId)
  if (!courseExists) {
    res.status(404).json({ error: 'Course not found.' })
    return
  }

  const rows = db
    .prepare(
      `
      SELECT
        a.id,
        a.student_id,
        a.course_id,
        a.attendance_date,
        a.status,
        s.full_name AS student_name
      FROM attendance_records a
      JOIN students s ON s.id = a.student_id
      WHERE a.course_id = ? AND a.attendance_date = ?
    `
    )
    .all(courseId, date)

  res.json({ data: rows, date })
})

app.get('/api/courses/:id', (req, res) => {
  const course = db
    .prepare(
      `
      SELECT
        c.id,
        c.name,
        c.level,
        c.price,
        c.duration,
        c.status,
        c.created_at,
        c.updated_at,
        c.teacher_id,
        t.full_name AS teacher_name
      FROM courses c
      LEFT JOIN teachers t ON t.id = c.teacher_id
      WHERE c.id = ?
    `
    )
    .get(req.params.id)

  if (!course) {
    res.status(404).json({ error: 'Course not found.' })
    return
  }

  res.json({ course })
})

app.post('/api/courses', (req, res) => {
  const name = String(req.body?.name || '').trim()
  const level = String(req.body?.level || '').trim() || null
  const duration = String(req.body?.duration || '').trim() || null
  const status = normalizeStatus(req.body?.status, ['active', 'archived'], 'active')
  const teacherId = parseId(req.body?.teacher_id)
  const priceInput = req.body?.price
  const price =
    priceInput === '' || priceInput === null || priceInput === undefined
      ? null
      : Number(priceInput)

  if (!name) {
    res.status(400).json({ error: 'Course name is required.' })
    return
  }

  if (price !== null && Number.isNaN(price)) {
    res.status(400).json({ error: 'Price must be a number.' })
    return
  }

  if (teacherId) {
    const teacherExists = db
      .prepare('SELECT id FROM teachers WHERE id = ?')
      .get(teacherId)
    if (!teacherExists) {
      res.status(400).json({ error: 'Invalid teacher assignment.' })
      return
    }
  }

  try {
    const result = db
      .prepare(
        `
        INSERT INTO courses (name, level, price, duration, teacher_id, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(name, level, price, duration, teacherId, status)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Course name already exists.' })
      return
    }
    res.status(500).json({ error: 'Unable to create course.' })
  }
})

app.put('/api/courses/:id', (req, res) => {
  const name = String(req.body?.name || '').trim()
  const level = String(req.body?.level || '').trim() || null
  const duration = String(req.body?.duration || '').trim() || null
  const status = normalizeStatus(req.body?.status, ['active', 'archived'], 'active')
  const teacherId = parseId(req.body?.teacher_id)
  const priceInput = req.body?.price
  const price =
    priceInput === '' || priceInput === null || priceInput === undefined
      ? null
      : Number(priceInput)

  if (!name) {
    res.status(400).json({ error: 'Course name is required.' })
    return
  }

  if (price !== null && Number.isNaN(price)) {
    res.status(400).json({ error: 'Price must be a number.' })
    return
  }

  if (teacherId) {
    const teacherExists = db
      .prepare('SELECT id FROM teachers WHERE id = ?')
      .get(teacherId)
    if (!teacherExists) {
      res.status(400).json({ error: 'Invalid teacher assignment.' })
      return
    }
  }

  try {
    const result = db
      .prepare(
        `
        UPDATE courses
        SET name = ?,
            level = ?,
            price = ?,
            duration = ?,
            teacher_id = ?,
            status = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `
      )
      .run(name, level, price, duration, teacherId, status, req.params.id)

    if (result.changes === 0) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Course name already exists.' })
      return
    }
    res.status(500).json({ error: 'Unable to update course.' })
  }
})

app.delete('/api/courses/:id', (req, res) => {
  const result = db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Course not found.' })
    return
  }

  res.json({ success: true })
})

app.get('/api/teachers', (req, res) => {
  const { page, limit, offset } = parsePagination(req.query)
  const search = (req.query.search || '').toString().trim()
  const status = normalizeStatus(req.query.status, ['active', 'inactive'], '')

  const conditions = []
  const params = []

  if (search) {
    const term = `%${search}%`
    conditions.push('(full_name LIKE ? OR specialty LIKE ?)')
    params.push(term, term)
  }

  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM teachers ${whereClause}`)
    .get(...params).count

  const rows = db
    .prepare(
      `
      SELECT id, full_name, phone, specialty, status, created_at
      FROM teachers
      ${whereClause}
      ORDER BY full_name COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `
    )
    .all(...params, limit, offset)

  res.json({ data: rows, total, page, limit })
})

app.get('/api/teachers/:id', (req, res) => {
  const teacher = db
    .prepare(
      'SELECT id, full_name, phone, specialty, status, created_at, updated_at FROM teachers WHERE id = ?'
    )
    .get(req.params.id)

  if (!teacher) {
    res.status(404).json({ error: 'Teacher not found.' })
    return
  }

  res.json({ teacher })
})

app.post('/api/teachers', (req, res) => {
  const fullName = String(req.body?.full_name || '').trim()
  const phone = String(req.body?.phone || '').trim() || null
  const specialty = String(req.body?.specialty || '').trim() || null
  const status = normalizeStatus(req.body?.status, ['active', 'inactive'], 'active')

  if (!fullName) {
    res.status(400).json({ error: 'Full name is required.' })
    return
  }

  try {
    const result = db
      .prepare(
        'INSERT INTO teachers (full_name, phone, specialty, status) VALUES (?, ?, ?, ?)'
      )
      .run(fullName, phone, specialty, status)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (error) {
    res.status(500).json({ error: 'Unable to create teacher.' })
  }
})

app.put('/api/teachers/:id', (req, res) => {
  const fullName = String(req.body?.full_name || '').trim()
  const phone = String(req.body?.phone || '').trim() || null
  const specialty = String(req.body?.specialty || '').trim() || null
  const status = normalizeStatus(req.body?.status, ['active', 'inactive'], 'active')

  if (!fullName) {
    res.status(400).json({ error: 'Full name is required.' })
    return
  }

  const result = db
    .prepare(
      `
      UPDATE teachers
      SET full_name = ?, phone = ?, specialty = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `
    )
    .run(fullName, phone, specialty, status, req.params.id)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Teacher not found.' })
    return
  }

  res.json({ success: true })
})

app.delete('/api/teachers/:id', (req, res) => {
  const result = db.prepare('DELETE FROM teachers WHERE id = ?').run(req.params.id)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Teacher not found.' })
    return
  }

  res.json({ success: true })
})

app.post('/api/enroll', (req, res) => {
  const studentId = Number(req.body?.student_id)
  const courseId = Number(req.body?.course_id)
  const teacherId = req.body?.teacher_id ? Number(req.body.teacher_id) : null
  const startDate = String(req.body?.start_date || '').trim() || null
  const status = normalizeStatus(
    req.body?.status,
    ['active', 'completed', 'dropped'],
    'active'
  )
  const grade = String(req.body?.grade || '').trim() || null

  if (!studentId || !courseId) {
    res.status(400).json({ error: 'Student and course are required.' })
    return
  }

  const studentExists = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(studentId)
  const courseExists = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId)

  if (!studentExists || !courseExists) {
    res.status(400).json({ error: 'Invalid student or course.' })
    return
  }

  try {
    const result = db
      .prepare(
        `
        INSERT INTO enrollments (student_id, course_id, teacher_id, start_date, status, grade)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(studentId, courseId, teacherId, startDate, status, grade)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Student is already enrolled in this course.' })
      return
    }
    res.status(500).json({ error: 'Unable to add enrollment.' })
  }
})

app.put('/api/enroll/:id', (req, res) => {
  const gradeInput = String(req.body?.grade || '').trim()
  const grade = gradeInput || null

  const result = db
    .prepare(
      `
      UPDATE enrollments
      SET grade = ?, updated_at = datetime('now')
      WHERE id = ?
    `
    )
    .run(grade, req.params.id)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Enrollment not found.' })
    return
  }

  res.json({ success: true })
})

app.get('/api/students/:id/enrollments', (req, res) => {
  const studentId = Number(req.params.id)
  const studentExists = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(studentId)

  if (!studentExists) {
    res.status(404).json({ error: 'Student not found.' })
    return
  }

  const rows = db
    .prepare(
      `
      SELECT
        e.id,
        e.student_id,
        e.course_id,
        e.teacher_id,
        e.start_date,
        e.status,
        e.grade,
        e.created_at,
        c.name AS course_name,
        t.full_name AS teacher_name
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN teachers t ON t.id = e.teacher_id
      WHERE e.student_id = ?
      ORDER BY e.created_at DESC
    `
    )
    .all(studentId)

  res.json({ data: rows })
})

app.get('/api/students/:id/attendance', (req, res) => {
  const studentId = Number(req.params.id)
  const { page, limit, offset } = parsePagination(req.query)
  const courseId = parseId(req.query.course_id)

  const studentExists = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(studentId)

  if (!studentExists) {
    res.status(404).json({ error: 'Student not found.' })
    return
  }

  const conditions = ['a.student_id = ?']
  const params = [studentId]

  if (courseId) {
    conditions.push('a.course_id = ?')
    params.push(courseId)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM attendance_records a ${whereClause}`)
    .get(...params).count

  const rows = db
    .prepare(
      `
      SELECT
        a.id,
        a.student_id,
        a.course_id,
        a.attendance_date,
        a.status,
        a.notes,
        a.created_at,
        c.name AS course_name
      FROM attendance_records a
      JOIN courses c ON c.id = a.course_id
      ${whereClause}
      ORDER BY a.attendance_date DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(...params, limit, offset)

  res.json({ data: rows, total, page, limit })
})

app.post('/api/attendance', (req, res) => {
  const studentId = parseId(req.body?.student_id)
  const courseId = parseId(req.body?.course_id)
  const attendanceDate =
    String(req.body?.attendance_date || '').trim() ||
    new Date().toISOString().slice(0, 10)
  const status = normalizeStatus(
    req.body?.status,
    ['present', 'absent', 'late', 'excused'],
    'present'
  )
  const notes = String(req.body?.notes || '').trim() || null

  if (!studentId || !courseId) {
    res.status(400).json({ error: 'Student and course are required.' })
    return
  }

  const enrolled = db
    .prepare(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?'
    )
    .get(studentId, courseId)

  if (!enrolled) {
    res.status(400).json({ error: 'Student is not enrolled in this course.' })
    return
  }

  try {
    const result = db
      .prepare(
        `
        INSERT INTO attendance_records (student_id, course_id, attendance_date, status, notes)
        VALUES (?, ?, ?, ?, ?)
      `
      )
      .run(studentId, courseId, attendanceDate, status, notes)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Attendance already recorded for this date.' })
      return
    }
    res.status(500).json({ error: 'Unable to record attendance.' })
  }
})

app.put('/api/attendance/:id', (req, res) => {
  const status = normalizeStatus(
    req.body?.status,
    ['present', 'absent', 'late', 'excused'],
    'present'
  )
  const notes = String(req.body?.notes || '').trim() || null

  const result = db
    .prepare(
      `
      UPDATE attendance_records
      SET status = ?, notes = ?
      WHERE id = ?
    `
    )
    .run(status, notes, req.params.id)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Attendance record not found.' })
    return
  }

  res.json({ success: true })
})

app.delete('/api/attendance/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM attendance_records WHERE id = ?')
    .run(req.params.id)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Attendance record not found.' })
    return
  }

  res.json({ success: true })
})

app.delete('/api/enroll/:id', (req, res) => {
  const result = db.prepare('DELETE FROM enrollments WHERE id = ?').run(req.params.id)

  if (result.changes === 0) {
    res.status(404).json({ error: 'Enrollment not found.' })
    return
  }

  res.json({ success: true })
})

app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://${host}:${port}`)
})
