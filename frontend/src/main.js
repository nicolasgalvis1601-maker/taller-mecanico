import { createApp } from 'vue'

// ---------- Quasar ----------
import { Quasar, Notify, Dialog, Loading, LoadingBar } from 'quasar'
import quasarLang from 'quasar/lang/es'
import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/roboto-font/roboto-font.css'
import 'quasar/src/css/index.sass'

// ---------- Pinia + persistencia ----------
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// ---------- Vue Router ----------
import { router } from './routes/routes.js'

import App from './App.vue'
import './css/app.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const myApp = createApp(App)

myApp.use(Quasar, {
  plugins: { Notify, Dialog, Loading, LoadingBar },
  lang: quasarLang,
  config: {
    notify: { position: 'top-right', timeout: 3000 },
    loadingBar: { color: 'accent', size: '3px' },
  },
})
myApp.use(pinia)
myApp.use(router)

myApp.mount('#app')
