<script setup>
import { computed } from 'vue'
import { statusInfo } from '../utils/constants.js'

const props = defineProps({
  status: { type: String, required: true },
  dense: { type: Boolean, default: true },
})
const info = computed(() => statusInfo(props.status))
</script>

<template>
  <!-- Estilo "suave": fondo tenue del color del estado, mejor lectura en tablas densas -->
  <q-chip
    :dense="dense"
    :color="info.color"
    :icon="info.icon"
    class="status-chip text-weight-medium"
    :style="{ '--chip': `var(--q-${info.color}, #607d8b)` }"
  >
    {{ info.label }}
  </q-chip>
</template>

<style scoped>
.status-chip {
  background: color-mix(in srgb, var(--chip) 14%, transparent) !important;
  color: color-mix(in srgb, var(--chip) 80%, #000) !important;
  font-size: 0.75rem;
  border-radius: 999px;
}
.body--dark .status-chip {
  background: color-mix(in srgb, var(--chip) 22%, transparent) !important;
  color: color-mix(in srgb, var(--chip) 60%, #fff) !important;
}
</style>
