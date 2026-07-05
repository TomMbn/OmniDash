<template>
  <!-- Backdrop -->
  <div
    v-if="showMore"
    class="more-backdrop"
    @click="showMore = false"
  />

  <!-- More panel -->
  <Transition name="more-panel">
    <div
      v-if="showMore"
      class="more-panel"
      :style="morePanelStyle"
    >
      <router-link
        v-for="link in secondaryLinks"
        :key="link.to"
        :to="link.to"
        @click="showMore = false"
        class="more-item"
        :class="{ 'more-item--active': $route.path === link.to }"
        :style="{ '--item-color': link.color }"
      >
        <component :is="link.icon" :size="17" stroke-width="1.75" />
        <span>{{ link.label }}</span>
      </router-link>
    </div>
  </Transition>

  <!-- Nav bar -->
  <nav ref="navRef" class="mobile-nav" role="navigation" aria-label="Navigation principale">
    <router-link
      v-for="link in primaryLinks"
      :key="link.to"
      :to="link.to"
      class="nav-item"
      :class="{ 'nav-item--active': $route.path === link.to }"
      :style="{ '--item-color': link.color }"
      :aria-label="link.label"
    >
      <component
        :is="link.icon"
        :size="20"
        :stroke-width="$route.path === link.to ? 2 : 1.75"
        class="nav-item-icon"
      />
      <div class="nav-item-dot" />
    </router-link>

    <!-- More -->
    <button
      @click.stop="showMore = !showMore"
      class="nav-item"
      :class="{ 'nav-item--active': isOnSecondary || showMore }"
      style="--item-color: var(--text-secondary)"
      aria-label="Plus"
    >
      <MoreHorizontal
        :size="20"
        :stroke-width="isOnSecondary || showMore ? 2 : 1.75"
        class="nav-item-icon"
      />
      <div class="nav-item-dot" />
    </button>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard, Dumbbell, Utensils, Moon,
  Plane, Shirt, ClipboardList, MoreHorizontal, Wind
} from 'lucide-vue-next'

const route = useRoute()
const showMore = ref(false)
const navRef = ref(null)

const primaryLinks = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard, color: 'var(--accent)' },
  { to: '/musculation', label: 'Musculation', icon: Dumbbell,         color: 'var(--module-muscu)' },
  { to: '/nutrition',   label: 'Nutrition',   icon: Utensils,         color: 'var(--module-nutri)' },
  { to: '/sommeil',     label: 'Sommeil',     icon: Moon,             color: 'var(--module-sleep)' },
]

const secondaryLinks = [
  { to: '/travel',   label: 'Travel',   icon: Plane,         color: 'var(--module-travel)' },
  { to: '/dressing', label: 'Dressing', icon: Shirt,         color: 'var(--module-dress)' },
  { to: '/plan',     label: 'Plan',     icon: ClipboardList, color: 'var(--accent)' },
  { to: '/fenetres', label: 'Fenêtres', icon: Wind,          color: 'var(--text-secondary)' },
]

const secondaryPaths = secondaryLinks.map(l => l.to)
const isOnSecondary = computed(() => secondaryPaths.includes(route.path))

const morePanelStyle = computed(() => {
  if (!navRef.value) return {
    bottom: 'calc(90px + env(safe-area-inset-bottom, 16px))',
    right: '16px'
  }
  const rect = navRef.value.getBoundingClientRect()
  return {
    bottom: `${window.innerHeight - rect.top + 8}px`,
    right: '16px'
  }
})
</script>

<style scoped>
/* ── Backdrop ── */
.more-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-nav) - 1);
}

@media (max-width: 767px) {
  .more-backdrop { display: block; }
}

/* ── More panel ── */
.more-panel {
  display: none;
  position: fixed;
  z-index: var(--z-nav);
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 8px;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
}

@media (max-width: 767px) {
  .more-panel { display: flex; }
}

.more-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--text-muted);
  text-decoration: none;
  transition:
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.more-item:hover {
  color: var(--text-secondary);
  background: var(--bg-subtle);
}

.more-item--active {
  color: var(--item-color);
  background: color-mix(in srgb, var(--item-color) 10%, transparent);
}

/* ── Nav bar ── */
.mobile-nav {
  display: none;
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 360px;
  height: 64px;
  z-index: var(--z-nav);
  background: color-mix(in srgb, var(--bg-overlay) 88%, transparent);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: 0 20px;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 767px) {
  .mobile-nav { display: flex; }
}

/* ── Nav item ── */
.nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  color: var(--text-disabled);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition:
    color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.nav-item:active {
  transform: scale(0.92);
}

.nav-item--active {
  color: var(--item-color);
}

.nav-item-icon {
  flex-shrink: 0;
  transition: transform var(--dur-base) var(--ease-out);
}

.nav-item--active .nav-item-icon {
  transform: scale(1.08);
}

.nav-item-dot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: var(--item-color);
  opacity: 0;
  transform: scale(0);
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.nav-item--active .nav-item-dot {
  opacity: 1;
  transform: scale(1);
}

/* ── Transitions ── */
.more-panel-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.more-panel-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}
.more-panel-enter-from,
.more-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}
</style>
