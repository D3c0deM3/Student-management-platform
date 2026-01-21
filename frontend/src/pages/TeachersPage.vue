<template>
  <q-page class="teachers-page">
    <div class="teachers-shell">
      <section class="teachers-hero">
        <div class="hero-copy">
          <div class="hero-label">Teachers</div>
          <h1 class="hero-title">Faculty Directory</h1>
          <p class="hero-subtitle">
            Align faculty coverage with specialties, availability, and status updates.
          </p>
          <div class="hero-actions">
            <q-btn
              label="Add Teacher"
              color="primary"
              unelevated
              class="teachers-btn-primary"
              @click="openCreate"
            />
          </div>
          <div class="hero-stats">
            <div class="stat-tile">
              <div class="stat-label">Total</div>
              <div class="stat-value">{{ totalTeachers }}</div>
            </div>
            <div class="stat-tile">
              <div class="stat-label">Active</div>
              <div class="stat-value">{{ activeTeachers }}</div>
            </div>
            <div class="stat-tile">
              <div class="stat-label">Coverage</div>
              <div class="stat-value">{{ activePercent }}%</div>
            </div>
          </div>
        </div>
        <div class="hero-chart">
          <div class="chart-header">
            <div>
              <div class="chart-title">Faculty activity</div>
              <div class="chart-value">{{ trendTotal }} joins</div>
            </div>
            <div class="chart-range">Last 8 weeks</div>
          </div>
          <div class="chart-frame">
            <svg class="chart-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="teacherLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#2563eb" />
                  <stop offset="100%" stop-color="#38bdf8" />
                </linearGradient>
                <linearGradient id="teacherFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(37, 99, 235, 0.28)" />
                  <stop offset="100%" stop-color="rgba(37, 99, 235, 0.02)" />
                </linearGradient>
              </defs>
              <g class="chart-grid">
                <line x1="0" y1="8" x2="100" y2="8" />
                <line x1="0" y1="16" x2="100" y2="16" />
                <line x1="0" y1="24" x2="100" y2="24" />
                <line x1="0" y1="32" x2="100" y2="32" />
              </g>
              <path :d="trendAreaPath" class="chart-area" />
              <path :d="trendPath" class="chart-line" />
            </svg>
          </div>
        </div>
      </section>

      <section class="teachers-layout">
        <div class="teachers-main">
          <div class="teachers-tools">
            <div class="tools-left">
              <q-input
                v-model="search"
                dense
                outlined
                debounce="350"
                placeholder="Search by name or specialty"
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
                class="teachers-btn-ghost"
                @click="fetchTeachers"
              />
            </div>
          </div>

          <div class="teachers-table-card">
            <q-table
              flat
              class="teachers-table"
              :rows="rows"
              :columns="columns"
              row-key="id"
              :dense="settings.compactTables"
              :loading="loading"
              v-model:pagination="pagination"
              :rows-per-page-options="[10, 20, 50]"
              binary-state-sort
              @request="onRequest"
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
                <q-td :props="props" class="table-actions">
                  <q-btn flat dense round icon="more_vert" aria-label="Teacher actions">
                    <q-menu anchor="bottom right" self="top right">
                      <q-list dense>
                        <q-item clickable v-close-popup @click="openEdit(props.row)">
                          <q-item-section avatar>
                            <q-icon name="edit" />
                          </q-item-section>
                          <q-item-section>Edit teacher</q-item-section>
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
          </div>
        </div>

        <aside class="teachers-rail">
          <div class="rail-card">
            <div class="rail-title">Coverage status</div>
            <div class="rail-value">{{ activePercent }}%</div>
            <div class="rail-meta">Active teachers</div>
            <div class="progress">
              <div
                class="progress-bar"
                :style="{ width: `${activePercent}%` }"
              ></div>
            </div>
            <div class="rail-row">
              <span>Active</span>
              <strong>{{ activeTeachers }}</strong>
            </div>
            <div class="rail-row">
              <span>Inactive</span>
              <strong>{{ totalTeachers - activeTeachers }}</strong>
            </div>
          </div>
          <div class="rail-card">
            <div class="rail-title">Specialty distribution</div>
            <div v-if="specialtyBars.length" class="specialty-bars">
              <div v-for="bar in specialtyBars" :key="bar.label" class="specialty-row">
                <div class="specialty-name">{{ bar.label }}</div>
                <div class="specialty-bar">
                  <span :style="{ width: `${bar.percent}%` }"></span>
                </div>
                <div class="specialty-count">{{ bar.count }}</div>
              </div>
            </div>
            <div v-else class="rail-empty">No specialties listed yet.</div>
          </div>
        </aside>
      </section>
    </div>

    <q-dialog v-model="formDialog">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">
            {{ formMode === 'create' ? 'Add Teacher' : 'Edit Teacher' }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form class="dialog-form" @submit.prevent="saveTeacher">
            <q-input
              v-model="form.full_name"
              label="Full name"
              outlined
              dense
              :rules="[(val) => !!val || 'Name is required']"
            />
            <q-input v-model="form.phone" label="Phone" outlined dense />
            <q-input v-model="form.specialty" label="Specialty" outlined dense />
            <q-select
              v-model="form.status"
              label="Status"
              outlined
              dense
              :options="teacherStatusOptions"
              emit-value
              map-options
            />
            <div class="dialog-actions">
              <q-btn flat label="Cancel" v-close-popup />
              <q-btn
                label="Save"
                color="primary"
                unelevated
                class="teachers-btn-primary"
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
          <div class="dialog-title">Delete Teacher</div>
        </q-card-section>
        <q-card-section>
          This will remove the teacher profile and unassign active courses.
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

const teacherStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const columns = [
  { name: 'full_name', label: 'Teacher', field: 'full_name', align: 'left', sortable: true },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' },
  { name: 'specialty', label: 'Specialty', field: 'specialty', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'created_at', label: 'Created', field: 'created_at', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const totalTeachers = computed(
  () => pagination.value.rowsNumber || rows.value.length
)
const activeTeachers = computed(
  () => rows.value.filter((row) => row.status === 'active').length
)
const activePercent = computed(() => {
  if (!totalTeachers.value) {
    return 0
  }
  return Math.round((activeTeachers.value / totalTeachers.value) * 100)
})

const specialtyBars = computed(() => {
  const tally = new Map()
  rows.value.forEach((row) => {
    const value = (row.specialty || 'Unspecified').trim()
    tally.set(value, (tally.get(value) || 0) + 1)
  })
  const total = rows.value.length || 1
  return Array.from(tally.entries())
    .map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const trendSeries = computed(() => {
  const weeks = 8
  const counts = Array(weeks).fill(0)
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
    if (diffWeeks < 0 || diffWeeks >= weeks) {
      return
    }
    const index = weeks - 1 - diffWeeks
    counts[index] += 1
  })
  return counts
})

const trendTotal = computed(() =>
  trendSeries.value.reduce((sum, value) => sum + value, 0)
)

const trendPoints = computed(() => {
  const values = trendSeries.value
  const max = Math.max(1, ...values)
  const chartHeight = 40
  const padding = 4
  const usableHeight = chartHeight - padding * 2
  const step = values.length > 1 ? 100 / (values.length - 1) : 0
  return values.map((value, index) => {
    const x = step * index
    const y = chartHeight - padding - (value / max) * usableHeight
    return { x, y }
  })
})

const trendPath = computed(() => {
  const points = trendPoints.value
  if (!points.length) {
    return ''
  }
  return `M ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`
})

const trendAreaPath = computed(() => {
  const points = trendPoints.value
  if (!points.length) {
    return ''
  }
  const chartHeight = 40
  const padding = 4
  return [
    `M ${points[0].x} ${chartHeight - padding}`,
    `L ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`,
    `L ${points[points.length - 1].x} ${chartHeight - padding}`,
    'Z',
  ].join(' ')
})

const formDialog = ref(false)
const formMode = ref('create')
const form = ref({
  id: null,
  full_name: '',
  phone: '',
  specialty: '',
  status: 'active',
})

const deleteDialog = ref(false)
const teacherToDelete = ref(null)

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

async function fetchTeachers() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      search: search.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    }
    const response = await api.get('/teachers', { params })
    const payload = response.data || {}
    const items = Array.isArray(payload)
      ? payload
      : payload.data || payload.items || payload.rows || payload.teachers || []
    const total = payload.total || payload.count || payload.rowsNumber || items.length
    rows.value = items.map((teacher) => ({
      ...teacher,
      full_name:
        teacher.full_name ||
        [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') ||
        teacher.name ||
        'Untitled',
      status: teacher.status || 'active',
      specialty: teacher.specialty || '',
    }))
    pagination.value = {
      ...pagination.value,
      rowsNumber: total,
      page: payload.page || pagination.value.page,
    }
  } catch {
    rows.value = []
    pagination.value = { ...pagination.value, rowsNumber: 0 }
    $q.notify({ type: 'negative', message: 'Unable to load teachers.' })
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
  fetchTeachers()
}

function openCreate() {
  formMode.value = 'create'
  form.value = {
    id: null,
    full_name: '',
    phone: '',
    specialty: '',
    status: 'active',
  }
  formDialog.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  form.value = {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone || '',
    specialty: row.specialty || '',
    status: row.status || 'active',
  }
  formDialog.value = true
}

function openDelete(row) {
  teacherToDelete.value = row
  deleteDialog.value = true
}

async function saveTeacher() {
  saving.value = true
  try {
    const payload = {
      full_name: form.value.full_name,
      phone: form.value.phone || null,
      specialty: form.value.specialty || null,
      status: form.value.status,
    }
    if (formMode.value === 'create') {
      await api.post('/teachers', payload)
      $q.notify({ type: 'positive', message: 'Teacher created.' })
    } else {
      await api.put(`/teachers/${form.value.id}`, payload)
      $q.notify({ type: 'positive', message: 'Teacher updated.' })
    }
    formDialog.value = false
    fetchTeachers()
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to save teacher.' })
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!teacherToDelete.value) {
    return
  }
  deleting.value = true
  try {
    await api.delete(`/teachers/${teacherToDelete.value.id}`)
    $q.notify({ type: 'positive', message: 'Teacher deleted.' })
    deleteDialog.value = false
    fetchTeachers()
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to delete teacher.' })
  } finally {
    deleting.value = false
  }
}

watch(
  () => settings.value.defaultPageSize,
  (value) => {
    if (!value) {
      return
    }
    pagination.value.rowsPerPage = value
    if (pagination.value.page === 1) {
      fetchTeachers()
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
    fetchTeachers()
    return
  }
  pagination.value.page = 1
})

onMounted(fetchTeachers)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

.teachers-page {
  min-height: 100vh;
  padding: 28px 24px 48px;
  font-family: 'IBM Plex Sans', sans-serif;
  color: #0b1220;
  background:
    radial-gradient(circle at 12% 18%, rgba(20, 184, 166, 0.14), transparent 45%),
    linear-gradient(180deg, #f8fafb, #eef2f7);
}

.teachers-shell {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 22px;
}

.teachers-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 20px;
  padding: 24px;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.2);
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

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stat-tile {
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #111827, #1e293b);
  border: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.18);
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(248, 250, 252, 0.7);
}

.stat-value {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 600;
  color: #f8fafc;
}

.hero-chart {
  padding: 18px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.chart-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.chart-value {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.chart-range {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #1d4ed8;
  background: rgba(37, 99, 235, 0.1);
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.chart-frame {
  margin-top: 16px;
  padding: 12px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.6));
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.chart-svg {
  width: 100%;
  height: 160px;
}

.chart-grid line {
  stroke: rgba(148, 163, 184, 0.35);
  stroke-dasharray: 2 4;
}

.chart-area {
  fill: url(#teacherFill);
}

.chart-line {
  fill: none;
  stroke: url(#teacherLine);
  stroke-width: 2.4;
}

.teachers-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
}

.teachers-tools {
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

.teachers-table-card {
  margin-top: 16px;
  background: #ffffff;
  border-radius: 20px;
  padding: 12px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.teachers-table :deep(th) {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
}

.teachers-table :deep(.q-table__bottom) {
  position: relative;
  justify-content: flex-end;
  gap: 12px;
}

.teachers-table :deep(.q-table__bottom .q-table__separator) {
  display: none;
}

.teachers-table :deep(.q-table__bottom .q-table__control:first-child) {
  margin-left: auto;
}

.teachers-table :deep(.q-table__bottom .q-table__control:last-child) {
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

.teachers-rail {
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
  margin: 12px 0;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #14b8a6, #0f766e);
}

.rail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #475569;
  margin-top: 8px;
}

.rail-row strong {
  color: #0f172a;
}

.specialty-bars {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.specialty-row {
  display: grid;
  grid-template-columns: 1fr minmax(0, 1.3fr) auto;
  gap: 8px;
  align-items: center;
}

.specialty-name {
  font-size: 12px;
  color: #475569;
}

.specialty-bar {
  height: 8px;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.specialty-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #14b8a6, #0f766e);
}

.specialty-count {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.rail-empty {
  font-size: 12px;
  color: #64748b;
  margin-top: 12px;
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

.teachers-btn-primary {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #14b8a6, #0f766e);
  box-shadow: 0 10px 20px rgba(20, 184, 166, 0.25);
}

.teachers-btn-primary :deep(.q-btn__content) {
  color: #f8fafc;
}

.teachers-btn-ghost {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid rgba(20, 184, 166, 0.35);
  background: rgba(20, 184, 166, 0.08);
}

.teachers-btn-ghost :deep(.q-btn__content),
.teachers-btn-ghost :deep(.q-icon) {
  color: #0f766e;
}

.table-pagination {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 10px 0 6px;
}

@media (max-width: 1100px) {
  .teachers-layout {
    grid-template-columns: 1fr;
  }

  .teachers-rail {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

@media (max-width: 900px) {
  .teachers-hero {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}
</style>
