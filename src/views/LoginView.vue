<template>
  <div class="h-full flex items-center justify-center -mt-8 md:mt-0 px-4">
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-indigo-600 mb-2">OmniDash</h1>
        <p class="text-sm text-gray-500">{{ isLogin ? 'Bon retour parmi nous 👋' : 'Créez votre compte 🚀' }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="email">Email</label>
          <input 
            v-model="email" 
            id="email" 
            type="email" 
            required 
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="vous@email.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Mot de passe</label>
          <input 
            v-model="password" 
            id="password" 
            type="password" 
            required 
            minlength="6"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start">
          <span class="mr-2">⚠️</span>
          {{ errorMsg }}
        </div>
        
        <div v-if="successMsg" class="p-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg flex items-start">
          <span class="mr-2">✅</span>
          {{ successMsg }}
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire") }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <button 
          @click="toggleMode" 
          type="button"
          class="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer focus:outline-none"
        >
          {{ isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { login, signup } = useAuth()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)

const toggleMode = () => {
  isLogin.value = !isLogin.value
  errorMsg.value = ''
  successMsg.value = ''
}

const handleSubmit = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true
  
  try {
    if (isLogin.value) {
      await login(email.value, password.value)
      router.push('/')
    } else {
      await signup(email.value, password.value)
      successMsg.value = 'Compte créé avec succès ! Vérifiez votre boîte mail si nécessaire.'
      setTimeout(() => {
        isLogin.value = true
        successMsg.value = ''
      }, 3000)
    }
  } catch (error) {
    if (error.message.includes('Invalid login credentials')) {
      errorMsg.value = 'Email ou mot de passe incorrect.'
    } else if (error.message.includes('User already registered')) {
      errorMsg.value = 'Cet email est déjà lié à un compte.'
    } else {
      errorMsg.value = error.message
    }
  } finally {
    loading.value = false
  }
}
</script>
