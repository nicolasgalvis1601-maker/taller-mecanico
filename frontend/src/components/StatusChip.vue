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
  <q-chip
    :dense="dense"
    square
    :color="info.color"
    text-color="white"
    :icon="info.icon"
    class="text-weight-medium"
  >
    {{ info.label }}
  </q-chip>
</template>
