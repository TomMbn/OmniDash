<template>
  <span
    class="service-logo"
    :class="{ 'service-logo--light': logo.light }"
    :style="boxStyle"
    aria-hidden="true"
  >
    <svg v-if="logo.type === 'svg'" viewBox="0 0 24 24" :width="iconSize" :height="iconSize">
      <path :d="logo.path" :fill="logo.fill" />
    </svg>
    <span v-else class="service-letter" :style="{ fontSize: `${letterSize}px` }">{{ logo.letter }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { logoFor } from '@/utils/finance/logos'

const props = defineProps({
  name: { type: String, default: '' },
  pattern: { type: String, default: '' },
  size: { type: Number, default: 36 }
})

const logo = computed(() => logoFor(props.name, props.pattern))

const iconSize = computed(() => Math.round(props.size * 0.58))
// Initiale lisible même sur une pastille de 20 px
const letterSize = computed(() => Math.max(12, Math.round(props.size * 0.46)))

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: `${Math.round(props.size * 0.28)}px`,
  background: logo.value.type === 'svg' ? logo.value.color : logo.value.background,
  color: logo.value.type === 'svg' ? undefined : logo.value.color
}))
</script>

<style scoped>
.service-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

/* Marque presque blanche : un liseré la détache de la carte */
.service-logo--light { box-shadow: inset 0 0 0 1px var(--border-default); }

.service-letter {
  font-family: var(--font-sans);
  font-weight: 700;
  line-height: 1;
}
</style>
