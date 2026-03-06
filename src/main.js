import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL)
