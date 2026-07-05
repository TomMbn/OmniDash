import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/supabase'
import Dashboard from '@/views/Dashboard.vue'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/LoginView.vue')
    },
    {
        path: '/',
        name: 'Dashboard',
        component: Dashboard,
        meta: { requiresAuth: true }
    },
    {
        path: '/musculation',
        name: 'Musculation',
        component: () => import('@/views/WorkoutView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/nutrition',
        name: 'Nutrition',
        component: () => import('@/views/NutritionView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/sommeil',
        name: 'Sommeil',
        component: () => import('@/views/SleepView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/travel',
        name: 'TravelPlanner',
        component: () => import('@/views/TravelPlanner.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/dressing',
        name: 'DressingRoom',
        component: () => import('@/views/DressingRoom.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/plan',
        name: 'Plan',
        component: () => import('@/views/PlanView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/fenetres',
        name: 'Windows',
        component: () => import('@/views/WindowsView.vue'),
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation Guard
router.beforeEach(async (to, from, next) => {
    // Check auth state directly from Supabase to prevent navigation flashes
    const { data: { session } } = await supabase.auth.getSession()

    if (to.meta.requiresAuth && !session) {
        // If route requires auth and user is NOT logged in, redirect to login
        next({ name: 'Login' })
    } else if (to.name === 'Login' && session) {
        // If route is login and user IS logged in, redirect to dashboard
        next({ name: 'Dashboard' })
    } else {
        // Else let them pass normally
        next()
    }
})

export default router
