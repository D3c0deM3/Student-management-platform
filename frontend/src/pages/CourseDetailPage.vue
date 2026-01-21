<template>
  <q-page class="course-detail-page">
    <div class="course-detail-shell">
      <section class="detail-hero">
        <div class="hero-left">
          <div class="breadcrumb">
            <q-btn
              icon="arrow_back"
              flat
              round
              dense
              class="back-btn"
              @click="goBack"
            />
            <span class="breadcrumb-text">Courses</span>
          </div>
          <div class="hero-label">Course</div>
          <h1 class="hero-title">{{ course?.name || 'Course details' }}</h1>
          <p class="hero-subtitle">
            {{ courseSubtitle }}
          </p>
          <div class="hero-tags">
            <q-badge
              v-if="course?.status"
              class="status-pill"
              :class="course.status === 'active' ? 'status-active' : 'status-archived'"
              rounded
            >
              {{ course.status }}
            </q-badge>
            <div class="hero-meta">Instructor: {{ course?.teacher_name || 'Unassigned' }}</div>
          </div>
        </div>
        <div class="hero-right">
          <div class="stat-card">
            <div class="stat-label">Enrolled</div>
            <div class="stat-value">{{ enrolledCount }}</div>
            <div class="stat-meta">{{ activeEnrollments }} active</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Attendance</div>
            <div class="stat-value">{{ attendanceRate }}%</div>
            <div class="stat-meta">
              {{ attendanceMarked }} marked for {{ attendanceDate }}
            </div>
          </div>
        </div>
      </section>

      <section class="detail-grid">
        <div class="detail-main">
          <div class="section-card">
            <div class="section-header">
              <div>
                <div class="section-title">Gradebook</div>
                <div class="section-subtitle">
                  Track attendance and grades per student.
                </div>
              </div>
              <div class="section-actions">
                <q-input
                  v-model="rosterSearch"
                  dense
                  outlined
                  placeholder="Search students"
                  class="roster-search"
                  clearable
                >
                  <template #prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
                <q-input
                  v-model="attendanceDate"
                  dense
                  outlined
                  type="date"
                  class="date-input"
                />
              </div>
            </div>

            <div v-if="rosterLoading" class="loading-row">
              <q-spinner color="primary" size="28px" />
              <span>Loading students...</span>
            </div>

            <div v-else-if="filteredRoster.length" class="roster-table">
              <div class="roster-head">
                <span>Student</span>
                <span>Status</span>
                <span>Attendance</span>
                <span>Grade</span>
              </div>
              <div v-for="student in filteredRoster" :key="student.id" class="roster-row">
                <div class="student-cell">
                  <div class="student-name">{{ student.student_name }}</div>
                  <div class="student-email">{{ student.student_email || '-' }}</div>
                </div>
                <div class="status-cell">
                  <q-badge
                    class="status-pill"
                    :class="
                      student.status === 'completed'
                        ? 'status-complete'
                        : student.status === 'dropped'
                          ? 'status-archived'
                          : 'status-active'
                    "
                    rounded
                  >
                    {{ student.status || 'active' }}
                  </q-badge>
                </div>
                <div class="attendance-cell">
                  <q-select
                    :model-value="attendanceStatusFor(student.student_id)"
                    :options="attendanceOptions"
                    dense
                    outlined
                    emit-value
                    map-options
                    class="inline-select"
                    @update:model-value="(val) => updateAttendance(student, val)"
                  />
                </div>
                <div class="grade-cell">
                  <q-select
                    :model-value="student.grade || 'not_graded'"
                    :options="gradeOptions"
                    dense
                    outlined
                    emit-value
                    map-options
                    class="inline-select"
                    @update:model-value="(val) => updateGrade(student, val)"
                  />
                </div>
              </div>
            </div>
            <div v-else class="empty-state">No students enrolled yet.</div>
          </div>
        </div>

        <aside class="detail-rail">
          <div class="rail-card">
            <div class="section-title">Course details</div>
            <div class="rail-row">
              <span>Level</span>
              <strong>{{ course?.level || '-' }}</strong>
            </div>
            <div class="rail-row">
              <span>Duration</span>
              <strong>{{ course?.duration || '-' }}</strong>
            </div>
            <div class="rail-row">
              <span>Price</span>
              <strong>{{ formatCurrency(course?.price) }}</strong>
            </div>
            <div class="rail-row">
              <span>Created</span>
              <strong>{{ formatDate(course?.created_at) }}</strong>
            </div>
          </div>

          <div class="rail-card">
            <div class="section-title">Timetable</div>
            <div v-if="courseSchedule.length" class="schedule-list">
              <div v-for="slot in courseSchedule" :key="slot" class="schedule-row">
                {{ slot }}
              </div>
            </div>
            <div v-else class="empty-state">No timetable added yet.</div>
          </div>
        </aside>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const course = ref(null)
const roster = ref([])
const rosterSearch = ref('')
const rosterLoading = ref(false)
const attendanceDate = ref(new Date().toISOString().slice(0, 10))
const attendanceByStudent = ref({})

const attendanceOptions = [
  { label: 'Unmarked', value: 'unmarked' },
  { label: 'Present', value: 'present' },
  { label: 'Late', value: 'late' },
  { label: 'Excused', value: 'excused' },
  { label: 'Absent', value: 'absent' },
]

const gradeOptions = [
  { label: 'Not graded', value: 'not_graded' },
  { label: 'A+', value: 'A+' },
  { label: 'A', value: 'A' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B', value: 'B' },
  { label: 'B-', value: 'B-' },
  { label: 'C+', value: 'C+' },
  { label: 'C', value: 'C' },
  { label: 'C-', value: 'C-' },
  { label: 'Pass', value: 'Pass' },
  { label: 'Fail', value: 'Fail' },
  { label: 'Incomplete', value: 'Incomplete' },
]

const courseId = computed(() => Number(route.params.id))

const enrolledCount = computed(() => roster.value.length)
const activeEnrollments = computed(
  () => roster.value.filter((row) => row.status === 'active').length
)

const attendanceMarked = computed(() => Object.keys(attendanceByStudent.value).length)
const attendancePresent = computed(() =>
  Object.values(attendanceByStudent.value).filter((record) =>
    ['present', 'late', 'excused'].includes(record.status)
  ).length
)
const attendanceRate = computed(() => {
  if (!enrolledCount.value) {
    return 0
  }
  return Math.round((attendancePresent.value / enrolledCount.value) * 100)
})

const filteredRoster = computed(() => {
  if (!rosterSearch.value) {
    return roster.value
  }
  const term = rosterSearch.value.toLowerCase()
  return roster.value.filter((student) =>
    (student.student_name || '').toLowerCase().includes(term) ||
    (student.student_email || '').toLowerCase().includes(term)
  )
})

const courseSubtitle = computed(() => {
  if (!course.value) {
    return 'Review enrollments, grades, and attendance in one place.'
  }
  const parts = [course.value.level, course.value.duration].filter(Boolean)
  return parts.length
    ? `${parts.join(' - ')} program overview and weekly progress.`
    : 'Review enrollments, grades, and attendance in one place.'
})

const courseSchedule = computed(() => {
  if (!course.value) {
    return []
  }
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const times = ['09:00', '11:00', '14:00', '16:00']
  const index = course.value.id % days.length
  const time = times[course.value.id % times.length]
  return [
    `${days[index]} ${time} - ${nextTime(time)}`,
    `${days[(index + 2) % days.length]} ${time} - ${nextTime(time)}`,
  ]
})

function nextTime(value) {
  const [hour, minute] = value.split(':').map(Number)
  const nextHour = (hour + 2) % 24
  return `${String(nextHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  const amount = Number(value)
  if (Number.isNaN(amount)) {
    return value
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(value) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString()
}

async function fetchCourse() {
  if (!courseId.value) {
    return
  }
  try {
    const response = await api.get(`/courses/${courseId.value}`)
    course.value = response.data?.course || null
  } catch {
    course.value = null
    $q.notify({ type: 'negative', message: 'Unable to load course details.' })
  }
}

async function fetchRoster() {
  if (!courseId.value) {
    return
  }
  rosterLoading.value = true
  try {
    const response = await api.get(`/courses/${courseId.value}/enrollments`)
    const payload = response.data || {}
    const items = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.rows || payload.enrollments || []
    roster.value = items.map((item) => ({
      ...item,
      student_name: item.student_name || item.full_name || 'Student',
      student_email: item.student_email || item.email || '',
      grade: item.grade || null,
    }))
  } catch {
    roster.value = []
    $q.notify({ type: 'negative', message: 'Unable to load enrollments.' })
  } finally {
    rosterLoading.value = false
  }
}

async function fetchAttendance() {
  if (!courseId.value) {
    return
  }
  try {
    const response = await api.get(`/courses/${courseId.value}/attendance`, {
      params: { date: attendanceDate.value },
    })
    const payload = response.data || {}
    const items = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.rows || payload.attendance || []
    const map = {}
    items.forEach((record) => {
      map[record.student_id] = { id: record.id, status: record.status }
    })
    attendanceByStudent.value = map
  } catch {
    attendanceByStudent.value = {}
  }
}

function attendanceStatusFor(studentId) {
  return attendanceByStudent.value[studentId]?.status || 'unmarked'
}

async function updateAttendance(student, status) {
  if (!courseId.value || !student?.student_id) {
    return
  }
  const existing = attendanceByStudent.value[student.student_id]
  if (status === 'unmarked') {
    if (!existing) {
      return
    }
    try {
      await api.delete(`/attendance/${existing.id}`)
      const next = { ...attendanceByStudent.value }
      delete next[student.student_id]
      attendanceByStudent.value = next
    } catch {
      $q.notify({ type: 'negative', message: 'Unable to update attendance.' })
    }
    return
  }
  try {
    if (existing) {
      await api.put(`/attendance/${existing.id}`, { status })
      attendanceByStudent.value = {
        ...attendanceByStudent.value,
        [student.student_id]: { ...existing, status },
      }
    } else {
      await api.post('/attendance', {
        student_id: student.student_id,
        course_id: courseId.value,
        attendance_date: attendanceDate.value,
        status,
      })
      await fetchAttendance()
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to update attendance.' })
  }
}

async function updateGrade(student, value) {
  if (!student?.id) {
    return
  }
  const previous = student.grade
  const grade = value === 'not_graded' ? null : value
  student.grade = grade
  try {
    await api.put(`/enroll/${student.id}`, { grade })
  } catch {
    student.grade = previous
    $q.notify({ type: 'negative', message: 'Unable to update grade.' })
  }
}

function goBack() {
  router.push({ path: '/courses' })
}

async function loadCoursePage() {
  await Promise.all([fetchCourse(), fetchRoster(), fetchAttendance()])
}

watch(courseId, () => {
  course.value = null
  roster.value = []
  attendanceByStudent.value = {}
  loadCoursePage()
})

watch(attendanceDate, () => {
  fetchAttendance()
})

onMounted(loadCoursePage)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');

.course-detail-page {
  min-height: 100vh;
  padding: 32px 24px 60px;
  font-family: 'Sora', sans-serif;
  color: #0b1220;
  background:
    radial-gradient(circle at 15% 10%, rgba(20, 184, 166, 0.12), transparent 45%),
    radial-gradient(circle at 85% 0%, rgba(15, 23, 42, 0.08), transparent 40%),
    linear-gradient(180deg, #f8fafb, #edf2f7);
}

.course-detail-shell {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 22px;
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr);
  gap: 20px;
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.breadcrumb {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
}

.back-btn :deep(.q-icon) {
  color: #0f766e;
}

.breadcrumb-text {
  font-size: 12px;
  font-weight: 600;
  color: #0f766e;
}

.hero-label {
  margin-top: 14px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 11px;
  color: #64748b;
}

.hero-title {
  font-size: 30px;
  margin: 8px 0 10px;
}

.hero-subtitle {
  color: #5b6a7a;
  max-width: 520px;
}

.hero-tags {
  margin-top: 14px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.status-pill {
  text-transform: capitalize;
  font-weight: 600;
}

.status-active {
  background: rgba(16, 185, 129, 0.18);
  color: #0f766e;
}

.status-archived {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.status-complete {
  background: rgba(59, 130, 246, 0.2);
  color: #1d4ed8;
}

.hero-meta {
  font-size: 13px;
  color: #475569;
}

.hero-right {
  display: grid;
  gap: 14px;
}

.stat-card {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.94), rgba(15, 118, 110, 0.92));
  color: #f8fafc;
  border: 1px solid rgba(15, 118, 110, 0.4);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.2);
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(248, 250, 252, 0.7);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 6px;
}

.stat-meta {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(248, 250, 252, 0.7);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
}

.detail-main {
  display: grid;
  gap: 16px;
}

.section-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.section-title {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #0f172a;
}

.section-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.section-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.roster-search {
  min-width: 200px;
}

.date-input {
  min-width: 160px;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}

.roster-table {
  display: grid;
  gap: 12px;
}

.roster-head {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr 1.2fr;
  gap: 12px;
  padding: 0 8px 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #94a3b8;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.roster-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr 1.2fr;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.03);
  align-items: center;
}

.student-name {
  font-weight: 600;
}

.student-email {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.inline-select {
  min-width: 140px;
}

.detail-rail {
  display: grid;
  gap: 16px;
}

.rail-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
}

.rail-row {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 13px;
  color: #475569;
}

.rail-row strong {
  color: #0f172a;
}

.schedule-list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.schedule-row {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
  font-size: 13px;
  color: #475569;
}

.empty-state {
  font-size: 13px;
  color: #64748b;
  margin-top: 12px;
}

@media (max-width: 1100px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .detail-hero {
    grid-template-columns: 1fr;
  }

  .roster-head,
  .roster-row {
    grid-template-columns: 1fr;
  }
}
</style>
