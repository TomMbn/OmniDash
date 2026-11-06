<template>
  <div class="login">
    <span class="orb orb--a" aria-hidden="true" />
    <span class="orb orb--b" aria-hidden="true" />
    <span class="orb orb--c" aria-hidden="true" />

    <section class="login-card">
      <div class="login-head">
        <img src="/pwa-192x192.png" alt="" class="login-logo" />
        <h1 class="login-title">OmniDash</h1>
        <p class="login-sub">{{ isLogin ? 'Content de te revoir.' : 'Crée ton compte.' }}</p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="field-group">
          <label class="field-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="field-input"
            placeholder="toi@email.com"
          />
        </div>

        <div class="field-group">
          <label class="field-label" for="password">Mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            :autocomplete="isLogin ? 'current-password' : 'new-password'"
            required
            minlength="6"
            class="field-input"
            placeholder="6 caractères minimum"
          />
        </div>

        <p v-if="errorMsg" class="message message--error" role="alert">{{ errorMsg }}</p>
        <p v-if="successMsg" class="message message--success" role="status">{{ successMsg }}</p>

        <button type="submit" class="submit" :disabled="loading">
          <span v-if="loading" class="spinner" />
          {{ loading ? 'Chargement…' : (isLogin ? 'Se connecter' : "S'inscrire") }}
        </button>
      </form>

      <button type="button" class="switch-mode" @click="toggleMode">
        {{ isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter' }}
      </button>
    </section>
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
      successMsg.value = 'Compte créé. Vérifie ta boîte mail si besoin.'
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

<style scoped>
.login {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100dvh - 140px);
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

.orb--a { top: 4%; right: -60px; width: 220px; height: 220px; background: var(--orb-lilas); }
.orb--b { bottom: 8%; left: -50px; width: 170px; height: 170px; background: var(--orb-rose); }
.orb--c { top: 12%; left: 8%; width: 70px; height: 70px; background: var(--orb-ciel); }

.login-card {
  position: relative;
  z-index: var(--z-raised);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: 400px;
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
  box-shadow: var(--shadow-md);
}

.login-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  text-align: center;
}

.login-logo {
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  object-fit: contain;
}

.login-title {
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.login-sub {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.field-input {
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--text-primary);
  outline: none;
}

.field-input:focus { border-color: var(--accent); }
.field-input::placeholder { color: var(--text-secondary); }

.message {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
}

.message--error   { background: var(--status-error-dim);   color: var(--status-error); }
.message--success { background: var(--status-success-dim); color: var(--status-success); }

.submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 52px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--action);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--on-action);
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.submit:hover { opacity: 0.88; }
.submit:active { transform: scale(0.98); }
.submit:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.switch-mode {
  min-height: 44px;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

@media (min-width: 768px) {
  .login { min-height: calc(100dvh - 80px); }
  .orb--a { right: 12%; width: 320px; height: 320px; }
  .orb--b { left: 12%; width: 240px; height: 240px; }
}
</style>
