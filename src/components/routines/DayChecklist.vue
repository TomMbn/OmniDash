<template>
  <section v-for="section in sections" :key="section.id" class="rt-card" :style="toneStyle(section.tone)">
    <h3 class="rt-head">
      <span class="rt-icon" aria-hidden="true"><component :is="section.icon" :size="16" stroke-width="1.75" /></span>
      <span class="rt-title">{{ section.title }}</span>
      <span class="rt-sub">{{ section.stats.done }} sur {{ section.stats.total }}</span>
    </h3>
    <span class="rt-bar" aria-hidden="true"><span class="rt-fill" :style="{ width: `${section.stats.ratio * 100}%` }" /></span>

    <ul class="rt-list">
      <StepRow
        v-for="(item, i) in section.items"
        :key="item.id"
        :item="item"
        :checked="done.has(logKey(item.id, day))"
        :readonly="readonly"
        :can-up="i > 0"
        :can-down="i < section.items.length - 1"
        @toggle="emit('toggle', item, day, $event)"
        @edit="emit('edit', item)"
        @move="emit('move', item, section.items[i + $event])"
        @remove="emit('remove', item)"
      />
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import StepRow from '@/components/routines/StepRow.vue'
import { SECTION_LOOKS, toneStyle } from '@/components/routines/looks'
import { SECTIONS, itemsForDay, logKey, statsFor } from '@/utils/routines/routines'

const props = defineProps({
  day: { type: String, required: true },
  items: { type: Array, required: true },
  done: { type: Set, required: true },
  washDays: { type: Array, required: true },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle', 'edit', 'move', 'remove'])

const sections = computed(() => {
  const list = itemsForDay(props.items, props.day, props.washDays)
  return SECTIONS
    .map((s) => {
      const own = list.filter((item) => item.section === s.id)
      return { ...s, ...SECTION_LOOKS[s.id], items: own, stats: statsFor(own, props.done, props.day) }
    })
    .filter((s) => s.items.length)
})
</script>
