<template>
  <nav class="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom,24px))] left-1/2 -translate-x-1/2 w-[94%] max-w-lg bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 px-3 flex items-center justify-between h-[72px] transition-all duration-500 overflow-hidden">
    <router-link 
      v-for="link in navLinks" 
      :key="link.to" 
      :to="link.to" 
      class="relative flex items-center justify-center transition-all duration-300 ease-out"
      :class="[
        $route.path === link.to ? 'w-12 bg-indigo-600/10 rounded-2xl h-12' : 'w-10 h-full'
      ]"
    >
      <div class="flex items-center justify-center transition-transform duration-300" :class="{ 'scale-110': $route.path === link.to }">
        <component 
          :is="link.icon" 
          :size="22" 
          :stroke-width="$route.path === link.to ? 2.5 : 2"
          class="transition-colors duration-300"
          :class="$route.path === link.to ? 'text-indigo-600' : 'text-slate-400'"
        />
      </div>
      
      <!-- Indicator Dot for inactive items -->
      <div 
        v-if="$route.path !== link.to"
        class="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full opacity-0 transition-all duration-300"
      ></div>
    </router-link>
  </nav>
</template>

<script setup>
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Moon,
  Plane,
  Shirt,
  ClipboardList
} from 'lucide-vue-next'

const navLinks = [
  { to: '/', label: 'Dash', icon: LayoutDashboard },
  { to: '/musculation', label: 'Muscu', icon: Dumbbell },
  { to: '/nutrition', label: 'Nutri', icon: Utensils },
  { to: '/sommeil', label: 'Sleep', icon: Moon },
  { to: '/travel', label: 'Travel', icon: Plane },
  { to: '/dressing', label: 'Style', icon: Shirt },
  { to: '/plan', label: 'Plan', icon: ClipboardList }
]
</script>

<style scoped>
.router-link-active {
  /* Active state handled via dynamic classes for better flexibility */
}

/* Ensure icons don't shrink */
svg {
  flex-shrink: 0;
}
</style>
