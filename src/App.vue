<template>
  <div class="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-16 md:pb-0 h-screen overflow-hidden">
    <!-- Sidebar for Desktop -->
    <aside v-if="user" class="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 flex-shrink-0">
      <div class="h-16 flex items-center justify-between px-6 border-b border-gray-100">
        <h1 class="text-xl font-bold text-indigo-600">OmniDash</h1>
      </div>
      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <router-link to="/" class="nav-item">
          <span class="text-lg mr-3">📊</span> Dashboard
        </router-link>
        <router-link to="/musculation" class="nav-item">
          <span class="text-lg mr-3">💪</span> Musculation
        </router-link>
        <router-link to="/nutrition" class="nav-item">
          <span class="text-lg mr-3">🥗</span> Nutrition
        </router-link>
        <router-link to="/sommeil" class="nav-item">
          <span class="text-lg mr-3">😴</span> Sommeil
        </router-link>
      </nav>
      <div class="p-4 border-t border-gray-100">
        <button @click="handleLogout" class="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
          <span class="mr-2">🚪</span> Se déconnecter
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0" :class="{ 'h-screen': !user }">
      <!-- Mobile Header -->
      <header v-if="user" class="h-16 flex items-center justify-between md:hidden bg-white border-b border-gray-100 px-4 flex-shrink-0">
        <h1 class="text-xl font-bold text-indigo-600">OmniDash</h1>
        <button @click="handleLogout" class="text-sm font-medium text-red-600 p-2">
          Déconnexion
        </button>
      </header>
      <!-- Web Wrapper for no auth pages (like Login) -->
      <div v-else-if="!user" class="absolute top-4 left-4 md:hidden z-10 w-full text-center">
        <!-- Logo on mobile login screen could be here if needed -->
      </div>
      
      <div class="flex-1 p-4 md:p-8 overflow-y-auto">
        <router-view></router-view>
      </div>
    </main>

    <!-- Bottom Navigation for Mobile -->
    <nav v-if="user" class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-16 safe-area-pb z-50">
      <router-link to="/" class="mobile-nav-item">
        <span class="text-xl leading-none mb-1">📊</span>
        <span class="text-[10px] font-medium leading-none">Dash</span>
      </router-link>
      <router-link to="/musculation" class="mobile-nav-item">
        <span class="text-xl leading-none mb-1">💪</span>
        <span class="text-[10px] font-medium leading-none">Muscu</span>
      </router-link>
      <router-link to="/nutrition" class="mobile-nav-item">
        <span class="text-xl leading-none mb-1">🥗</span>
        <span class="text-[10px] font-medium leading-none">Nutri</span>
      </router-link>
      <router-link to="/sommeil" class="mobile-nav-item">
        <span class="text-xl leading-none mb-1">😴</span>
        <span class="text-[10px] font-medium leading-none">Sommeil</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

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
  @apply flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors;
}
.router-link-exact-active.nav-item {
  @apply bg-indigo-50 text-indigo-600;
}

.mobile-nav-item {
  @apply flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-indigo-600 transition-colors pt-1;
}
.router-link-exact-active.mobile-nav-item {
  @apply text-indigo-600;
}
</style>
