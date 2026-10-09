import { ref } from 'vue'
import { defineStore } from 'pinia'

// Preferencias de la interfaz: se guardan en localStorage (persist: true)
export const useAppStore = defineStore(
  'app',
  () => {
    const darkMode = ref(false)
    const leftDrawerOpen = ref(true)
    const lowStockThreshold = ref(5)

    function toggleDarkMode() {
      darkMode.value = !darkMode.value
    }
    function toggleDrawer() {
      leftDrawerOpen.value = !leftDrawerOpen.value
    }

    return { darkMode, leftDrawerOpen, lowStockThreshold, toggleDarkMode, toggleDrawer }
  },
  { persist: true }
)
