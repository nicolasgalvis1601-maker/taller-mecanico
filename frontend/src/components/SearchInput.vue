<script setup>
const model = defineModel({ type: String, default: '' })

defineProps({
  placeholder: { type: String, default: 'Buscar…' },
  debounce: { type: [Number, String], default: 0 },
  maxWidth: { type: String, default: '360px' },
})
</script>

<template>
  <q-input
    v-model="model"
    dense
    outlined
    clearable
    :debounce="debounce"
    :placeholder="placeholder"
    :style="{ width: '100%', maxWidth }"
  >
    <template #prepend><q-icon name="search" /></template>
  </q-input>
</template>
