<template>
  <div class="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50 text-slate-900">
    <!-- Sidebar for Desktop -->
    <aside v-if="user" class="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 flex-shrink-0 relative">
      <div class="h-20 flex items-center px-8">
        <h1 class="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <div class="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Activity :size="20" stroke-width="3" />
          </div>
          OmniDash
        </h1>
      </div>

      <nav class="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto font-sans text-[13px]">
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
      <header v-if="user" class="h-16 flex items-center justify-between md:hidden bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 flex-shrink-0 z-40">
        <h1 class="text-lg font-black tracking-tight flex items-center gap-2">
          <div class="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Activity :size="16" stroke-width="3" />
          </div>
          <span class="bg-gradient-to-r from-slate-900 to-indigo-600 bg-clip-text text-transparent">OmniDash</span>
        </h1>
        <button @click="handleLogout" class="text-slate-400 hover:text-rose-600 p-2 transition-colors">
          <LogOut :size="20" />
        </button>
      </header>

      <!-- Content Area with optimized scrolling and bottom space for Tab Bar -->
      <div class="flex-1 overflow-y-auto bg-slate-50/50 pb-24 md:pb-10">
        <div class="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto">
          <router-view></router-view>
        </div>
      </div>
    </main>

    <!-- Bottom Navigation for Mobile (Bottom Tab Bar) -->
    <nav v-if="user" class="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center h-16 safe-area-pb z-50 px-2 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      <router-link v-for="link in [
        { to: '/', label: 'Dash', icon: LayoutDashboard },
        { to: '/musculation', label: 'Muscu', icon: Dumbbell },
        { to: '/nutrition', label: 'Nutri', icon: Utensils },
        { to: '/sommeil', label: 'Sleep', icon: Moon }
      ]" :key="link.to" :to="link.to" class="mobile-nav-item">
        <div class="flex flex-col items-center gap-0.5">
          <component :is="link.icon" :size="22" stroke-width="2.5" />
          <span class="text-[10px] font-black uppercase tracking-widest">{{ link.label }}</span>
        </div>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { 
  LayoutDashboard, 
  Dumbbell, 
  Utensils, 
  Moon, 
  LogOut,
  Activity
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

.mobile-nav-item {
  @apply flex flex-col items-center justify-center flex-1 h-full text-slate-300 hover:text-indigo-600 transition-all;
}

.router-link-active.mobile-nav-item {
  @apply text-indigo-600;
}
</style>
