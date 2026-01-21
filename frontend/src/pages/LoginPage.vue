<template>
  <q-page class="login-page">
    <div class="login-card">
      <div class="login-title">Student Management</div>
      <div class="login-subtitle">Sign in to continue</div>

      <q-banner
        v-if="errorMessage"
        dense
        rounded
        class="q-mb-md bg-red-1 text-red-9"
      >
        {{ errorMessage }}
      </q-banner>

      <q-form @submit.prevent="onSubmit">
        <q-input
          v-model="email"
          type="email"
          label="Email"
          filled
          class="q-mb-md"
          autocomplete="email"
        />
        <q-input
          v-model="password"
          type="password"
          label="Password"
          filled
          class="q-mb-md"
          autocomplete="current-password"
        />
        <q-btn
          label="Login"
          color="primary"
          unelevated
          type="submit"
          class="full-width"
          :loading="loading"
        />
      </q-form>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from 'boot/axios'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Email and password are required.'
    return
  }

  loading.value = true
  try {
    const response = await api.post('/auth/login', {
      email: email.value,
      password: password.value,
    })

    localStorage.setItem('auth_token', response.data.token)
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || 'Unable to sign in right now.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at top, #f5f7fb, #e6ecf5);
}

.login-card {
  width: min(420px, 100%);
  background: #ffffff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 12px 30px rgba(24, 39, 75, 0.12);
}

.login-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.login-subtitle {
  margin: 6px 0 18px;
  color: #5a6b7c;
}
</style>

