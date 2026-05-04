<template>
  <!-- Backdrop to close "more" panel -->
  <div
    v-if="showMore"
    class="md:hidden fixed inset-0 z-40"
    @click="showMore = false"
  />

  <!-- More panel -->
  <Transition name="more-panel">
    <div
      v-if="showMore"
      class="md:hidden fixed z-50 bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] px-3 py-3 flex items-center gap-2"
      :style="morePanelStyle"
    >
      <router-link
        v-for="link in secondaryLinks"
        :key="link.to"
        :to="link.to"
        @click="showMore = false"
        class="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl transition-all"
        :class="$route.path === link.to
          ? 'bg-indigo-600/10 text-indigo-600'
          : 'text-slate-400 hover:text-slate-700'"
      >
        <component
          :is="link.icon"
          :size="20"
          :stroke-width="$route.path === link.to ? 2.5 : 2"
        />
        <span class="text-[10px] font-black uppercase tracking-wider leading-none">{{ link.label }}</span>
      </router-link>
    </div>
  </Transition>

  <!-- Main nav bar -->
  <nav
    ref="navRef"
    class="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom,24px))] left-1/2 -translate-x-1/2 w-[88%] max-w-sm bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 px-3 flex items-center justify-between h-[72px]"
  >
    <router-link
      v-for="link in primaryLinks"
      :key="link.to"
      :to="link.to"
      class="relative flex items-center justify-center transition-all duration-300 ease-out"
      :class="$route.path === link.to ? 'w-12 bg-indigo-600/10 rounded-2xl h-12' : 'w-10 h-full'"
    >
      <component
        :is="link.icon"
        :size="22"
        :stroke-width="$route.path === link.to ? 2.5 : 2"
        class="transition-colors duration-300 flex-shrink-0"
        :class="$route.path === link.to ? 'text-indigo-600' : 'text-slate-400'"
      />
    </router-link>

    <!-- More button -->
    <button
      @click.stop="showMore = !showMore"
      class="relative flex items-center justify-center transition-all duration-300 ease-out"
      :class="isOnSecondary || showMore
        ? 'w-12 bg-indigo-600/10 rounded-2xl h-12'
        : 'w-10 h-full'"
    >
      <MoreHorizontal
        :size="22"
        :stroke-width="isOnSecondary || showMore ? 2.5 : 2"
        class="transition-colors duration-300 flex-shrink-0"
        :class="isOnSecondary || showMore ? 'text-indigo-600' : 'text-slate-400'"
      />
    </button>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Moon,
  Plane,
  Shirt,
  ClipboardList,
  MoreHorizontal
} from 'lucide-vue-next'

const route = useRoute()
const showMore = ref(false)
const navRef = ref(null)

const primaryLinks = [
  { to: '/',            label: 'Dash',  icon: LayoutDashboard },
  { to: '/musculation', label: 'Muscu', icon: Dumbbell },
  { to: '/nutrition',   label: 'Nutri', icon: Utensils },
  { to: '/sommeil',     label: 'Sleep', icon: Moon },
]

const secondaryLinks = [
  { to: '/travel',   label: 'Travel',   icon: Plane },
  { to: '/dressing', label: 'Dressing', icon: Shirt },
  { to: '/plan',     label: 'Plan',     icon: ClipboardList },
]

const secondaryPaths = secondaryLinks.map(l => l.to)
const isOnSecondary = computed(() => secondaryPaths.includes(route.path))

const morePanelStyle = computed(() => {
  if (!navRef.value) return { bottom: 'calc(6rem + env(safe-area-inset-bottom, 24px))', right: '3%' }
  const rect = navRef.value.getBoundingClientRect()
  const bottom = window.innerHeight - rect.top + 12
  return { bottom: `${bottom}px`, right: '3%' }
})
</script>

<style scoped>
svg {
  flex-shrink: 0;
}

.more-panel-enter-active,
.more-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.more-panel-enter-from,
.more-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}
</style>
