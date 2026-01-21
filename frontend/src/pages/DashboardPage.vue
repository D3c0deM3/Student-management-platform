<template>
  <q-page class="dashboard-page">
    <div class="dashboard-surface">
      <section class="hero reveal" style="--delay: 0s">
        <div>
          <div class="eyebrow">Admin Console</div>
          <h1 class="hero-title">Welcome back</h1>
          <p class="hero-subtitle">
            Keep enrollment, courses, and faculty aligned with a clear snapshot of
            everything happening today.
          </p>
          <div class="hero-actions">
            <q-btn
              label="Add Student"
              color="primary"
              unelevated
              class="btn-primary"
              :to="'/students'"
            />
            <q-btn
              label="Create Course"
              outline
              color="primary"
              class="btn-ghost"
              :to="'/courses'"
            />
          </div>
        </div>
        <div class="hero-panel">
          <div class="panel-label">Term Snapshot</div>
          <div class="panel-metric">{{ formatNumber(summary.studentsActive) }}</div>
          <div class="panel-caption">Active students this term</div>
          <div class="panel-stack">
            <div>
              <div class="panel-mini">{{ formatNumber(summary.coursesActive) }}</div>
              <div class="panel-mini-label">Courses</div>
            </div>
            <div>
              <div class="panel-mini">{{ formatNumber(summary.teachersActive) }}</div>
              <div class="panel-mini-label">Teachers</div>
            </div>
            <div>
              <div class="panel-mini">{{ formatPercent(summary.attendanceRate) }}</div>
              <div class="panel-mini-label">Attendance</div>
            </div>
          </div>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card reveal" style="--delay: 0.05s">
          <q-icon name="school" size="28px" class="stat-icon stat-icon-blue" />
          <div class="stat-value">{{ formatNumber(summary.studentsTotal) }}</div>
          <div class="stat-label">Total Students</div>
          <div class="stat-trend positive">+6.2% this month</div>
        </div>
        <div class="stat-card reveal" style="--delay: 0.1s">
          <q-icon name="auto_stories" size="28px" class="stat-icon stat-icon-amber" />
          <div class="stat-value">{{ formatNumber(summary.coursesActive) }}</div>
          <div class="stat-label">Courses Running</div>
          <div class="stat-trend positive">+2 new launches</div>
        </div>
        <div class="stat-card reveal" style="--delay: 0.15s">
          <q-icon name="person_pin" size="28px" class="stat-icon stat-icon-green" />
          <div class="stat-value">{{ formatNumber(summary.teachersActive) }}</div>
          <div class="stat-label">Active Teachers</div>
          <div class="stat-trend neutral">0 pending invites</div>
        </div>
        <div class="stat-card reveal" style="--delay: 0.2s">
          <q-icon name="bolt" size="28px" class="stat-icon stat-icon-rose" />
          <div class="stat-value">{{ formatPercent(summary.attendanceRate) }}</div>
          <div class="stat-label">Avg Attendance</div>
          <div class="stat-trend negative">-1.4% from last week</div>
        </div>
      </section>

      <section class="content-grid">
        <div class="content-column">
          <div class="card reveal" style="--delay: 0.25s">
            <div class="card-header">
              <div>
                <div class="card-title">Enrollment Pulse</div>
                <div class="card-subtitle">Capacity across top courses</div>
              </div>
              <q-btn label="View Courses" flat color="primary" :to="'/courses'" />
            </div>
            <div v-if="coursePulse.length" class="course-list">
              <div
                v-for="(course, index) in coursePulse"
                :key="course.id || course.name"
                class="course-row"
              >
                <div>
                  <div class="course-name">{{ course.name }}</div>
                  <div class="course-meta">
                    {{ formatNumber(course.enrolled) }} of
                    {{ formatNumber(course.capacity) }} seats
                  </div>
                </div>
                <q-linear-progress
                  :value="course.progress || 0"
                  :color="pulsePalette[index % pulsePalette.length].color"
                  :track-color="pulsePalette[index % pulsePalette.length].track"
                  rounded
                />
              </div>
            </div>
            <div v-else class="empty-state">No course activity yet.</div>
          </div>

          <div class="card reveal" style="--delay: 0.3s">
            <div class="card-header">
              <div>
                <div class="card-title">Recent Students</div>
                <div class="card-subtitle">Newly registered in the last 7 days</div>
              </div>
              <q-btn label="View Students" flat color="primary" :to="'/students'" />
            </div>
            <div class="table-like">
              <div class="table-row table-head">
                <div>Name</div>
                <div>Email</div>
                <div>Status</div>
              </div>
              <template v-if="recentStudents.length">
                <div
                  v-for="student in recentStudents"
                  :key="student.id || student.email"
                  class="table-row"
                >
                  <div>{{ student.name }}</div>
                  <div class="muted">{{ student.email }}</div>
                  <div>
                    <span class="pill" :class="student.statusClass">
                      {{ student.status }}
                    </span>
                  </div>
                </div>
              </template>
              <div v-else class="empty-state">No recent students yet.</div>
            </div>
          </div>
        </div>

        <div class="content-column">
          <div class="card reveal" style="--delay: 0.35s">
            <div class="card-header">
              <div>
                <div class="card-title">Quick Actions</div>
                <div class="card-subtitle">Jump straight to workflows</div>
              </div>
            </div>
            <div class="action-grid">
              <q-btn
                v-for="action in quickActions"
                :key="action.label"
                :label="action.label"
                :icon="action.icon"
                color="primary"
                outline
                class="action-btn btn-ghost"
                :to="action.to"
              />
            </div>
          </div>

          <div class="card reveal" style="--delay: 0.4s">
            <div class="card-header">
              <div>
                <div class="card-title">Today</div>
                <div class="card-subtitle">Upcoming sessions and reminders</div>
              </div>
              <q-btn label="Settings" flat color="primary" :to="'/settings'" />
            </div>
            <div class="timeline">
              <div v-for="item in timeline" :key="item.title" class="timeline-item">
                <div class="timeline-time">{{ item.time }}</div>
                <div>
                  <div class="timeline-title">{{ item.title }}</div>
                  <div class="timeline-meta">{{ item.meta }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card accent reveal" style="--delay: 0.45s">
            <div class="card-title">Admin Focus</div>
            <div class="card-subtitle">
              12 invoices pending review and 4 teacher profiles awaiting approval.
            </div>
            <q-btn
              label="Review Now"
              color="primary"
              unelevated
              class="btn-primary"
              :to="'/settings'"
            />
          </div>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from 'boot/axios'

const summary = ref({
  studentsTotal: 0,
  studentsActive: 0,
  coursesTotal: 0,
  coursesActive: 0,
  teachersTotal: 0,
  teachersActive: 0,
  attendanceRate: 0,
})

const coursePulse = ref([])
const recentStudents = ref([])

const pulsePalette = [
  { color: 'primary', track: 'blue-1' },
  { color: 'amber-7', track: 'amber-1' },
  { color: 'teal-6', track: 'teal-1' },
]

const numberFormatter = new Intl.NumberFormat('en-US')

const quickActions = [
  { label: 'Add Teacher', icon: 'person_add_alt', to: '/teachers' },
  { label: 'Assign Course', icon: 'assignment', to: '/courses' },
  { label: 'Manage Students', icon: 'groups', to: '/students' },
  { label: 'Open Settings', icon: 'settings', to: '/settings' },
]

const timeline = [
  { time: '9:30 AM', title: 'Faculty Standup', meta: 'Room 2B - 8 attendees' },
  { time: '11:00 AM', title: 'Student Intake Review', meta: 'Admissions team' },
  { time: '2:15 PM', title: 'Course Outline Sync', meta: 'UI/UX Intensive' },
  { time: '4:00 PM', title: 'Finance Check-in', meta: 'Invoices + payroll' },
]

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '-'
  }
  return numberFormatter.format(value)
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0%'
  }
  return `${value}%`
}

function formatStatusLabel(value) {
  if (!value) {
    return 'Active'
  }
  const normalized = String(value).toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function statusClass(value) {
  const normalized = String(value || '').toLowerCase()
  return normalized === 'active' ? 'pill-active' : 'pill-inactive'
}

async function fetchDashboard() {
  try {
    const response = await api.get('/dashboard')
    const payload = response.data || {}
    const totals = payload.totals || {}
    summary.value = {
      studentsTotal: totals.students?.total || 0,
      studentsActive: totals.students?.active || 0,
      coursesTotal: totals.courses?.total || 0,
      coursesActive: totals.courses?.active || 0,
      teachersTotal: totals.teachers?.total || 0,
      teachersActive: totals.teachers?.active || 0,
      attendanceRate: totals.attendanceRate || 0,
    }

    coursePulse.value = (payload.coursePulse || []).map((course) => ({
      id: course.id,
      name: course.name || 'Course',
      enrolled: course.enrolled || 0,
      capacity: course.capacity || 0,
      progress: course.progress || 0,
    }))

    recentStudents.value = (payload.recentStudents || []).map((student) => ({
      id: student.id,
      name: student.full_name || student.name || 'Student',
      email: student.email || '-',
      status: formatStatusLabel(student.status),
      statusClass: statusClass(student.status),
    }))
  } catch {
    coursePulse.value = []
    recentStudents.value = []
  }
}

onMounted(fetchDashboard)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap');

.dashboard-page {
  --ink: #0b1220;
  --muted: #5b6a7a;
  --card: #ffffff;
  --stroke: rgba(15, 23, 42, 0.08);
  --shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  font-family: 'Work Sans', 'Space Grotesk', sans-serif;
  min-height: 100vh;
  padding: 28px 24px 48px;
  background:
    radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.08), transparent 45%),
    radial-gradient(circle at 90% 0%, rgba(236, 72, 153, 0.1), transparent 45%),
    linear-gradient(180deg, #f9fbff, #eef2f7);
  color: var(--ink);
}

.dashboard-surface {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 24px;
  padding: 28px;
  border-radius: 26px;
  background: var(--card);
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  width: 220px;
  height: 220px;
  right: -80px;
  top: -90px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.18), transparent 70%);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 34px;
  line-height: 1.1;
  margin: 8px 0 12px;
}

.hero-subtitle {
  color: var(--muted);
  margin-bottom: 18px;
  max-width: 520px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-panel {
  background: linear-gradient(135deg, #111827, #1e293b);
  border-radius: 22px;
  padding: 24px;
  color: #f8fafc;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
}

.panel-label {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 11px;
  opacity: 0.7;
}

.panel-metric {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 40px;
  margin: 12px 0 4px;
}

.panel-caption {
  opacity: 0.8;
  margin-bottom: 16px;
}

.panel-stack {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  text-align: center;
}

.panel-mini {
  font-size: 18px;
  font-weight: 600;
}

.panel-mini-label {
  font-size: 12px;
  opacity: 0.6;
}

.stats-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.stat-card {
  background: var(--card);
  border-radius: 18px;
  padding: 18px;
  border: 1px solid var(--stroke);
  display: grid;
  gap: 6px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.stat-icon-blue {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.stat-icon-amber {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.stat-icon-green {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.stat-icon-rose {
  background: rgba(244, 63, 94, 0.12);
  color: #be123c;
}

.stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 600;
}

.stat-label {
  color: var(--muted);
  font-size: 13px;
}

.stat-trend {
  font-size: 12px;
  font-weight: 500;
}

.stat-trend.positive {
  color: #15803d;
}

.stat-trend.neutral {
  color: #64748b;
}

.stat-trend.negative {
  color: #b91c1c;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr);
  gap: 20px;
}

.content-column {
  display: grid;
  gap: 20px;
}

.card {
  background: var(--card);
  border-radius: 18px;
  padding: 20px;
  border: 1px solid var(--stroke);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}

.card.accent {
  background: linear-gradient(130deg, #eff6ff, #fef3c7);
  border: none;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.card-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  margin-bottom: 4px;
}

.card-subtitle {
  color: var(--muted);
  font-size: 13px;
}

.course-list {
  display: grid;
  gap: 16px;
}

.course-row {
  display: grid;
  gap: 8px;
}

.course-name {
  font-weight: 600;
}

.course-meta {
  color: var(--muted);
  font-size: 12px;
}

.table-like {
  display: grid;
  gap: 10px;
}

.table-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.6fr) minmax(0, 0.6fr);
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.03);
}

.table-head {
  background: transparent;
  padding: 0 2px;
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.muted {
  color: var(--muted);
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.pill-active {
  background: rgba(16, 185, 129, 0.16);
  color: #0f766e;
}

.pill-pending {
  background: rgba(245, 158, 11, 0.2);
  color: #b45309;
}

.pill-hold {
  background: rgba(59, 130, 246, 0.16);
  color: #1d4ed8;
}

.pill-inactive {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.action-grid {
  display: grid;
  gap: 12px;
}

.action-btn {
  justify-content: flex-start;
}

.btn-primary {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
}

.btn-primary :deep(.q-btn__content) {
  color: #f8fafc;
}

.btn-ghost {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.08);
}

.btn-ghost :deep(.q-btn__content),
.btn-ghost :deep(.q-icon) {
  color: #1d4ed8;
}

.timeline {
  display: grid;
  gap: 12px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.03);
}

.timeline-time {
  font-weight: 600;
  color: #1e3a8a;
}

.timeline-title {
  font-weight: 600;
}

.timeline-meta {
  font-size: 12px;
  color: var(--muted);
}

.empty-state {
  padding: 10px 2px;
  color: var(--muted);
  font-size: 13px;
}

.reveal {
  animation: rise 0.6s ease both;
  animation-delay: var(--delay, 0s);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .table-row {
    grid-template-columns: 1fr;
  }

  .timeline-item {
    grid-template-columns: 1fr;
  }
}
</style>
