<template>
  <q-layout
    view="lHh Lpr lFf"
    class="app-shell"
    :style="{ '--chrome-gradient': chromeGradient }"
  >
    <q-header elevated class="app-header" :style="{ background: chromeGradient }">
      <q-toolbar class="app-toolbar">
        <q-btn
          flat
          dense
          round
          aria-label="Menu"
          class="menu-btn"
          :class="{ 'menu-btn--open': leftDrawerOpen }"
          @click="toggleLeftDrawer"
        >
          <transition name="menu-swap" mode="out-in">
            <q-icon
              :key="leftDrawerOpen ? 'open' : 'closed'"
              :name="leftDrawerOpen ? 'arrow_back' : 'menu'"
              class="menu-icon"
            />
          </transition>
        </q-btn>

        <q-toolbar-title class="app-title">
          <span class="title-mark">Lumen</span> LMS Admin
        </q-toolbar-title>

        <div class="header-chip">Admin</div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      dark
      class="app-drawer"
      content-class="app-drawer-content"
      :style="{ background: chromeGradient }"
      :content-style="{ background: chromeGradient, color: '#e2e8f0' }"
    >
      <div class="drawer-header">
        <div class="drawer-title">Control Center</div>
        <div class="drawer-subtitle">Spring Term 2026</div>
      </div>
      <q-list class="drawer-list">
        <q-item
          v-for="link in navLinks"
          :key="link.title"
          clickable
          v-ripple
          :to="link.to"
          class="drawer-item"
          active-class="drawer-item-active"
        >
          <q-item-section avatar>
            <q-icon :name="link.icon" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ link.title }}</q-item-label>
            <q-item-label caption>{{ link.caption }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'

const chromeGradient =
  'var(--app-chrome-gradient, linear-gradient(135deg, #111827, #1e293b))'

const navLinks = [
  { title: 'Dashboard', caption: 'Overview + metrics', icon: 'space_dashboard', to: '/dashboard' },
  { title: 'Students', caption: 'Roster and profiles', icon: 'groups', to: '/students' },
  { title: 'Teachers', caption: 'Faculty management', icon: 'person_pin', to: '/teachers' },
  { title: 'Courses', caption: 'Curriculum planning', icon: 'auto_stories', to: '/courses' },
  { title: 'Settings', caption: 'Admin preferences', icon: 'settings', to: '/settings' },
]

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap');

.app-shell {
  --chrome-gradient: var(
    --app-chrome-gradient,
    linear-gradient(135deg, #111827, #1e293b)
  );
  --chrome-ink: #f8fafc;
  --neon: var(--app-accent, #38bdf8);
  --neon-soft: rgba(56, 189, 248, 0.18);
  --neon-glow: 0 0 12px rgba(56, 189, 248, 0.35);
}

.app-header {
  background: var(--chrome-gradient);
}

.app-toolbar {
  color: var(--chrome-ink);
}

.app-title {
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: 0.02em;
}

.title-mark {
  color: #60a5fa;
  font-weight: 700;
  margin-right: 6px;
}

.header-chip {
  background: rgba(148, 163, 184, 0.2);
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.menu-btn {
  transition: background-color 0.3s ease;
}

.menu-icon {
  transition: transform 0.3s ease;
}

.menu-btn--open .menu-icon {
  transform: none;
}

.menu-swap-enter-active,
.menu-swap-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.menu-swap-enter-from,
.menu-swap-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.app-drawer {
  background: var(--chrome-gradient) !important;
  color: #e2e8f0;
  border-right: 1px solid rgba(148, 163, 184, 0.16);
}

:deep(.app-drawer-content) {
  background: var(--chrome-gradient) !important;
  color: #e2e8f0 !important;
}

.app-drawer :deep(.q-drawer__content) {
  background: var(--chrome-gradient) !important;
}

.app-drawer :deep(.q-item__label) {
  color: #f8fafc;
}

.app-drawer :deep(.q-item__label--caption) {
  color: rgba(226, 232, 240, 0.78);
}

.drawer-header {
  padding: 24px 20px 12px;
}

.drawer-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #f8fafc;
}

.drawer-subtitle {
  color: rgba(148, 163, 184, 0.8);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-top: 4px;
}

.drawer-list {
  padding: 4px 12px 20px;
}

.drawer-item {
  border-radius: 14px;
  margin: 8px 0;
  padding: 8px 12px;
  color: inherit;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.drawer-item :deep(.q-item__section--avatar) {
  min-width: 36px;
}

.drawer-item :deep(.q-icon) {
  color: var(--neon);
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.35));
}

.drawer-item-active {
  background: rgba(15, 23, 42, 0.55);
  border-color: rgba(56, 189, 248, 0.35);
  color: #f8fafc;
}

.drawer-item-active :deep(.q-icon) {
  color: #e0f2fe;
  filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.6));
}

.drawer-item :deep(.q-item__label--caption) {
  color: rgba(226, 232, 240, 0.78);
}

</style>
