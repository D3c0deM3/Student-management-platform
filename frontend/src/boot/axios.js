import { defineBoot } from '#q-app/wrappers'
import { Notify } from 'quasar'
import axios from 'axios'

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
const defaultBaseUrl = 'https://student-management-platform.fly.dev/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultBaseUrl,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

export default defineBoot(({ app, router }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status
      if (status === 401 && typeof window !== 'undefined') {
        const raw = localStorage.getItem('lms_settings')
        let notify = true
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            notify = parsed.sessionNotifications !== false
          } catch {
            notify = true
          }
        }
        localStorage.removeItem('auth_token')
        if (notify) {
          Notify.create({
            type: 'negative',
            message: 'Session expired. Please log in again.',
          })
        }
        if (router.currentRoute.value.path !== '/login') {
          await router.push({ path: '/login' })
        }
      }
      return Promise.reject(error)
    }
  )
})

export { api }
