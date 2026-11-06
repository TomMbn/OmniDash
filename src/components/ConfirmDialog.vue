<template>
  <dialog
    ref="dialog"
    class="confirm"
    aria-labelledby="confirm-title"
    @cancel.prevent="answerConfirm(false)"
    @click.self="answerConfirm(false)"
  >
    <div v-if="request" class="confirm-panel">
      <h2 id="confirm-title" class="confirm-title">{{ request.title }}</h2>
      <p v-if="request.detail" class="confirm-detail">{{ request.detail }}</p>
      <div class="confirm-actions">
        <button ref="cancelButton" class="confirm-btn" @click="answerConfirm(false)">Annuler</button>
        <button class="confirm-btn confirm-btn--danger" @click="answerConfirm(true)">{{ request.confirmLabel }}</button>
      </div>
    </div>
  </dialog>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useConfirm } from '@/composables/useConfirm'

const { request, answerConfirm } = useConfirm()
const dialog = ref(null)
const cancelButton = ref(null)

watch(request, async (current) => {
  if (!current) {
    dialog.value?.close()
    return
  }
  if (!dialog.value.open) dialog.value.showModal()
  await nextTick()
  cancelButton.value?.focus()
})
</script>

<style scoped>
.confirm {
  width: 100%;
  max-width: 100%;
  margin: auto 0 0;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-primary);
}

.confirm::backdrop { background: var(--scrim); }

.confirm-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--bg-base);
  box-shadow: var(--shadow-lg);
}

.confirm-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.confirm-detail {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.confirm-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.confirm-btn {
  min-height: 48px;
  padding: 0 var(--space-4);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.confirm-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.confirm-btn--danger {
  background: var(--status-error);
  color: var(--bg-base);
}

@media (min-width: 768px) {
  .confirm {
    max-width: 420px;
    margin: auto;
    background: none;
  }

  .confirm-panel {
    padding: var(--space-6);
    border-radius: var(--radius-lg);
  }
}
</style>
