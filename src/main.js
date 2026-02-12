import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi'
  },
  theme: {
    defaultTheme: 'professionalTheme',
    themes: {
      professionalTheme: {
        dark: false,
        colors: {
          primary: '#1565C0',
          secondary: '#455A64',
          accent: '#0277BD',
          error: '#C62828',
          info: '#1976D2',
          success: '#2E7D32',
          warning: '#EF6C00',
          background: '#F5F5F5',
          surface: '#FFFFFF'
        }
      }
    }
  }
})

const app = createApp(App)
const pinia = createPinia()
app.use(vuetify)
app.use(pinia)
app.mount('#app')
