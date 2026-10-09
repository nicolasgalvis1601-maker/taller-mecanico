<script setup>
import { watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAppStore } from './stores/app.js'

const $q = useQuasar()
const appStore = useAppStore()

// El modo oscuro se guarda en Pinia (persistido) y se aplica a Quasar
watch(
  () => appStore.darkMode,
  (value) => $q.dark.set(value),
  { immediate: true }
)
</script>

<template>
  <router-view />
</template>
