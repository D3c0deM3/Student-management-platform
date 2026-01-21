<template>
  <q-page class="courses-page">
    <div class="courses-shell">
      <section class="courses-hero">
        <div class="hero-copy">
          <div class="hero-label">Courses</div>
          <h1 class="hero-title">Course Catalog</h1>
          <p class="hero-subtitle">
            Keep the curriculum clear and consistent with fast updates to pricing,
            level, and assignments.
          </p>
          <div class="hero-actions">
            <q-btn
              label="Add Course"
              color="primary"
              unelevated
              class="courses-btn-primary"
              @click="openCreate"
            />
          </div>
          <div class="hero-stat-row">
            <div class="stat-tile">
              <div class="stat-label">Active</div>
              <div class="stat-value">{{ activeCourses }}</div>
            </div>
            <div class="stat-tile">
              <div class="stat-label">Archived</div>
              <div class="stat-value">{{ archivedCourses }}</div>
            </div>
            <div class="stat-tile">
              <div class="stat-label">Avg Price</div>
              <div class="stat-value">
                {{ averagePrice !== null ? formatCurrency(averagePrice) : '-' }}
              </div>
            </div>
          </div>
        </div>

        <div class="hero-insights">
          <div class="insight-card">
            <div class="insight-title">Catalog mix</div>
            <div class="mix-bar">
              <div
                class="mix-active"
                :style="{ width: `${courseMix.active}%` }"
              ></div>
              <div
                class="mix-archived"
                :style="{ width: `${courseMix.archived}%` }"
              ></div>
            </div>
            <div class="mix-legend">
              <span>Active {{ courseMix.active }}%</span>
              <span>Archived {{ courseMix.archived }}%</span>
            </div>
          </div>
          <div class="insight-card">
            <div class="insight-title">Top levels</div>
            <div v-if="levelBars.length" class="level-bars">
              <div v-for="level in levelBars" :key="level.label" class="level-row">
                <div class="level-name">{{ level.label }}</div>
                <div class="level-bar">
                  <span :style="{ width: `${level.percent}%` }"></span>
                </div>
                <div class="level-count">{{ level.count }}</div>
              </div>
            </div>
            <div v-else class="insight-empty">No level data yet.</div>
          </div>
        </div>
      </section>

      <section class="courses-grid">
        <div class="courses-main">
          <div class="courses-tools">
            <div class="tools-left">
              <q-input
                v-model="search"
                dense
                outlined
                debounce="350"
                placeholder="Search by course name or level"
                class="tool-input"
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
                class="tool-select"
                :options="statusOptions"
                emit-value
                map-options
                label="Status"
              />
            </div>
            <div class="tools-right">
              <q-btn
                label="Refresh"
                flat
                color="primary"
                class="courses-btn-ghost"
                @click="fetchCourses"
              />
            </div>
          </div>

          <div class="courses-card-grid">
            <div v-if="loading" class="courses-loading">
              <q-spinner color="primary" size="32px" />
              <span>Loading courses...</span>
            </div>
            <div v-else-if="rows.length" class="course-cards">
              <article
                v-for="course in rows"
                :key="course.id"
                class="course-card"
                role="button"
                tabindex="0"
                @click="goToCourse(course)"
                @keydown.enter.prevent="goToCourse(course)"
                @keydown.space.prevent="goToCourse(course)"
              >
                <div class="card-header">
                  <div>
                    <div class="card-kicker">{{ course.level || 'Course level' }}</div>
                    <div class="card-title">{{ course.name }}</div>
                    <div class="card-subtitle">{{ course.duration || 'Duration TBD' }}</div>
                  </div>
                  <q-btn
                    flat
                    dense
                    round
                    icon="more_vert"
                    aria-label="Course actions"
                    @click.stop
                  >
                    <q-menu anchor="bottom right" self="top right">
                      <q-list dense>
                        <q-item clickable v-close-popup @click="goToCourse(course)">
                          <q-item-section avatar>
                            <q-icon name="open_in_new" />
                          </q-item-section>
                          <q-item-section>Open course</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup @click="openEdit(course)">
                          <q-item-section avatar>
                            <q-icon name="edit" />
                          </q-item-section>
                          <q-item-section>Edit course</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item clickable v-close-popup @click="openDelete(course)">
                          <q-item-section avatar>
                            <q-icon name="delete" color="negative" />
                          </q-item-section>
                          <q-item-section class="text-negative">Delete</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
                <div class="card-meta">
                  <div>
                    <div class="meta-label">Teacher</div>
                    <div class="meta-value">{{ course.teacher_name || 'Unassigned' }}</div>
                  </div>
                  <div>
                    <div class="meta-label">Status</div>
                    <q-badge
                      class="status-pill"
                      :class="course.status === 'active' ? 'status-active' : 'status-archived'"
                      rounded
                    >
                      {{ course.status }}
                    </q-badge>
                  </div>
                </div>
                <div class="card-stats">
                  <div>
                    <div class="meta-label">Price</div>
                    <div class="meta-value">{{ formatCurrency(course.price) }}</div>
                  </div>
                  <div>
                    <div class="meta-label">Created</div>
                    <div class="meta-value">{{ formatDate(course.created_at) }}</div>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="empty-state">No courses match the current filters.</div>
          </div>
          <div v-if="pageCount > 1" class="courses-pagination">
            <q-pagination
              v-model="pagination.page"
              :max="pageCount"
              max-pages="6"
              boundary-numbers
              color="primary"
              boundary-links
              direction-links
            />
          </div>
        </div>

        <aside class="courses-rail">
          <div class="rail-card">
            <div class="rail-title">Teacher assignment</div>
            <div class="rail-value">{{ assignmentPercent }}%</div>
            <div class="rail-meta">
              {{ assignedCourses }} of {{ rows.length }} courses assigned
            </div>
            <div class="progress">
              <div
                class="progress-bar"
                :style="{ width: `${assignmentPercent}%` }"
              ></div>
            </div>
          </div>
          <div class="rail-card">
            <div class="rail-title">Pricing range</div>
            <div class="rail-row">
              <span>Min</span>
              <strong>{{ priceStats.min ? formatCurrency(priceStats.min) : '-' }}</strong>
            </div>
            <div class="rail-row">
              <span>Max</span>
              <strong>{{ priceStats.max ? formatCurrency(priceStats.max) : '-' }}</strong>
            </div>
            <div class="rail-row">
              <span>Average</span>
              <strong>{{ averagePrice !== null ? formatCurrency(averagePrice) : '-' }}</strong>
            </div>
          </div>
        </aside>
      </section>
    </div>

    <q-dialog v-model="formDialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">
            {{ formMode === 'create' ? 'Add Course' : 'Edit Course' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form class="dialog-form" @submit.prevent="saveCourse">
            <q-input
              v-model="form.name"
              label="Course name"
              outlined
              dense
              :rules="[(val) => !!val || 'Name is required']"
            />
            <q-input v-model="form.level" label="Level" outlined dense />
            <q-input v-model.number="form.price" label="Price" outlined dense type="number" />
            <q-input v-model="form.duration" label="Duration" outlined dense />
            <q-select
              v-model="form.teacher_id"
              label="Assigned teacher"
              outlined
              dense
              :options="teacherOptions"
              emit-value
              map-options
              clearable
            />
            <q-select
              v-model="form.status"
              label="Status"
              outlined
              dense
              :options="courseStatusOptions"
              emit-value
              map-options
            />
            <div class="dialog-actions">
              <q-btn flat label="Cancel" v-close-popup />
              <q-btn
                label="Save"
                color="primary"
                unelevated
                class="courses-btn-primary"
                type="submit"
                :loading="saving"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Delete Course</div>
        </q-card-section>
        <q-card-section>
          This course will be removed from the catalog and enrollments.
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

  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useSettings } from 'src/composables/useSettings'

const $q = useQuasar()
const { settings } = useSettings()
const router = useRouter()

const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const pagination = ref({
  page: 1,
  rowsPerPage: settings.value.defaultPageSize || 10,
  rowsNumber: 0,
  sortBy: 'name',
  descending: false,
})

const search = ref('')
const statusFilter = ref(settings.value.showInactive ? 'all' : 'active')
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
]

const courseStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
]

const activeCourses = computed(
  () => rows.value.filter((row) => row.status === 'active').length
)
const archivedCourses = computed(
  () => rows.value.filter((row) => row.status !== 'active').length
)
const averagePrice = computed(() => {
  const prices = rows.value
    .map((row) => Number(row.price))
    .filter((value) => !Number.isNaN(value) && value > 0)
  if (!prices.length) {
    return null
  }
  const total = prices.reduce((sum, value) => sum + value, 0)
  return Math.round((total / prices.length) * 100) / 100
})

const courseMix = computed(() => {
  const total = rows.value.length
  if (!total) {
    return { active: 0, archived: 0 }
  }
  const active = Math.round((activeCourses.value / total) * 100)
  return { active, archived: Math.max(0, 100 - active) }
})

const levelSummary = computed(() => {
  const tally = new Map()
  rows.value.forEach((row) => {
    const level = row.level || 'Unspecified'
    tally.set(level, (tally.get(level) || 0) + 1)
  })
  return Array.from(tally.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
})

const levelBars = computed(() => {
  const total = rows.value.length || 1
  return levelSummary.value.map((level) => ({
    ...level,
    percent: Math.round((level.count / total) * 100),
  }))
})

const assignedCourses = computed(
  () => rows.value.filter((row) => row.teacher_id).length
)
const assignmentPercent = computed(() => {
  const total = rows.value.length
  if (!total) {
    return 0
  }
  return Math.round((assignedCourses.value / total) * 100)
})

const priceStats = computed(() => {
  const prices = rows.value
    .map((row) => Number(row.price))
    .filter((value) => !Number.isNaN(value) && value > 0)
  if (!prices.length) {
    return { min: null, max: null }
  }
  return { min: Math.min(...prices), max: Math.max(...prices) }
})

const pageCount = computed(() =>
  Math.max(1, Math.ceil(pagination.value.rowsNumber / pagination.value.rowsPerPage))
)

const formDialog = ref(false)
const formMode = ref('create')
const form = ref({
  id: null,
  name: '',
  level: '',
  price: null,
  duration: '',
  teacher_id: null,
  status: 'active',
})

const deleteDialog = ref(false)
const courseToDelete = ref(null)
const teacherOptions = ref([])

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

async function fetchCourses() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      search: search.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    }
    const response = await api.get('/courses', { params })
    const payload = response.data || {}
    const items = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.rows || payload.courses || []
    rows.value = items.map((course) => ({
      ...course,
      name: course.name || course.title || 'Untitled',
      status: course.status || 'active',
      level: course.level || '',
      teacher_id: course.teacher_id || null,
      teacher_name: course.teacher_name || '',
    }))
    pagination.value.rowsNumber =
      payload.total || payload.count || payload.rowsNumber || items.length
  } catch {
    rows.value = []
    pagination.value.rowsNumber = 0
    $q.notify({ type: 'negative', message: 'Unable to load courses.' })
  } finally {
    loading.value = false
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

function goToCourse(course) {
  router.push({ path: `/courses/${course.id}` })
}

function openCreate() {
  formMode.value = 'create'
  form.value = {
    id: null,
    name: '',
    level: '',
    price: null,
    duration: '',
    teacher_id: null,
    status: 'active',
  }
  formDialog.value = true
  fetchTeacherOptions()
}

function openEdit(row) {
  formMode.value = 'edit'
  form.value = {
    id: row.id,
    name: row.name,
    level: row.level || '',
    price: row.price ?? null,
    duration: row.duration || '',
    teacher_id: row.teacher_id || null,
    status: row.status || 'active',
  }
  formDialog.value = true
  fetchTeacherOptions()
}

function openDelete(row) {
  courseToDelete.value = row
  deleteDialog.value = true
}

async function saveCourse() {
  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      level: form.value.level || null,
      price: form.value.price ?? null,
      duration: form.value.duration || null,
      teacher_id: form.value.teacher_id || null,
      status: form.value.status,
    }
    if (formMode.value === 'create') {
      await api.post('/courses', payload)
      $q.notify({ type: 'positive', message: 'Course created.' })
    } else {
      await api.put(`/courses/${form.value.id}`, payload)
      $q.notify({ type: 'positive', message: 'Course updated.' })
    }
    formDialog.value = false
    fetchCourses()
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to save course.' })
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!courseToDelete.value) {
    return
  }
  deleting.value = true
  try {
    await api.delete(`/courses/${courseToDelete.value.id}`)
    $q.notify({ type: 'positive', message: 'Course deleted.' })
    deleteDialog.value = false
    fetchCourses()
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to delete course.' })
  } finally {
    deleting.value = false
  }
}

watch([search, statusFilter], () => {
  if (pagination.value.page === 1) {
    fetchCourses()
    return
  }
  pagination.value.page = 1
})

watch(
  () => settings.value.defaultPageSize,
  (value) => {
    if (!value) {
      return
    }
    pagination.value.rowsPerPage = value
    if (pagination.value.page === 1) {
      fetchCourses()
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

watch(
  () => pagination.value.page,
  () => {
    fetchCourses()
  }
)

onMounted(fetchCourses)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');

.courses-page {
  min-height: 100vh;
  padding: 30px 24px 48px;
  font-family: 'Sora', sans-serif;
  color: #0b1220;
  background:
    radial-gradient(circle at 20% 10%, rgba(20, 184, 166, 0.12), transparent 45%),
    linear-gradient(180deg, #f8fafb, #eef2f7);
}

.courses-shell {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 22px;
}

.courses-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 20px;
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.hero-label {
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

.hero-actions {
  margin-top: 18px;
}

.hero-stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.stat-tile {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(15, 118, 110, 0.06);
  border: 1px solid rgba(15, 118, 110, 0.2);
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.stat-value {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 600;
}

.hero-insights {
  display: grid;
  gap: 14px;
}

.insight-card {
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(15, 118, 110, 0.02));
  border: 1px solid rgba(15, 118, 110, 0.2);
}

.insight-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #0f172a;
  margin-bottom: 10px;
}

.mix-bar {
  display: flex;
  height: 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.1);
  overflow: hidden;
}

.mix-active {
  background: linear-gradient(90deg, #14b8a6, #0f766e);
}

.mix-archived {
  background: rgba(148, 163, 184, 0.5);
}

.mix-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #475569;
}

.level-bars {
  display: grid;
  gap: 10px;
}

.level-row {
  display: grid;
  grid-template-columns: 1fr minmax(0, 1.5fr) auto;
  gap: 8px;
  align-items: center;
}

.level-name {
  font-size: 12px;
  color: #475569;
}

.level-bar {
  height: 8px;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.level-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #14b8a6, #0f766e);
}

.level-count {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.insight-empty {
  font-size: 12px;
  color: #64748b;
}

.courses-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
}

.courses-tools {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.tools-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.tool-input {
  min-width: 240px;
}

.tool-select {
  min-width: 160px;
}

.courses-card-grid {
  margin-top: 16px;
  background: #ffffff;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.courses-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}

.course-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.course-card {
  border-radius: 18px;
  padding: 18px 18px 20px;
  background: linear-gradient(145deg, #0f172a 0%, #0b3b3b 55%, #0f766e 120%);
  border: 1px solid rgba(20, 184, 166, 0.28);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.22);
  display: grid;
  gap: 14px;
  color: #f8fafc;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.course-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(248, 250, 252, 0.16), transparent 60%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.course-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 40px rgba(15, 23, 42, 0.28);
}

.course-card:hover::after {
  opacity: 1;
}

.course-card:focus-visible {
  outline: 2px solid rgba(248, 250, 252, 0.6);
  outline-offset: 3px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.card-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(248, 250, 252, 0.7);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin-top: 4px;
  color: #f8fafc;
}

.card-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(248, 250, 252, 0.65);
}

.card-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.meta-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(248, 250, 252, 0.6);
}

.meta-value {
  margin-top: 4px;
  font-weight: 600;
  color: #f8fafc;
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.course-card .status-active {
  background: rgba(20, 184, 166, 0.35);
  color: #e0fdfa;
}

.course-card .status-archived {
  background: rgba(148, 163, 184, 0.35);
  color: #e2e8f0;
}

.courses-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.empty-state {
  font-size: 13px;
  color: #64748b;
  padding: 8px 4px;
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

.courses-rail {
  display: grid;
  gap: 16px;
}

.rail-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.rail-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.rail-value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 6px;
  color: #0f172a;
}

.rail-meta {
  font-size: 12px;
  color: #475569;
  margin-top: 4px;
}

.progress {
  height: 8px;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  margin-top: 12px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #14b8a6, #0f766e);
}

.rail-row {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 13px;
  color: #475569;
}

.rail-row strong {
  color: #0f172a;
}

.dialog-card {
  min-width: 320px;
  max-width: 520px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafb 100%);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.14);
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


.courses-btn-primary {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  box-shadow: 0 10px 20px rgba(20, 184, 166, 0.25);
}

.courses-btn-primary :deep(.q-btn__content) {
  color: #f8fafc;
}

.courses-btn-ghost {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid rgba(20, 184, 166, 0.35);
  background: rgba(20, 184, 166, 0.08);
}

.courses-btn-ghost :deep(.q-btn__content),
.courses-btn-ghost :deep(.q-icon) {
  color: #0f766e;
}

@media (max-width: 1100px) {
  .courses-grid {
    grid-template-columns: 1fr;
  }

  .courses-rail {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

@media (max-width: 900px) {
  .courses-hero {
    grid-template-columns: 1fr;
  }

  .hero-stat-row {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}
</style>
