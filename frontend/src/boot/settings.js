import { defineBoot } from '#q-app/wrappers'
import { initSettings } from 'src/composables/useSettings'

export default defineBoot(() => {
  initSettings()
})
