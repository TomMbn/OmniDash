<template>
  <div class="app-shell" :class="{ 'app-shell--auth': user }">

    <!-- ── Rail desktop ── -->
    <aside v-if="user" class="rail">
      <router-link to="/" class="rail-logo" aria-label="OmniDash, aujourd'hui">O</router-link>

      <nav class="rail-nav" aria-label="Navigation principale">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="rail-link"
          :aria-label="link.label"
        >
          <component :is="link.icon" :size="22" stroke-width="1.75" />
          <span class="rail-tip" aria-hidden="true">{{ link.label }}</span>
        </router-link>
      </nav>

      <button @click="handleLogout" class="rail-link rail-logout" aria-label="Déconnexion">
        <LogOut :size="20" stroke-width="1.75" />
        <span class="rail-tip" aria-hidden="true">Déconnexion</span>
      </button>
    </aside>

    <!-- ── Main ── -->
    <main class="app-main">

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
  LogOut, Plane, Shirt, ClipboardList, Wind
} from 'lucide-vue-next'

const router = useRouter()
const { user, logout } = useAuth()

const navLinks = [
  { to: '/',            label: "Aujourd'hui", icon: LayoutDashboard },
  { to: '/plan',        label: 'Plan',        icon: ClipboardList },
  { to: '/musculation', label: 'Musculation', icon: Dumbbell },
  { to: '/nutrition',   label: 'Nutrition',   icon: Utensils },
  { to: '/sommeil',     label: 'Sommeil',     icon: Moon },
  { to: '/travel',      label: 'Travel',      icon: Plane },
  { to: '/dressing',    label: 'Dressing',    icon: Shirt },
  { to: '/fenetres',    label: 'Fenêtres',    icon: Wind },
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

/* ── Rail ── */
.rail {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  width: 72px;
  flex-shrink: 0;
  padding: 18px 0;
  background: var(--rail);
  border-radius: 36px;
  position: relative;
  z-index: var(--z-nav);
}

.rail-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(120deg, #CFC3FA 0%, #F6B6D6 60%, #A9D6FA 100%);
  color: #15151A;
  font-size: var(--text-lg);
  font-weight: 600;
  text-decoration: none;
}

.rail-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding-top: var(--space-2);
}

.rail-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  color: var(--on-rail-dim);
  cursor: pointer;
  text-decoration: none;
  transition:
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.rail-link:hover { color: var(--on-rail); }
.rail-link:active { transform: scale(0.94); }

.rail-link.router-link-active {
  background: var(--on-rail);
  color: var(--on-rail-active);
}

.rail-logout { width: 44px; height: 44px; }
.rail-logout:hover { color: var(--on-rail); }

.rail-link:focus-visible,
.rail-logo:focus-visible {
  outline-color: var(--on-rail);
}

.rail-tip {
  position: absolute;
  left: calc(100% + 18px);
  top: 50%;
  padding: 6px 12px;
  background: var(--rail);
  border-radius: var(--radius-pill);
  color: var(--on-rail);
  font-size: var(--text-xs);
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate(-4px, -50%);
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.rail-link:hover .rail-tip,
.rail-link:focus-visible .rail-tip {
  opacity: 1;
  transform: translate(0, -50%);
}

/* ── Main ── */
.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Content ── */
.app-content {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: calc(var(--space-4) + env(safe-area-inset-top, 0px)) var(--space-4) calc(100px + env(safe-area-inset-bottom, 16px));
}

/* ── Desktop ── */
@media (min-width: 768px) {
  .app-shell--auth {
    gap: var(--space-5);
    padding: var(--space-5);
  }

  .rail { display: flex; }

  .app-content {
    padding: 0;
    border-radius: var(--radius-lg);
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
