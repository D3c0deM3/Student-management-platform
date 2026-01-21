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

function tableExists(name) {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name)
}

function columnExists(table, column) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  return columns.some((col) => col.name === column)
}

function createSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  db.exec(schema)
}

function migrateLegacySchema() {
  const migrate = db.transaction(() => {
    if (tableExists('students')) {
      db.exec('ALTER TABLE students RENAME TO students_old')
    }
    if (tableExists('courses')) {
      db.exec('ALTER TABLE courses RENAME TO courses_old')
    }
    if (tableExists('teachers')) {
      db.exec('ALTER TABLE teachers RENAME TO teachers_old')
    }
    if (tableExists('enrollments')) {
      db.exec('ALTER TABLE enrollments RENAME TO enrollments_old')
    }

    createSchema()

    if (tableExists('students_old')) {
      db.prepare(
        `
        INSERT INTO students (id, full_name, phone, email, status, created_at, updated_at)
        SELECT
          id,
          trim(first_name || ' ' || last_name),
          phone,
          NULLIF(email, ''),
          status,
          created_at,
          updated_at
        FROM students_old
      `
      ).run()
    }

    if (tableExists('teachers_old')) {
      db.prepare(
        `
        INSERT INTO teachers (id, full_name, phone, specialty, status, created_at, updated_at)
        SELECT
          id,
          trim(first_name || ' ' || last_name),
          phone,
          NULLIF(bio, ''),
          'active',
          created_at,
          updated_at
        FROM teachers_old
      `
      ).run()
    }

    if (tableExists('courses_old')) {
      db.prepare(
        `
        INSERT INTO courses (
          id,
          name,
          level,
          price,
          duration,
          teacher_id,
          status,
          created_at,
          updated_at
        )
        SELECT
          id,
          title,
          NULL,
          NULL,
          NULL,
          NULL,
          'active',
          created_at,
          updated_at
        FROM courses_old
      `
      ).run()
    }

    if (tableExists('enrollments_old')) {
      db.prepare(
        `
        INSERT INTO enrollments (
          id,
          student_id,
          course_id,
          teacher_id,
          start_date,
          status,
          created_at,
          updated_at
        )
        SELECT
          id,
          student_id,
          course_id,
          NULL,
          enrolled_at,
          CASE
            WHEN status = 'enrolled' THEN 'active'
            WHEN status = 'completed' THEN 'completed'
            WHEN status = 'dropped' THEN 'dropped'
            ELSE 'active'
          END,
          created_at,
          updated_at
        FROM enrollments_old
      `
      ).run()
    }

    if (tableExists('enrollments_old')) {
      db.exec('DROP TABLE enrollments_old')
    }
    if (tableExists('courses_old')) {
      db.exec('DROP TABLE courses_old')
    }
    if (tableExists('teachers_old')) {
      db.exec('DROP TABLE teachers_old')
    }
    if (tableExists('students_old')) {
      db.exec('DROP TABLE students_old')
    }
  })

  migrate()
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

function seedSampleData() {
  const minTeachers = 8
  const minCourses = 10
  const minStudents = 120
  const minEnrollments = 60
  const minAttendance = 120

  const now = Date.now()
  const daysAgo = (days) => new Date(now - days * 86400000).toISOString()
  const dateOnly = (days) => new Date(now - days * 86400000).toISOString().slice(0, 10)

  const transaction = db.transaction(() => {
    const teacherRows = db.prepare('SELECT id, full_name FROM teachers').all()
    const teacherIds = teacherRows.map((row) => row.id)
    const teacherNames = new Set(
      teacherRows.map((row) => row.full_name.toLowerCase())
    )
    const insertTeacher = db.prepare(
      `
      INSERT INTO teachers (full_name, phone, specialty, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
    const teacherSeeds = [
      ['Grace Kim', '555-0142', 'Mathematics', 'active', 34],
      ['Daniel Ortiz', '555-0187', 'Computer Science', 'active', 22],
      ['Priya Shah', '555-0119', 'Design', 'active', 18],
      ['Lucas Reed', '555-0133', 'Business', 'inactive', 40],
      ['Hannah Blake', '555-0191', 'Data Science', 'active', 12],
      ['Olivia Price', '555-0192', 'Product', 'active', 9],
      ['Victor Hughes', '555-0193', 'Finance', 'active', 14],
      ['Amelia Park', '555-0194', 'Marketing', 'active', 11],
      ['Ethan Cole', '555-0195', 'Cybersecurity', 'active', 16],
      ['Isabella Clarke', '555-0196', 'Operations', 'inactive', 28],
    ]

    teacherSeeds.forEach(([name, phone, specialty, status, createdDays]) => {
      if (teacherIds.length >= minTeachers) {
        return
      }
      const key = name.toLowerCase()
      if (teacherNames.has(key)) {
        return
      }
      const timestamp = daysAgo(createdDays)
      const result = insertTeacher.run(
        name,
        phone,
        specialty,
        status,
        timestamp,
        timestamp
      )
      teacherIds.push(result.lastInsertRowid)
      teacherNames.add(key)
    })

    if (teacherIds.length < minTeachers) {
      const firstNames = ['Maya', 'Caleb', 'Elena', 'Owen', 'Zara', 'Miles']
      const lastNames = ['Horton', 'Foster', 'Sanchez', 'Pierce', 'Barrett', 'Nguyen']
      const specialties = ['Engineering', 'UX Research', 'Finance', 'Leadership']
      let generatedIndex = 0
      for (let i = 0; i < firstNames.length && teacherIds.length < minTeachers; i += 1) {
        for (
          let j = 0;
          j < lastNames.length && teacherIds.length < minTeachers;
          j += 1
        ) {
          const name = `${firstNames[i]} ${lastNames[j]}`
          const key = name.toLowerCase()
          if (teacherNames.has(key)) {
            continue
          }
          const phone = `555-${String(2000 + generatedIndex).padStart(4, '0')}`
          const specialty = specialties[generatedIndex % specialties.length]
          const status = generatedIndex % 5 === 0 ? 'inactive' : 'active'
          const createdDays = 10 + generatedIndex
          const timestamp = daysAgo(createdDays)
          const result = insertTeacher.run(
            name,
            phone,
            specialty,
            status,
            timestamp,
            timestamp
          )
          teacherIds.push(result.lastInsertRowid)
          teacherNames.add(key)
          generatedIndex += 1
        }
      }
    }

    const courseRows = db
      .prepare('SELECT id, name, teacher_id FROM courses')
      .all()
      .map((row) => ({ id: row.id, name: row.name, teacher_id: row.teacher_id }))
    const courseNames = new Set(courseRows.map((row) => row.name.toLowerCase()))
    const insertCourse = db.prepare(
      `
      INSERT INTO courses (name, level, price, duration, teacher_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    const courseSeeds = [
      ['Frontend Bootcamp', 'Beginner', 450, '8 weeks', 0, 'active', 28],
      ['Data Analytics', 'Intermediate', 550, '10 weeks', 4, 'active', 25],
      ['UI/UX Intensive', 'Advanced', 600, '6 weeks', 2, 'active', 20],
      ['Backend Foundations', 'Intermediate', 500, '8 weeks', 1, 'active', 18],
      ['Product Management', 'Beginner', 400, '6 weeks', 3, 'archived', 35],
      ['Intro to Python', 'Beginner', 320, '6 weeks', 1, 'active', 15],
      ['Cloud Fundamentals', 'Beginner', 380, '6 weeks', 5, 'active', 12],
      ['Digital Marketing', 'Intermediate', 420, '8 weeks', 6, 'active', 9],
      ['Cybersecurity Basics', 'Intermediate', 520, '8 weeks', 8, 'active', 14],
      ['Project Leadership', 'Advanced', 610, '6 weeks', 7, 'archived', 30],
      ['Mobile Development', 'Intermediate', 560, '10 weeks', 2, 'active', 16],
      ['SQL Foundations', 'Beginner', 300, '6 weeks', 0, 'active', 21],
    ]

    courseSeeds.forEach(
      ([name, level, price, duration, teacherIndex, status, createdDays]) => {
        if (courseRows.length >= minCourses) {
          return
        }
        const key = name.toLowerCase()
        if (courseNames.has(key)) {
          return
        }
        const timestamp = daysAgo(createdDays)
        const teacherId =
          teacherIds.length > 0 ? teacherIds[teacherIndex % teacherIds.length] : null
        const result = insertCourse.run(
          name,
          level,
          price,
          duration,
          teacherId,
          status,
          timestamp,
          timestamp
        )
        courseRows.push({ id: result.lastInsertRowid, name, teacher_id: teacherId })
        courseNames.add(key)
      }
    )

    let extraCourseIndex = 1
    while (courseRows.length < minCourses) {
      const index = extraCourseIndex
      const name = `Special Topics ${index}`
      const key = name.toLowerCase()
      extraCourseIndex += 1
      if (courseNames.has(key)) {
        continue
      }
      const timestamp = daysAgo(8 + index)
      const teacherId = teacherIds.length
        ? teacherIds[index % teacherIds.length]
        : null
      const result = insertCourse.run(
        name,
        'Intermediate',
        440 + index * 5,
        '6 weeks',
        teacherId,
        'active',
        timestamp,
        timestamp
      )
      courseRows.push({ id: result.lastInsertRowid, name, teacher_id: teacherId })
      courseNames.add(key)
    }

    const studentRows = db
      .prepare('SELECT id, email FROM students')
      .all()
      .map((row) => ({ id: row.id, email: row.email }))
    const studentIds = studentRows.map((row) => row.id)
    const studentEmails = new Set(
      studentRows
        .map((row) => row.email)
        .filter(Boolean)
        .map((email) => email.toLowerCase())
    )
    const insertStudent = db.prepare(
      `
      INSERT INTO students (full_name, email, phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
    const studentSeeds = [
      ['Ariana Fields', 'ariana.fields@lms.local', '555-0101', 'active', 6],
      ['Marcus Lee', 'marcus.lee@lms.local', '555-0102', 'active', 12],
      ['Nina Patel', 'nina.patel@lms.local', '555-0103', 'active', 9],
      ['Julian Diaz', 'julian.diaz@lms.local', '555-0104', 'inactive', 22],
      ['Jamie Carter', 'jamie.carter@lms.local', '555-0105', 'active', 3],
      ['Sophia Grant', 'sophia.grant@lms.local', '555-0106', 'active', 15],
      ['Evan Brooks', 'evan.brooks@lms.local', '555-0107', 'inactive', 30],
      ['Olivia King', 'olivia.king@lms.local', '555-0108', 'active', 18],
      ['Noah Murphy', 'noah.murphy@lms.local', '555-0109', 'active', 27],
      ['Liam Walker', 'liam.walker@lms.local', '555-0110', 'active', 10],
      ['Ella Morgan', 'ella.morgan@lms.local', '555-0111', 'inactive', 35],
      ['Mason Reed', 'mason.reed@lms.local', '555-0112', 'active', 2],
      ['Chloe Rivera', 'chloe.rivera@lms.local', '555-0113', 'active', 7],
      ['Aiden Brooks', 'aiden.brooks@lms.local', '555-0114', 'active', 13],
      ['Harper Young', 'harper.young@lms.local', '555-0115', 'active', 19],
      ['Leo Martinez', 'leo.martinez@lms.local', '555-0116', 'inactive', 26],
      ['Sofia Bennett', 'sofia.bennett@lms.local', '555-0117', 'active', 4],
      ['Isaac Turner', 'isaac.turner@lms.local', '555-0118', 'active', 8],
    ]

    studentSeeds.forEach(([name, email, phone, status, createdDays]) => {
      if (studentIds.length >= minStudents) {
        return
      }
      const key = email.toLowerCase()
      if (studentEmails.has(key)) {
        return
      }
      const timestamp = daysAgo(createdDays)
      const result = insertStudent.run(
        name,
        email,
        phone,
        status,
        timestamp,
        timestamp
      )
      studentIds.push(result.lastInsertRowid)
      studentEmails.add(key)
    })

    if (studentIds.length < minStudents) {
      const firstNames = [
        'Ava',
        'Liam',
        'Mia',
        'Noah',
        'Zoe',
        'Ethan',
        'Luna',
        'Logan',
        'Ruby',
        'Owen',
        'Aria',
        'Caleb',
      ]
      const lastNames = [
        'Foster',
        'Hughes',
        'Bennett',
        'Morris',
        'Parker',
        'Sullivan',
        'Howard',
        'Wells',
        'Bishop',
        'Reynolds',
      ]
      let generatedIndex = 0
      for (
        let i = 0;
        i < firstNames.length && studentIds.length < minStudents;
        i += 1
      ) {
        for (
          let j = 0;
          j < lastNames.length && studentIds.length < minStudents;
          j += 1
        ) {
          const name = `${firstNames[i]} ${lastNames[j]}`
          const email = `${firstNames[i]}.${lastNames[j]}.${generatedIndex}@lms.local`
            .toLowerCase()
          if (studentEmails.has(email)) {
            generatedIndex += 1
            continue
          }
          const phone = `555-${String(1200 + generatedIndex).padStart(4, '0')}`
          const status = generatedIndex % 6 === 0 ? 'inactive' : 'active'
          const createdDays = 2 + (generatedIndex % 42)
          const timestamp = daysAgo(createdDays)
          const result = insertStudent.run(
            name,
            email,
            phone,
            status,
            timestamp,
            timestamp
          )
          studentIds.push(result.lastInsertRowid)
          studentEmails.add(email)
          generatedIndex += 1
        }
      }
    }

    if (studentIds.length && courseRows.length) {
      const teacherIdSet = new Set(teacherIds)
      const enrollmentPairs = new Set(
        db
          .prepare('SELECT student_id, course_id FROM enrollments')
          .all()
          .map((row) => `${row.student_id}:${row.course_id}`)
      )
      const maxPossible = studentIds.length * courseRows.length
      const targetEnrollments = Math.min(
        maxPossible,
        Math.max(minEnrollments, studentIds.length * 2)
      )
      const insertEnrollment = db.prepare(
        `
        INSERT OR IGNORE INTO enrollments (
          student_id,
          course_id,
          teacher_id,
          start_date,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      const statusCycle = ['active', 'active', 'completed', 'active', 'dropped']
      for (
        let sIndex = 0;
        sIndex < studentIds.length && enrollmentPairs.size < targetEnrollments;
        sIndex += 1
      ) {
        const studentId = studentIds[sIndex]
        const slots = Math.min(courseRows.length, 2 + (sIndex % 2))
        for (
          let cIndex = 0;
          cIndex < slots && enrollmentPairs.size < targetEnrollments;
          cIndex += 1
        ) {
          const course = courseRows[(sIndex + cIndex) % courseRows.length]
          const key = `${studentId}:${course.id}`
          if (enrollmentPairs.has(key)) {
            continue
          }
          const startDays = 24 - ((sIndex + cIndex) % 20)
          const createdAt = daysAgo(startDays)
          const startDate = dateOnly(startDays)
          const status = statusCycle[(sIndex + cIndex) % statusCycle.length]
          const fallbackTeacherId = teacherIds.length
            ? teacherIds[(sIndex + cIndex) % teacherIds.length]
            : null
          const courseTeacherId = teacherIdSet.has(course.teacher_id)
            ? course.teacher_id
            : null
          const teacherId = courseTeacherId || fallbackTeacherId
          insertEnrollment.run(
            studentId,
            course.id,
            teacherId,
            startDate,
            status,
            createdAt,
            createdAt
          )
          enrollmentPairs.add(key)
        }
      }
    }

    if (tableExists('attendance_records')) {
      const attendancePairs = new Set(
        db
          .prepare('SELECT student_id, course_id, attendance_date FROM attendance_records')
          .all()
          .map((row) => `${row.student_id}:${row.course_id}:${row.attendance_date}`)
      )
      const enrollments = db
        .prepare('SELECT student_id, course_id FROM enrollments')
        .all()
      const targetAttendance = Math.min(
        enrollments.length * 8,
        Math.max(minAttendance, enrollments.length * 4)
      )
      const insertAttendance = db.prepare(
        `
        INSERT OR IGNORE INTO attendance_records (
          student_id,
          course_id,
          attendance_date,
          status,
          notes,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      const statuses = ['present', 'present', 'late', 'absent', 'excused']
      let created = 0
      for (let i = 0; i < enrollments.length && created < targetAttendance; i += 1) {
        const enrollment = enrollments[i]
        for (let j = 0; j < 4 && created < targetAttendance; j += 1) {
          const dayOffset = (i + j) % 14
          const attendanceDate = dateOnly(dayOffset)
          const key = `${enrollment.student_id}:${enrollment.course_id}:${attendanceDate}`
          if (attendancePairs.has(key)) {
            continue
          }
          const status = statuses[(i + j) % statuses.length]
          const createdAt = daysAgo(dayOffset)
          insertAttendance.run(
            enrollment.student_id,
            enrollment.course_id,
            attendanceDate,
            status,
            null,
            createdAt
          )
          attendancePairs.add(key)
          created += 1
        }
      }
    }
  })

  transaction()
}

function initDb() {
  if (!tableExists('students')) {
    createSchema()
    seedAdmin()
    seedSampleData()
    return
  }

  if (!columnExists('students', 'full_name')) {
    migrateLegacySchema()
    seedAdmin()
    seedSampleData()
    return
  }

  if (tableExists('courses') && !columnExists('courses', 'teacher_id')) {
    db.exec('ALTER TABLE courses ADD COLUMN teacher_id INTEGER')
  }

  if (tableExists('enrollments')) {
    if (!columnExists('enrollments', 'teacher_id')) {
      db.exec('ALTER TABLE enrollments ADD COLUMN teacher_id INTEGER')
    }
    if (!columnExists('enrollments', 'start_date')) {
      db.exec('ALTER TABLE enrollments ADD COLUMN start_date TEXT')
    }
    if (!columnExists('enrollments', 'status')) {
      db.exec("ALTER TABLE enrollments ADD COLUMN status TEXT DEFAULT 'active'")
      db.exec("UPDATE enrollments SET status = 'active' WHERE status IS NULL")
    }
    if (!columnExists('enrollments', 'grade')) {
      db.exec('ALTER TABLE enrollments ADD COLUMN grade TEXT')
    }
  }

  createSchema()
  seedAdmin()
  seedSampleData()
}

module.exports = {
  db,
  initDb,
  hashPassword,
  verifyPassword,
  createSession,
}
