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
      id="mobile-more-panel"
      class="more-panel"
      @keydown.esc="showMore = false"
    >
      <router-link
        v-for="link in secondaryLinks"
        :key="link.to"
        :to="link.to"
        @click="showMore = false"
        class="more-item"
        :class="{ 'more-item--active': $route.path === link.to }"
        :style="{ '--item-color': link.color, '--item-dim': link.dim }"
      >
        <span class="more-icon">
          <component :is="link.icon" :size="18" stroke-width="1.75" />
        </span>
        <span>{{ link.label }}</span>
      </router-link>

      <button class="more-item more-item--logout" @click="handleLogout">
        <span class="more-icon">
          <LogOut :size="18" stroke-width="1.75" />
        </span>
        <span>Déconnexion</span>
      </button>
    </div>
  </Transition>

  <!-- Nav bar -->
  <nav v-if="!focusModeActive" class="mobile-nav" aria-label="Navigation principale">
    <router-link
      v-for="link in primaryLinks"
      :key="link.to"
      :to="link.to"
      class="nav-item"
      :class="{ 'nav-item--active': $route.path === link.to }"
      :aria-label="link.label"
    >
      <component :is="link.icon" :size="20" stroke-width="1.75" class="nav-item-icon" />
      <span class="nav-item-label" aria-hidden="true">
        <span>{{ link.label }}</span>
      </span>
    </router-link>

    <!-- More -->
    <button
      @click.stop="showMore = !showMore"
      @keydown.esc="showMore = false"
      class="nav-item"
      :class="{ 'nav-item--active': isOnSecondary, 'nav-item--open': showMore && !isOnSecondary }"
      aria-label="Plus"
      aria-controls="mobile-more-panel"
      :aria-expanded="showMore"
    >
      <MoreHorizontal :size="20" stroke-width="1.75" class="nav-item-icon" />
      <span class="nav-item-label" aria-hidden="true">
        <span>Plus</span>
      </span>
    </button>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useFocusMode } from '@/composables/useFocusMode'
import {
  LayoutDashboard, Dumbbell, Utensils, Moon,
  Plane, Shirt, ClipboardList, MoreHorizontal, Wind, LogOut
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()
const { focusModeActive } = useFocusMode()
const showMore = ref(false)

const primaryLinks = [
  { to: '/',            label: "Aujourd'hui", icon: LayoutDashboard },
  { to: '/musculation', label: 'Muscu',       icon: Dumbbell },
  { to: '/nutrition',   label: 'Nutrition',   icon: Utensils },
  { to: '/sommeil',     label: 'Sommeil',     icon: Moon },
]

const secondaryLinks = [
  { to: '/plan',     label: 'Plan',     icon: ClipboardList, color: 'var(--accent)',         dim: 'var(--accent-dim)' },
  { to: '/travel',   label: 'Travel',   icon: Plane,         color: 'var(--module-travel)',  dim: 'var(--module-travel-dim)' },
  { to: '/dressing', label: 'Dressing', icon: Shirt,         color: 'var(--module-dress)',   dim: 'var(--module-dress-dim)' },
  { to: '/fenetres', label: 'Fenêtres', icon: Wind,          color: 'var(--module-windows)', dim: 'var(--module-windows-dim)' },
]

const secondaryPaths = secondaryLinks.map(l => l.to)
const isOnSecondary = computed(() => secondaryPaths.includes(route.path))

const handleLogout = async () => {
  showMore.value = false
  try {
    await logout()
    router.push('/login')
  } catch (e) {
    console.error(e.message)
  }
}
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
  right: var(--space-4);
  bottom: calc(92px + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-nav);
  flex-direction: column;
  gap: 2px;
  min-width: 220px;
  padding: var(--space-2);
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

@media (max-width: 767px) {
  .more-panel { display: flex; }
}

.more-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 48px;
  padding: 6px 12px 6px 6px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.more-item:hover { background: var(--bg-overlay); }
.more-item--active { background: var(--item-dim); }

.more-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--item-dim, var(--bg-overlay));
  color: var(--item-color, var(--text-secondary));
}

.more-item--active .more-icon { background: var(--bg-raised); }

.more-item--logout {
  margin-top: var(--space-1);
  color: var(--text-secondary);
}

/* ── Nav bar ── */
.mobile-nav {
  display: none;
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-nav);
  align-items: center;
  gap: var(--space-1);
  width: max-content;
  max-width: calc(100vw - 16px);
  padding: var(--space-2);
  background: var(--rail);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-lg);
  transform: translateX(-50%);
}

@media (max-width: 767px) {
  .mobile-nav { display: flex; }
}

/* ── Nav item ── */
.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 48px;
  height: 48px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--on-rail-dim);
  cursor: pointer;
  text-decoration: none;
  transition:
    background var(--dur-base) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.nav-item:active { transform: scale(0.95); }

.nav-item--active {
  padding: 0 16px;
  background: var(--on-rail);
  color: var(--on-rail-active);
}

.nav-item--open {
  background: var(--on-rail);
  color: var(--on-rail-active);
}

.nav-item:focus-visible { outline-color: var(--on-rail); }

.nav-item-icon { flex-shrink: 0; }

/* Le libellé s'ouvre sur l'élément actif, sans mesurer sa largeur en JS. */
.nav-item-label {
  display: grid;
  grid-template-columns: 0fr;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--on-rail-active-text);
  transition: grid-template-columns var(--dur-base) var(--ease-out);
}

.nav-item-label > span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.nav-item--active .nav-item-label {
  grid-template-columns: 1fr;
  margin-left: 6px;
}

/* Sur les très petits écrans, l'icône active suffit : les cinq cibles restent à 48 px. */
@media (max-width: 374px) {
  .mobile-nav { gap: 0; padding: var(--space-1); }
  .nav-item, .nav-item--active { padding: 0 12px; }
  .nav-item--active .nav-item-label { display: none; }
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
