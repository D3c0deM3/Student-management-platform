<template>
  <q-page class="settings-page">
    <div class="settings-shell">
      <section class="settings-hero">
        <div class="hero-copy">
          <div class="hero-label">Settings</div>
          <h1 class="hero-title">Workspace Controls</h1>
          <p class="hero-subtitle">
            Keep preferences consistent across the admin panel, from tables to
            session handling.
          </p>
          <div class="hero-actions">
            <q-btn
              label="Reset Defaults"
              flat
              color="primary"
              class="settings-btn-ghost"
              @click="resetDefaults"
            />
          </div>
        </div>
        <div class="hero-strip">
          <div class="strip-card">
            <div class="strip-label">Rows per page</div>
            <div class="strip-value">{{ settings.defaultPageSize }}</div>
          </div>
          <div class="strip-card">
            <div class="strip-label">Theme</div>
            <div class="strip-value">{{ settings.theme }}</div>
          </div>
          <div class="strip-card">
            <div class="strip-label">Accent</div>
            <div class="strip-value">{{ settings.accent }}</div>
          </div>
          <div class="strip-card">
            <div class="strip-label">Last saved</div>
            <div class="strip-value">{{ lastSavedAt || '-' }}</div>
          </div>
        </div>
      </section>

      <section class="settings-panels">
        <q-card class="panel-card">
          <q-card-section class="panel-header">
            <div>
              <div class="panel-title">Table preferences</div>
              <div class="panel-subtitle">Control list density and pagination.</div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section class="panel-body">
            <q-select
              v-model="settings.defaultPageSize"
              label="Default rows per page"
              outlined
              dense
              :options="pageSizeOptions"
              emit-value
              map-options
            />
            <q-toggle
              v-model="settings.compactTables"
              label="Use compact table rows"
              color="primary"
            />
            <q-toggle
              v-model="settings.showInactive"
              label="Show inactive records by default"
              color="primary"
            />
          </q-card-section>
        </q-card>

        <q-card class="panel-card accent">
          <q-card-section class="panel-header">
            <div>
              <div class="panel-title">Appearance</div>
              <div class="panel-subtitle">Set the workspace theme and accents.</div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section class="panel-body">
            <q-select
              v-model="settings.theme"
              label="Theme"
              outlined
              dense
              :options="themeOptions"
              emit-value
              map-options
            />
            <q-select
              v-model="settings.accent"
              label="Accent color"
              outlined
              dense
              :options="accentOptions"
              emit-value
              map-options
            />
          </q-card-section>
        </q-card>

        <q-card class="panel-card">
          <q-card-section class="panel-header">
            <div>
              <div class="panel-title">Security</div>
              <div class="panel-subtitle">Manage sessions and access.</div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section class="panel-body">
            <q-toggle
              v-model="settings.sessionNotifications"
              label="Notify when session expires"
              color="primary"
            />
            <div class="panel-actions">
              <q-btn
                label="Sign out"
                color="negative"
                unelevated
                class="settings-btn-danger"
                @click="signOut"
              />
            </div>
          </q-card-section>
        </q-card>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios'
import { resetSettings, useSettings } from 'src/composables/useSettings'

const $q = useQuasar()
const router = useRouter()

const { settings, lastSavedAt } = useSettings()

const pageSizeOptions = [
  { label: '10 rows', value: 10 },
  { label: '20 rows', value: 20 },
  { label: '50 rows', value: 50 },
]

const themeOptions = [
  { label: 'Slate', value: 'slate' },
  { label: 'Graphite', value: 'graphite' },
  { label: 'Cloud', value: 'cloud' },
]

const accentOptions = [
  { label: 'Blue', value: 'blue' },
  { label: 'Teal', value: 'teal' },
  { label: 'Indigo', value: 'indigo' },
]

function resetDefaults() {
  resetSettings()
  $q.notify({ type: 'positive', message: 'Settings reset to defaults.' })
}

async function signOut() {
  try {
    await api.post('/auth/logout')
  } catch {
    // ignore logout failures
  } finally {
    localStorage.removeItem('auth_token')
    $q.notify({ type: 'info', message: 'Signed out. Please log in again.' })
    router.push('/login')
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

.settings-page {
  min-height: 100vh;
  padding: 28px 24px 48px;
  font-family: 'DM Sans', sans-serif;
  color: #0b1220;
  background:
    radial-gradient(circle at 15% 12%, rgba(20, 184, 166, 0.12), transparent 40%),
    linear-gradient(180deg, #f7f9fc, #eef2f7);
}

.settings-shell {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 22px;
}

.settings-hero {
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

.hero-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.strip-card {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(15, 118, 110, 0.06);
  border: 1px solid rgba(15, 118, 110, 0.2);
}

.strip-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.strip-value {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 600;
}

.settings-panels {
  display: grid;
  gap: 18px;
}

.panel-card {
  border-radius: 18px;
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
  border-left: 4px solid rgba(20, 184, 166, 0.45);
}

.panel-card.accent {
  border-left-color: rgba(59, 130, 246, 0.55);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
}

.panel-subtitle {
  color: #64748b;
  font-size: 13px;
}

.panel-body {
  display: grid;
  gap: 14px;
}

.panel-actions {
  display: flex;
  justify-content: flex-start;
}

.settings-btn-ghost {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid rgba(20, 184, 166, 0.35);
  background: rgba(20, 184, 166, 0.08);
}

.settings-btn-ghost :deep(.q-btn__content) {
  color: #0f766e;
}

.settings-btn-danger {
  border-radius: 12px;
  padding: 8px 18px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .settings-hero {
    grid-template-columns: 1fr;
  }
}
</style>
