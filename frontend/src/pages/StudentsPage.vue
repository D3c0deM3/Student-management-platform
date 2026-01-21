<template>
  <q-page class="students-page">
    <div class="students-shell">
      <section class="students-hero">
        <div class="hero-copy">
          <div class="hero-label">Students</div>
          <h1 class="hero-title">Student Roster</h1>
          <p class="hero-subtitle">
            Manage student records, keep profiles up to date, and track engagement
            across active courses.
          </p>
          <div class="hero-actions">
            <q-btn
              label="Add Student"
              color="primary"
              unelevated
              class="students-btn-primary"
              @click="openCreate"
            />
          </div>
        </div>
        <div class="hero-visual">
          <div class="insight-card primary">
            <div class="insight-header">
              <div>
                <div class="insight-label">Roster health</div>
                <div class="insight-value">{{ activePercent }}%</div>
                <div class="insight-meta">Active status in current view</div>
              </div>
              <div class="insight-chip">{{ activeStudents }} active</div>
            </div>
            <div class="progress">
              <div class="progress-bar" :style="{ width: `${activePercent}%` }"></div>
            </div>
            <div class="insight-row">
              <div>
                <div class="stat-label">Total</div>
                <div class="stat-value">{{ totalStudents }}</div>
              </div>
              <div>
                <div class="stat-label">Inactive</div>
                <div class="stat-value">{{ inactiveStudents }}</div>
              </div>
            </div>
          </div>
          <div class="insight-card secondary">
            <div class="insight-header">
              <div>
                <div class="insight-label">New students</div>
                <div class="insight-meta">Last 6 weeks</div>
              </div>
              <div class="insight-chip subtle">{{ trendTotal }}</div>
            </div>
            <div class="bar-chart">
              <div
                v-for="(bar, index) in trendBars"
                :key="`bar-${index}`"
                class="bar"
                :style="{ height: `${bar}%` }"
              ></div>
            </div>
            <div class="bar-caption">Weekly intake</div>
          </div>
        </div>
      </section>

      <section class="students-filters">
        <div class="filters-left">
          <q-input
            v-model="search"
            dense
            outlined
            debounce="350"
            placeholder="Search by name, email, or phone"
            class="filter-input"
            clearable
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-select
            v-model="statusFilter"
            dense
            outlined
            class="filter-select"
            :options="statusOptions"
            emit-value
            map-options
            label="Status"
          />
        </div>
        <div class="filters-right">
          <q-btn
            label="Refresh"
            flat
            color="primary"
            class="students-btn-ghost"
            @click="fetchStudents"
          />
        </div>
      </section>

      <section class="students-table-card">
        <q-table
          flat
          class="students-table"
          :rows="rows"
          :columns="columns"
          row-key="id"
          :dense="settings.compactTables"
          :loading="loading"
          v-model:pagination="pagination"
          :rows-per-page-options="[10, 20, 50]"
          binary-state-sort
          @request="onRequest"
          @row-click="handleRowClick"
        >
          <template #pagination="scope">
            <div class="table-pagination">
              <q-pagination
                :model-value="scope.pagination.page"
                :max="Math.max(1, Math.ceil((pagination.rowsNumber || 0) / scope.pagination.rowsPerPage))"
                color="primary"
                boundary-links
                direction-links
                @update:model-value="(page) => onRequest({ pagination: { ...scope.pagination, page } })"
              />
            </div>
          </template>

          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge
                class="status-pill"
                :class="props.row.status === 'active' ? 'status-active' : 'status-inactive'"
                rounded
              >
                {{ props.row.status }}
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-created_at="props">
            <q-td :props="props">
              {{ formatDate(props.row.created_at) }}
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="table-actions" @click.stop>
              <q-btn flat dense round icon="more_vert" aria-label="Student actions">
                <q-menu anchor="bottom right" self="top right" class="action-menu">
                  <q-list dense>
                    <q-item clickable v-close-popup @click="openProfile(props.row)">
                      <q-item-section avatar>
                        <q-icon name="visibility" />
                      </q-item-section>
                      <q-item-section>View profile</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openEdit(props.row)">
                      <q-item-section avatar>
                        <q-icon name="edit" />
                      </q-item-section>
                      <q-item-section>Edit student</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openEnrollments(props.row)">
                      <q-item-section avatar>
                        <q-icon name="playlist_add" />
                      </q-item-section>
                      <q-item-section>Manage enrollments</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openAttendance(props.row)">
                      <q-item-section avatar>
                        <q-icon name="event_available" />
                      </q-item-section>
                      <q-item-section>Attendance</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="openDelete(props.row)">
                      <q-item-section avatar>
                        <q-icon name="delete" color="negative" />
                      </q-item-section>
                      <q-item-section class="text-negative">Delete</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </section>
    </div>

    <q-dialog v-model="formDialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">
            {{ formMode === 'create' ? 'Add Student' : 'Edit Student' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form class="dialog-form" @submit.prevent="saveStudent">
            <q-input
              v-model="form.full_name"
              label="Full name"
              outlined
              dense
              :rules="[(val) => !!val || 'Name is required']"
            />
            <q-input v-model="form.email" label="Email" outlined dense type="email" />
            <q-input v-model="form.phone" label="Phone" outlined dense />
            <q-select
              v-model="form.status"
              label="Status"
              outlined
              dense
              :options="studentStatusOptions"
              emit-value
              map-options
            />
            <div class="dialog-actions">
              <q-btn flat label="Cancel" v-close-popup />
              <q-btn
                label="Save"
                color="primary"
                unelevated
                class="students-btn-primary"
                type="submit"
                :loading="saving"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="profileDrawer" position="right" full-height>
      <q-card class="profile-drawer">
        <q-card-section class="profile-drawer-header">
          <div>
            <div class="profile-drawer-label">Student profile</div>
            <div class="profile-drawer-title">{{ profileStudent?.full_name || '-' }}</div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="profileStudent" class="profile-drawer-content">
          <div class="profile-meta">
            <div>
              <div class="profile-label">Email</div>
              <div class="profile-value">{{ profileStudent.email || '-' }}</div>
            </div>
            <div>
              <div class="profile-label">Phone</div>
              <div class="profile-value">{{ profileStudent.phone || '-' }}</div>
            </div>
            <div>
              <div class="profile-label">Status</div>
              <div class="profile-value">
                <q-badge
                  class="status-pill"
                  :class="profileStudent.status === 'active' ? 'status-active' : 'status-inactive'"
                  rounded
                >
                  {{ profileStudent.status }}
                </q-badge>
              </div>
            </div>
          </div>
          <div class="profile-actions">
            <q-btn
              label="Edit"
              flat
              class="students-btn-ghost"
              @click="openEdit(profileStudent)"
            />
            <q-btn
              label="Attendance"
              color="primary"
              unelevated
              class="students-btn-primary"
              @click="openAttendance(profileStudent)"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Delete Student</div>
        </q-card-section>
        <q-card-section>
          This will permanently remove the student and related enrollments.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            label="Delete"
            color="negative"
            unelevated
            :loading="deleting"
            @click="confirmDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="enrollmentDialog">
      <q-card class="dialog-card dialog-wide">
        <q-card-section class="dialog-header">
          <div class="dialog-title">
            Enrollments for {{ enrollmentStudent?.full_name || '' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="enroll-grid">
            <q-select
              v-model="enrollmentForm.course_id"
              label="Course"
              outlined
              dense
              :options="courseOptions"
              emit-value
              map-options
            />
            <q-select
              v-model="enrollmentForm.teacher_id"
              label="Teacher (optional)"
              outlined
              dense
              :options="teacherOptions"
              emit-value
              map-options
            />
            <q-input
              v-model="enrollmentForm.start_date"
              label="Start date"
              outlined
              dense
              type="date"
            />
            <q-select
              v-model="enrollmentForm.status"
              label="Status"
              outlined
              dense
              :options="enrollmentStatusOptions"
              emit-value
              map-options
            />
          </div>
          <div class="dialog-actions">
            <q-btn
              label="Add Enrollment"
              color="primary"
              unelevated
              class="students-btn-primary"
              :loading="enrollmentSaving"
              @click="addEnrollment"
            />
          </div>
          <div class="enrollment-list" v-if="enrollments.length">
            <div v-for="item in enrollments" :key="item.id" class="enrollment-row">
              <div>
                <div class="enrollment-title">{{ item.course_name || item.course || 'Course' }}</div>
                <div class="enrollment-meta">
                  {{ item.status || 'active' }} - {{ formatDate(item.start_date) }}
                </div>
              </div>
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                @click="removeEnrollment(item)"
              />
            </div>
          </div>
          <div v-else class="empty-state">No enrollments yet.</div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="attendanceDialog">
      <q-card class="dialog-card dialog-wide">
        <q-card-section class="dialog-header">
          <div class="dialog-title">
            Attendance for {{ attendanceStudent?.full_name || '' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="attendance-calendar">
            <div class="calendar-header">
              <div>
                <div class="calendar-title">Monthly attendance</div>
                <div class="calendar-subtitle">Tap a day to mark attendance</div>
              </div>
              <div class="calendar-legend">
                <span class="legend-item">
                  <span class="legend-dot legend-present"></span>
                  Present
                </span>
                <span class="legend-item">
                  <span class="legend-dot legend-absent"></span>
                  Absent
                </span>
              </div>
            </div>
            <div class="calendar-grid">
              <button
                v-for="day in attendanceCalendar"
                :key="day.date"
                type="button"
                class="calendar-cell"
                :class="day.statusClass"
                :title="day.date"
                @click="toggleAttendanceCell(day)"
              ></button>
            </div>
          </div>
          <div class="attendance-form">
            <q-select
              v-model="attendanceForm.course_id"
              label="Course"
              outlined
              dense
              :options="attendanceCourseOptions"
              emit-value
              map-options
            />
            <q-input
              v-model="attendanceForm.attendance_date"
              label="Date"
              outlined
              dense
              type="date"
            />
            <q-select
              v-model="attendanceForm.status"
              label="Status"
              outlined
              dense
              :options="attendanceStatusOptions"
              emit-value
              map-options
            />
            <q-input
              v-model="attendanceForm.notes"
              label="Notes"
              outlined
              dense
              type="textarea"
              autogrow
              class="attendance-notes"
            />
          </div>
          <div class="dialog-actions">
            <q-btn
              label="Record Attendance"
              color="primary"
              unelevated
              class="students-btn-primary"
              :loading="attendanceSaving"
              @click="saveAttendance"
            />
          </div>
          <div class="attendance-list" v-if="attendanceRecords.length">
            <div class="attendance-row" v-for="record in attendanceRecords" :key="record.id">
              <div>
                <div class="attendance-title">{{ record.course_name || 'Course' }}</div>
                <div class="attendance-meta">
                  {{ record.attendance_date }} - {{ record.status }}
                </div>
              </div>
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                @click="removeAttendance(record)"
              />
            </div>
          </div>
          <div v-else class="empty-state">No attendance records yet.</div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useSettings } from 'src/composables/useSettings'

const $q = useQuasar()
const { settings } = useSettings()

const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const pagination = ref({
  page: 1,
  rowsPerPage: settings.value.defaultPageSize || 10,
  rowsNumber: 0,
  sortBy: 'full_name',
  descending: false,
})

const search = ref('')
const statusFilter = ref(settings.value.showInactive ? 'all' : 'active')
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const studentStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const columns = [
  { name: 'full_name', label: 'Student', field: 'full_name', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'created_at', label: 'Created', field: 'created_at', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const totalStudents = computed(
  () => pagination.value.rowsNumber || rows.value.length
)
const activeStudents = computed(
  () => rows.value.filter((row) => row.status === 'active').length
)
const inactiveStudents = computed(
  () => rows.value.filter((row) => row.status !== 'active').length
)
const activePercent = computed(() => {
  if (!totalStudents.value) {
    return 0
  }
  return Math.round((activeStudents.value / totalStudents.value) * 100)
})
const trendValues = computed(() => {
  const buckets = Array(6).fill(0)
  const now = new Date()
  rows.value.forEach((row) => {
    if (!row.created_at) {
      return
    }
    const date = new Date(row.created_at)
    if (Number.isNaN(date.getTime())) {
      return
    }
    const diffWeeks = Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000))
    if (diffWeeks < 0 || diffWeeks > 5) {
      return
    }
    const index = 5 - diffWeeks
    buckets[index] += 1
  })
  return buckets
})
const trendBars = computed(() => {
  const values = trendValues.value
  const max = Math.max(1, ...values)
  return values
    .map((value) => Math.round((value / max) * 70) + 20)
})
const trendTotal = computed(() =>
  trendValues.value.reduce((sum, value) => sum + value, 0)
)

const formDialog = ref(false)
const formMode = ref('create')
const form = ref({
  id: null,
  full_name: '',
  email: '',
  phone: '',
  status: 'active',
})

const profileDrawer = ref(false)
const profileStudent = ref(null)

const deleteDialog = ref(false)
const studentToDelete = ref(null)

const enrollmentDialog = ref(false)
const enrollmentStudent = ref(null)
const enrollments = ref([])
const enrollmentForm = ref({
  course_id: null,
  teacher_id: null,
  start_date: '',
  status: 'active',
})
const enrollmentSaving = ref(false)
const enrollmentStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Dropped', value: 'dropped' },
]
const courseOptions = ref([])
const teacherOptions = ref([])

const attendanceDialog = ref(false)
const attendanceStudent = ref(null)
const attendanceRecords = ref([])
const attendanceEnrollments = ref([])
const attendanceSaving = ref(false)
const attendanceForm = ref({
  course_id: null,
  attendance_date: new Date().toISOString().slice(0, 10),
  status: 'present',
  notes: '',
})
const attendanceStatusOptions = [
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
  { label: 'Late', value: 'late' },
  { label: 'Excused', value: 'excused' },
]
const attendanceCourseOptions = computed(() =>
  attendanceEnrollments.value.map((item) => ({
    label: item.course_name || item.course || 'Course',
    value: item.course_id,
  }))
)
const attendanceByDate = computed(() => {
  const map = new Map()
  attendanceRecords.value.forEach((record) => {
    if (attendanceForm.value.course_id && record.course_id !== attendanceForm.value.course_id) {
      return
    }
    map.set(record.attendance_date, record)
  })
  return map
})
const attendanceCalendar = computed(() => {
  const days = []
  const today = new Date()
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateKey = date.toISOString().slice(0, 10)
    const record = attendanceByDate.value.get(dateKey)
    let statusClass = 'is-empty'
    if (record?.status === 'present' || record?.status === 'late' || record?.status === 'excused') {
      statusClass = 'is-present'
    } else if (record?.status === 'absent') {
      statusClass = 'is-absent'
    }
    days.push({ date: dateKey, statusClass })
  }
  return days
})

function normalizeStudent(row) {
  const fullName =
    row.full_name ||
    [row.first_name, row.last_name].filter(Boolean).join(' ') ||
    row.name ||
    'Untitled'
  return {
    ...row,
    full_name: fullName,
    status: row.status || 'active',
    email: row.email || '',
    phone: row.phone || '',
  }
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

async function fetchStudents() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      search: search.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    }
    const response = await api.get('/students', { params })
    const payload = response.data || {}
    const items = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.rows || payload.students || []
    const total = payload.total || payload.count || payload.rowsNumber || items.length
    rows.value = items.map(normalizeStudent)
    pagination.value = {
      ...pagination.value,
      rowsNumber: total,
      page: payload.page || pagination.value.page,
    }
  } catch {
    rows.value = []
    pagination.value = { ...pagination.value, rowsNumber: 0 }
    $q.notify({ type: 'negative', message: 'Unable to load students.' })
  } finally {
    loading.value = false
  }
}

function onRequest(props) {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  pagination.value = {
    ...pagination.value,
    page,
    rowsPerPage,
    sortBy,
    descending,
  }
  fetchStudents()
}

function openCreate() {
  formMode.value = 'create'
  form.value = {
    id: null,
    full_name: '',
    email: '',
    phone: '',
    status: 'active',
  }
  formDialog.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  form.value = {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    status: row.status || 'active',
  }
  formDialog.value = true
}

function openProfile(row) {
  profileStudent.value = row
  profileDrawer.value = true
}

function openDelete(row) {
  studentToDelete.value = row
  deleteDialog.value = true
}

async function saveStudent() {
  saving.value = true
  try {
    const payload = {
      full_name: form.value.full_name,
      email: form.value.email || null,
      phone: form.value.phone || null,
      status: form.value.status,
    }
    if (formMode.value === 'create') {
      await api.post('/students', payload)
      $q.notify({ type: 'positive', message: 'Student created.' })
    } else {
      await api.put(`/students/${form.value.id}`, payload)
      $q.notify({ type: 'positive', message: 'Student updated.' })
    }
    formDialog.value = false
    fetchStudents()
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to save student.' })
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!studentToDelete.value) {
    return
  }
  deleting.value = true
  try {
    await api.delete(`/students/${studentToDelete.value.id}`)
    $q.notify({ type: 'positive', message: 'Student deleted.' })
    deleteDialog.value = false
    fetchStudents()
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to delete student.' })
  } finally {
    deleting.value = false
  }
}

async function openEnrollments(row) {
  enrollmentStudent.value = row
  enrollmentDialog.value = true
  enrollmentForm.value = {
    course_id: null,
    teacher_id: null,
    start_date: '',
    status: 'active',
  }
  await Promise.all([fetchEnrollments(row.id), fetchCourseOptions(), fetchTeacherOptions()])
}

async function fetchEnrollments(studentId) {
  try {
    const response = await api.get(`/students/${studentId}/enrollments`)
    const payload = response.data || {}
    enrollments.value = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.enrollments || []
  } catch {
    enrollments.value = []
  }
}

async function fetchCourseOptions() {
  try {
    const response = await api.get('/courses', { params: { page: 1, limit: 100 } })
    const payload = response.data || {}
    const items = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.rows || payload.courses || []
    courseOptions.value = items.map((course) => ({
      label: course.name || course.title || 'Course',
      value: course.id,
    }))
  } catch {
    courseOptions.value = []
  }
}

async function fetchTeacherOptions() {
  try {
    const response = await api.get('/teachers', { params: { page: 1, limit: 100 } })
    const payload = response.data || {}
    const items = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.rows || payload.teachers || []
    teacherOptions.value = items.map((teacher) => ({
      label: teacher.full_name || teacher.name || 'Teacher',
      value: teacher.id,
    }))
  } catch {
    teacherOptions.value = []
  }
}

async function addEnrollment() {
  if (!enrollmentStudent.value || !enrollmentForm.value.course_id) {
    return
  }
  enrollmentSaving.value = true
  try {
    await api.post('/enroll', {
      student_id: enrollmentStudent.value.id,
      course_id: enrollmentForm.value.course_id,
      teacher_id: enrollmentForm.value.teacher_id || null,
      start_date: enrollmentForm.value.start_date || null,
      status: enrollmentForm.value.status,
    })
    $q.notify({ type: 'positive', message: 'Enrollment added.' })
    enrollmentForm.value = {
      course_id: null,
      teacher_id: null,
      start_date: '',
      status: 'active',
    }
    fetchEnrollments(enrollmentStudent.value.id)
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to add enrollment.' })
  } finally {
    enrollmentSaving.value = false
  }
}

async function removeEnrollment(item) {
  try {
    await api.delete(`/enroll/${item.id}`)
    fetchEnrollments(enrollmentStudent.value.id)
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to remove enrollment.' })
  }
}

async function openAttendance(row) {
  attendanceStudent.value = row
  attendanceDialog.value = true
  attendanceForm.value = {
    course_id: null,
    attendance_date: new Date().toISOString().slice(0, 10),
    status: 'present',
    notes: '',
  }
  await Promise.all([
    fetchAttendanceEnrollments(row.id),
    fetchAttendanceRecords(row.id),
  ])
  if (attendanceCourseOptions.value.length === 1) {
    attendanceForm.value.course_id = attendanceCourseOptions.value[0].value
  }
}

async function fetchAttendanceEnrollments(studentId) {
  try {
    const response = await api.get(`/students/${studentId}/enrollments`)
    const payload = response.data || {}
    attendanceEnrollments.value = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.enrollments || []
  } catch {
    attendanceEnrollments.value = []
  }
}

async function fetchAttendanceRecords(studentId) {
  try {
    const response = await api.get(`/students/${studentId}/attendance`, {
      params: { page: 1, limit: 60 },
    })
    const payload = response.data || {}
    attendanceRecords.value = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.attendance || []
  } catch {
    attendanceRecords.value = []
  }
}

async function saveAttendance() {
  if (!attendanceStudent.value || !attendanceForm.value.course_id) {
    $q.notify({ type: 'negative', message: 'Select a course to record attendance.' })
    return
  }
  attendanceSaving.value = true
  try {
    await api.post('/attendance', {
      student_id: attendanceStudent.value.id,
      course_id: attendanceForm.value.course_id,
      attendance_date: attendanceForm.value.attendance_date,
      status: attendanceForm.value.status,
      notes: attendanceForm.value.notes || null,
    })
    $q.notify({ type: 'positive', message: 'Attendance recorded.' })
    attendanceForm.value.notes = ''
    fetchAttendanceRecords(attendanceStudent.value.id)
  } catch (err) {
    const message = err?.response?.data?.error || 'Unable to record attendance.'
    $q.notify({ type: 'negative', message })
  } finally {
    attendanceSaving.value = false
  }
}

async function removeAttendance(record) {
  try {
    await api.delete(`/attendance/${record.id}`)
    fetchAttendanceRecords(attendanceStudent.value.id)
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to remove attendance record.' })
  }
}

function handleRowClick(_, row) {
  openProfile(row)
}

async function toggleAttendanceCell(day) {
  if (!attendanceForm.value.course_id) {
    $q.notify({ type: 'negative', message: 'Select a course before marking attendance.' })
    return
  }
  const record = attendanceByDate.value.get(day.date)
  if (record) {
    await removeAttendance(record)
    return
  }
  attendanceForm.value.attendance_date = day.date
  attendanceForm.value.status = 'present'
  await saveAttendance()
}

watch(
  () => settings.value.defaultPageSize,
  (value) => {
    if (!value) {
      return
    }
    pagination.value.rowsPerPage = value
    if (pagination.value.page === 1) {
      fetchStudents()
      return
    }
    pagination.value.page = 1
  }
)

watch(
  () => settings.value.showInactive,
  (value) => {
    statusFilter.value = value ? 'all' : 'active'
  }
)

watch([search, statusFilter], () => {
  if (pagination.value.page === 1) {
    fetchStudents()
    return
  }
  pagination.value.page = 1
})

onMounted(fetchStudents)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');

.students-page {
  min-height: 100vh;
  padding: 28px 24px 48px;
  font-family: 'Manrope', sans-serif;
  color: #0b1220;
  background:
    radial-gradient(circle at 15% 15%, rgba(45, 212, 191, 0.15), transparent 45%),
    linear-gradient(180deg, #f8fafb, #eef4f3);
}

.students-shell {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 20px;
}

.students-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 18px;
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
  position: relative;
  overflow: hidden;
}

.students-hero::after {
  content: '';
  position: absolute;
  right: -120px;
  top: -120px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.25), transparent 70%);
}

.hero-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 11px;
  color: #64748b;
}

.hero-title {
  font-size: 28px;
  margin: 6px 0 8px;
}

.hero-subtitle {
  color: #475569;
  max-width: 420px;
}

.hero-actions {
  margin-top: 12px;
}

.hero-visual {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.insight-card {
  padding: 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.insight-card.primary {
  background: linear-gradient(135deg, rgba(45, 212, 191, 0.15), rgba(15, 118, 110, 0.05));
  border-color: rgba(45, 212, 191, 0.3);
}

.insight-card.secondary {
  background: linear-gradient(135deg, #ffffff, rgba(45, 212, 191, 0.06));
}

.insight-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.insight-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #0f172a;
}

.insight-value {
  font-size: 20px;
  font-weight: 700;
  margin-top: 6px;
}

.insight-meta {
  font-size: 12px;
  color: #475569;
  margin-top: 4px;
}

.insight-chip {
  background: rgba(15, 118, 110, 0.16);
  color: #0f766e;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}

.insight-chip.subtle {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.progress {
  height: 8px;
  background: rgba(15, 23, 42, 0.1);
  border-radius: 999px;
  overflow: hidden;
  margin: 12px 0 14px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #14b8a6, #0f766e);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.insight-row {
  display: flex;
  gap: 20px;
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #475569;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 4px;
}

.bar-chart {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
  height: 90px;
  margin-top: 12px;
}

.bar {
  width: 100%;
  min-height: 14px;
  border-radius: 999px;
  background: linear-gradient(180deg, #14b8a6, #0f766e);
  box-shadow: 0 8px 18px rgba(20, 184, 166, 0.2);
}

.bar-caption {
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.students-filters {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.filters-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.filter-input {
  min-width: 260px;
}

.filter-select {
  min-width: 160px;
}

.students-table-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.students-table :deep(th) {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
}

.students-table :deep(.q-table__bottom) {
  position: relative;
  justify-content: flex-end;
  gap: 12px;
}

.students-table :deep(.q-table__bottom .q-table__separator) {
  display: none;
}

.students-table :deep(.q-table__bottom .q-table__control:first-child) {
  margin-left: auto;
}

.students-table :deep(.q-table__bottom .q-table__control:last-child) {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.table-actions :deep(.q-btn) {
  margin-left: 4px;
}

.status-pill {
  text-transform: capitalize;
  font-weight: 600;
}

.status-active {
  background: rgba(16, 185, 129, 0.18);
  color: #0f766e;
}

.status-inactive {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.dialog-card {
  min-width: 320px;
  max-width: 520px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafb 100%);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.14);
}

.dialog-wide {
  max-width: 760px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
}

.dialog-form {
  display: grid;
  gap: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.profile-label {
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.profile-value {
  font-weight: 600;
}

.profile-drawer {
  width: 360px;
  max-width: 90vw;
  height: 100%;
  border-radius: 18px 0 0 18px;
  background: #ffffff;
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: -20px 0 40px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
}

.profile-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-drawer-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.profile-drawer-title {
  font-size: 20px;
  font-weight: 700;
  margin-top: 6px;
}

.profile-drawer-content {
  display: grid;
  gap: 20px;
}

.profile-meta {
  display: grid;
  gap: 12px;
}

.profile-actions {
  display: flex;
  gap: 12px;
}

.attendance-calendar {
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  margin-bottom: 16px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.calendar-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #0f172a;
}

.calendar-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.calendar-legend {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: #475569;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.legend-present {
  background: #fbbf24;
}

.legend-absent {
  background: rgba(148, 163, 184, 0.6);
}

.calendar-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.calendar-cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: #ffffff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.calendar-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(15, 23, 42, 0.12);
}

.calendar-cell.is-present {
  background: #fbbf24;
  border-color: rgba(251, 191, 36, 0.8);
}

.calendar-cell.is-absent {
  background: rgba(148, 163, 184, 0.5);
  border-color: rgba(148, 163, 184, 0.6);
}

.enroll-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.enrollment-list {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.enrollment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
}

.enrollment-title {
  font-weight: 600;
}

.enrollment-meta {
  font-size: 12px;
  color: #64748b;
}

.attendance-form {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.attendance-notes {
  grid-column: 1 / -1;
}

.attendance-list {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.attendance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.04);
}

.attendance-title {
  font-weight: 600;
}

.attendance-meta {
  font-size: 12px;
  color: #64748b;
}

.empty-state {
  margin-top: 12px;
  color: #64748b;
}

.students-btn-primary {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 10px 20px rgba(20, 184, 166, 0.25);
}

.students-btn-primary :deep(.q-btn__content) {
  color: #f8fafc;
}

.students-btn-ghost {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid rgba(20, 184, 166, 0.35);
  background: rgba(20, 184, 166, 0.08);
}

.students-btn-ghost :deep(.q-btn__content),
.students-btn-ghost :deep(.q-icon) {
  color: #0f766e;
}

.table-pagination {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 10px 0 6px;
}

@media (max-width: 900px) {
  .students-hero {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .students-filters {
    flex-direction: column;
  }
}
</style>
