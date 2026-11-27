<template>
  <div class="consent">
    <span class="orb orb--a" aria-hidden="true" />
    <span class="orb orb--b" aria-hidden="true" />
    <span class="orb orb--c" aria-hidden="true" />

    <section class="consent-card">
      <div class="consent-head">
        <img src="/pwa-192x192.png" alt="" class="consent-logo" />
        <h1 class="consent-title">Demande d'accès</h1>
      </div>

      <p v-if="state === 'loading'" class="consent-text" role="status">Chargement de la demande…</p>

      <p v-else-if="state === 'redirecting'" class="consent-text" role="status">Retour vers le client…</p>

      <p v-else-if="state === 'missing'" class="message message--error" role="alert">
        Cette demande d'autorisation est absente ou a expiré. Relance la connexion depuis le client.
      </p>

      <p v-else-if="state === 'error'" class="message message--error" role="alert">{{ errorMsg }}</p>

      <template v-else>
        <dl class="details">
          <div class="detail">
            <dt class="detail-label">Client</dt>
            <dd class="detail-value">{{ request.client.name || 'Client sans nom' }}</dd>
          </div>
          <div class="detail">
            <dt class="detail-label">Adresse de retour</dt>
            <dd class="detail-value">{{ request.redirect_uri }}</dd>
          </div>
        </dl>

        <p class="consent-text">Ce client agira avec les droits que la base accorde aux connexions externes.</p>

        <div class="actions">
          <button type="button" class="button button--primary" :disabled="submitting" @click="decide(true)">
            Autoriser
          </button>
          <button type="button" class="button button--secondary" :disabled="submitting" @click="decide(false)">
            Refuser
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/supabase'
import { isSafeReturnUrl } from '@/utils/auth/redirect'

const route = useRoute()
// Lu une seule fois : la décision porte toujours sur la demande affichée.
const authorizationId = route.query.authorization_id

const state = ref('loading')
const request = ref(null)
const errorMsg = ref('')
const submitting = ref(false)

// La réponse peut arriver après un changement de page : elle ne doit alors plus rediriger.
let active = true
onUnmounted(() => { active = false })

const fail = (message) => {
  errorMsg.value = message
  state.value = 'error'
}

// 400 : demande déjà traitée. 404 : demande inconnue ou expirée.
const handleError = (error, message) => {
  if (error.status === 400 || error.status === 404) state.value = 'missing'
  else fail(message)
}

const follow = (url) => {
  if (!isSafeReturnUrl(url)) {
    fail("L'adresse de retour de ce client n'est pas valide.")
    return
  }
  state.value = 'redirecting'
  window.location.assign(url)
}

onMounted(async () => {
  // L'identifiant est inséré tel quel dans l'URL de l'API : aucun séparateur n'est accepté.
  if (typeof authorizationId !== 'string' || !/^[\w-]+$/.test(authorizationId)) {
    state.value = 'missing'
    return
  }

  const message = 'Impossible de charger la demande. Recharge la page pour réessayer.'
  try {
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
    if (!active) return
    if (error) {
      handleError(error, message)
    } else if ('authorization_id' in data) {
      request.value = data
      state.value = 'ready'
    } else {
      // Accès déjà accordé à ce client.
      follow(data.redirect_url)
    }
  } catch {
    fail(message)
  }
})

const decide = async (approve) => {
  if (submitting.value) return
  submitting.value = true

  const message = "La réponse n'a pas pu être envoyée. Relance la connexion depuis le client."
  const method = approve ? 'approveAuthorization' : 'denyAuthorization'
  try {
    // Sans cette option, la bibliothèque redirige avant toute vérification de l'adresse.
    const { data, error } = await supabase.auth.oauth[method](authorizationId, { skipBrowserRedirect: true })
    if (!active) return
    if (error) handleError(error, message)
    else follow(data.redirect_url)
  } catch {
    fail(message)
  }
}
</script>

<style scoped>
.consent {
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

.consent-card {
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

.consent-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  text-align: center;
}

.consent-logo {
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  object-fit: contain;
}

.consent-title {
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.consent-text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
}

.details {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
}

.detail-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

/* L'adresse de retour reste entière, même très longue. */
.detail-value {
  font-size: var(--text-sm);
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.message {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
}

.message--error { background: var(--status-error-dim); color: var(--status-error); }

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.button {
  min-height: 52px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.button--primary {
  border: none;
  background: var(--action);
  color: var(--on-action);
}

.button--secondary {
  border: 1px solid var(--border-subtle);
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.button:hover { opacity: 0.88; }
.button:active { transform: scale(0.98); }
.button:disabled { opacity: 0.5; cursor: not-allowed; }

@media (min-width: 768px) {
  .consent { min-height: calc(100dvh - 80px); }
  .orb--a { right: 12%; width: 320px; height: 320px; }
  .orb--b { left: 12%; width: 240px; height: 240px; }
}
</style>
