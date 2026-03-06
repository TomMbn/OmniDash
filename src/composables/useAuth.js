import { ref } from 'vue'
import { supabase } from '@/supabase'

const user = ref(null)

// Initialize user state
supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
        user.value = data.session.user
    }
})

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        user.value = session.user
    } else {
        user.value = null
    }
})

export function useAuth() {
    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error
        return data
    }

    const signup = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) throw error
        return data
    }

    const logout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }

    return {
        user,
        login,
        signup,
        logout,
    }
}
