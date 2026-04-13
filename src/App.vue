<template>
  <div class="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50 text-slate-900">
    <!-- Sidebar for Desktop -->
    <aside v-if="user" class="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 flex-shrink-0 relative">
      <div class="h-20 flex items-center px-8">
        <h1 class="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <img src="/pwa-192x192.png" alt="Logo" class="w-8 h-8 rounded-xl object-contain shadow-sm" />
          OmniDash
        </h1>
      </div>

      <nav class="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto font-sans text-[13px] select-none">
        <router-link to="/" class="nav-item group">
          <div class="active-bar"></div>
          <LayoutDashboard :size="20" class="icon" />
          <span class="font-bold uppercase tracking-wider">Dashboard</span>
        </router-link>
        
        <router-link to="/musculation" class="nav-item group">
          <div class="active-bar"></div>
          <Dumbbell :size="20" class="icon" />
          <span class="font-bold uppercase tracking-wider">Musculation</span>
        </router-link>
        
        <router-link to="/nutrition" class="nav-item group">
          <div class="active-bar"></div>
          <Utensils :size="20" class="icon" />
          <span class="font-bold uppercase tracking-wider">Nutrition</span>
        </router-link>
        
        <router-link to="/sommeil" class="nav-item group">
          <div class="active-bar"></div>
          <Moon :size="20" class="icon" />
          <span class="font-bold uppercase tracking-wider">Sommeil</span>
        </router-link>
        
        <router-link to="/travel" class="nav-item group">
          <div class="active-bar"></div>
          <Plane :size="20" class="icon" />
          <span class="font-bold uppercase tracking-wider">Travel</span>
        </router-link>

        <router-link to="/dressing" class="nav-item group">
          <div class="active-bar"></div>
          <Shirt :size="20" class="icon" />
          <span class="font-bold uppercase tracking-wider">Dressing</span>
        </router-link>
      </nav>

      <div class="p-6 border-t border-slate-50">
        <button @click="handleLogout" class="w-full flex items-center justify-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all group">
          <LogOut :size="18" class="group-hover:translate-x-0.5 transition-transform" /> 
          Déconnexion
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Mobile Header -->
      <header v-if="user" class="h-16 flex items-center justify-between md:hidden bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 flex-shrink-0 z-40 select-none">
        <h1 class="text-lg font-black tracking-tight flex items-center gap-2">
          <img src="/pwa-192x192.png" alt="Logo" class="w-7 h-7 rounded-lg object-contain" />
          <span class="bg-gradient-to-r from-slate-900 to-indigo-600 bg-clip-text text-transparent">OmniDash</span>
        </h1>
        <button @click="handleLogout" class="text-slate-400 hover:text-rose-600 p-2 transition-colors">
          <LogOut :size="20" />
        </button>
      </header>

      <!-- Content Area with optimized scrolling and bottom space for Tab Bar -->
      <div class="flex-1 overflow-y-auto bg-slate-50/50 pb-32 md:pb-10">
        <div class="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto">
          <router-view></router-view>
        </div>
      </div>
    </main>

    <!-- Bottom Navigation for Mobile (Bottom Tab Bar) -->
    <MobileNav v-if="user" />
  </div>
</template>

<script setup>
import MobileNav from '@/components/MobileNav.vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { 
  LayoutDashboard, 
  Dumbbell, 
  Utensils, 
  Moon, 
  LogOut,
  Plane,
  Shirt
} from 'lucide-vue-next'

const router = useRouter()
const { user, logout } = useAuth()

const handleLogout = async () => {
  try {
    await logout()
    router.push('/login')
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error.message)
  }
}
</script>

<style>
.nav-item {
  @apply relative flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium text-slate-400 hover:text-slate-900 transition-all duration-300;
}

.nav-item .icon {
  @apply text-slate-300 group-hover:text-slate-900 transition-colors;
}

.nav-item .active-bar {
  @apply absolute left-0 w-1 h-0 bg-indigo-600 rounded-full transition-all duration-300 opacity-0;
}

.router-link-active.nav-item {
  @apply bg-indigo-50/50 text-indigo-600;
}

.router-link-active.nav-item .icon {
  @apply text-indigo-600;
}

.router-link-active.nav-item .active-bar {
  @apply h-6 opacity-100;
}
</style>
