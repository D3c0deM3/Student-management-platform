import { ref, watch } from 'vue'
import { Notify, setCssVar } from 'quasar'

const storageKey = 'lms_settings'

export const defaultSettings = {
  defaultPageSize: 10,
  compactTables: false,
  showInactive: true,
  theme: 'slate',
  accent: 'blue',
  sessionNotifications: true,
}

const settingsState = ref({ ...defaultSettings })
const lastSavedAtState = ref('')
let initialized = false

const accentMap = {
  blue: '#2563eb',
  teal: '#14b8a6',
  indigo: '#4f46e5',
}

function updateLastSaved() {
  const now = new Date()
  lastSavedAtState.value = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function applySettings(value) {
  if (typeof document === 'undefined') {
    return
  }
  const accent = accentMap[value.accent] || accentMap.blue
  setCssVar('primary', accent)
  document.documentElement.style.setProperty('--app-accent', accent)
  document.documentElement.setAttribute('data-theme', value.theme || 'slate')
  Notify.setDefaults({ position: 'top-right' })
}

function loadStoredSettings() {
  if (typeof window === 'undefined') {
    return { ...defaultSettings }
  }
  const raw = localStorage.getItem(storageKey)
  if (!raw) {
    return { ...defaultSettings }
  }
  try {
    const parsed = JSON.parse(raw)
    return { ...defaultSettings, ...parsed }
  } catch {
    return { ...defaultSettings }
  }
}

function persistSettings(value) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(storageKey, JSON.stringify(value))
}

export function initSettings() {
  if (initialized) {
    return
  }
  initialized = true
  settingsState.value = loadStoredSettings()
  updateLastSaved()
  applySettings(settingsState.value)

  watch(
    settingsState,
    (value) => {
      persistSettings(value)
      updateLastSaved()
      applySettings(value)
    },
    { deep: true }
  )
}

export function useSettings() {
  return {
    settings: settingsState,
    lastSavedAt: lastSavedAtState,
    updateLastSaved,
    defaultSettings,
  }
}

export function resetSettings() {
  settingsState.value = { ...defaultSettings }
  updateLastSaved()
  applySettings(settingsState.value)
  persistSettings(settingsState.value)
}
