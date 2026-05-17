<template>
  <div class="app-shell">

    <!-- ── Desktop Sidebar ── -->
    <aside v-if="user" class="sidebar">
      <div class="sidebar-logo">
        <img src="/pwa-192x192.png" alt="" class="sidebar-logo-img" />
        <span class="sidebar-logo-name">OmniDash</span>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="sidebar-link"
          :style="{ '--module-color': link.color }"
        >
          <component :is="link.icon" :size="18" stroke-width="1.75" class="sidebar-link-icon" />
          <span>{{ link.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button @click="handleLogout" class="sidebar-logout">
          <LogOut :size="16" stroke-width="1.75" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>

    <!-- ── Main ── -->
    <main class="app-main">

      <!-- Mobile Header -->
      <header v-if="user" class="mobile-header">
        <span class="mobile-header-logo">OmniDash</span>
        <button @click="handleLogout" class="mobile-header-logout" aria-label="Déconnexion">
          <LogOut :size="18" stroke-width="1.75" />
        </button>
      </header>

      <!-- Content -->
      <div class="app-content">
        <router-view v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </router-view>
      </div>
    </main>

    <!-- Mobile Bottom Nav -->
    <MobileNav v-if="user" />
  </div>
</template>

<script setup>
import MobileNav from '@/components/MobileNav.vue'
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { runAutoSync } from '@/composables/useWithingsAutoSync'
import {
  LayoutDashboard, Dumbbell, Utensils, Moon,
  LogOut, Plane, Shirt, ClipboardList
} from 'lucide-vue-next'

const router = useRouter()
const { user, logout } = useAuth()

const navLinks = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard, color: 'var(--accent)' },
  { to: '/musculation', label: 'Musculation', icon: Dumbbell,         color: 'var(--module-muscu)' },
  { to: '/nutrition',   label: 'Nutrition',   icon: Utensils,         color: 'var(--module-nutri)' },
  { to: '/sommeil',     label: 'Sommeil',     icon: Moon,             color: 'var(--module-sleep)' },
  { to: '/travel',      label: 'Travel',      icon: Plane,            color: 'var(--module-travel)' },
  { to: '/dressing',    label: 'Dressing',    icon: Shirt,            color: 'var(--module-dress)' },
  { to: '/plan',        label: 'Plan',        icon: ClipboardList,    color: 'var(--accent)' },
]

onMounted(() => {
  if (user.value?.id) {
    runAutoSync(user.value.id)
  } else {
    const stop = watch(user, (u) => {
      if (u?.id) { runAutoSync(u.id); stop() }
    })
  }
})

const handleLogout = async () => {
  try {
    await logout()
    router.push('/login')
  } catch (e) {
    console.error(e.message)
  }
}
</script>

<style scoped>
/* ── Shell ── */
.app-shell {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg-base);
  color: var(--text-primary);
}

/* ── Sidebar ── */
.sidebar {
  display: none;
  flex-direction: column;
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-raised);
  border-right: 1px solid var(--border-subtle);
}

@media (min-width: 768px) {
  .sidebar { display: flex; }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 28px 24px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar-logo-img {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  object-fit: contain;
}

.sidebar-logo-name {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--text-muted);
  text-decoration: none;
  transition:
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
  white-space: nowrap;
}

.sidebar-link:hover {
  color: var(--text-secondary);
  background: var(--bg-subtle);
}

.sidebar-link.router-link-active {
  color: var(--module-color, var(--accent));
  background: color-mix(in srgb, var(--module-color, var(--accent)) 8%, transparent);
}

.sidebar-link-icon {
  flex-shrink: 0;
  transition: color var(--dur-fast) var(--ease-out);
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid var(--border-subtle);
}

.sidebar-logout {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-disabled);
  transition:
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.sidebar-logout:hover {
  color: var(--status-error);
  background: var(--status-error-dim);
}

/* ── Main ── */
.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Mobile Header ── */
.mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--bg-base) 80%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
  z-index: var(--z-raised);
}

@media (min-width: 768px) {
  .mobile-header { display: none; }
}

.mobile-header-logo {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.mobile-header-logout {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 8px;
  border-radius: var(--radius-sm);
  transition: color var(--dur-fast) var(--ease-out);
  display: flex;
  align-items: center;
}

.mobile-header-logout:hover {
  color: var(--status-error);
}

/* ── Content ── */
.app-content {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px 16px calc(100px + env(safe-area-inset-bottom, 16px));
}

@media (min-width: 768px) {
  .app-content {
    padding: 40px;
  }
}

/* ── Page transition ── */
.page-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.page-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-in),
    transform var(--dur-fast) var(--ease-in);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
