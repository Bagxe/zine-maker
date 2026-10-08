import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
// vue-konva does not ship types; declare module in local d.ts if needed
import VueKonva from 'vue-konva'
import './style.css'
import { i18n, applyLocaleDirection, type AppLocale } from './i18n'

// Import page components
import ZineMaker from './pages/ZineMaker.vue'
import MarkdownEditor from './pages/MarkdownEditor.vue'

const routes = [
  { path: '/', component: ZineMaker },
  { path: '/markdown', component: MarkdownEditor }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const app = createApp(App)
const pinia = createPinia()

applyLocaleDirection(i18n.global.locale.value as AppLocale)

app.use(pinia)
app.use(VueKonva)
app.use(router)
app.use(i18n)
app.mount('#app')
