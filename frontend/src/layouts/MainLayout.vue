<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '../stores/app.js'
import { useOrderStore } from '../stores/orders.js'
import api, { API_URL } from '../services/api.js'

const appStore = useAppStore()
const orderStore = useOrderStore()

const menu = [
  { to: '/inicio', icon: 'dashboard', label: 'Inicio' },
  { to: '/ordenes', icon: 'assignment', label: 'Órdenes', badge: true },
  { to: '/clientes', icon: 'people', label: 'Clientes' },
  { to: '/vehiculos', icon: 'directions_car', label: 'Vehículos' },
  { to: '/mecanicos', icon: 'engineering', label: 'Mecánicos' },
  { to: '/servicios', icon: 'handyman', label: 'Servicios' },
  { to: '/repuestos', icon: 'inventory_2', label: 'Repuestos' },
]

// Estado de la conexión con el backend (GET /api/health)
const apiOnline = ref(null)
async function checkApi() {
  try {
    await api.get('/health')
    apiOnline.value = true
  } catch {
    apiOnline.value = false
  }
}

onMounted(() => {
  checkApi()
  orderStore.fetchActiveOrders().catch(() => {})
})
</script>

<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menú" @click="appStore.toggleDrawer" />
        <q-toolbar-title class="row items-center no-wrap">
          <q-icon name="car_repair" size="28px" class="q-mr-sm text-accent" />
          <span class="text-weight-bold">Taller Mecánico Pro</span>
          <span class="text-caption q-ml-sm gt-xs text-blue-grey-2">Gestión integral del taller</span>
        </q-toolbar-title>

        <q-chip
          v-if="apiOnline !== null"
          clickable
          dense
          :color="apiOnline ? 'positive' : 'negative'"
          text-color="white"
          :icon="apiOnline ? 'cloud_done' : 'cloud_off'"
          @click="checkApi"
        >
          <span class="gt-xs">{{ apiOnline ? 'API en línea' : 'API sin conexión' }}</span>
          <q-tooltip>{{ API_URL }} — clic para comprobar</q-tooltip>
        </q-chip>

        <q-btn
          flat
          round
          dense
          :icon="appStore.darkMode ? 'light_mode' : 'dark_mode'"
          @click="appStore.toggleDarkMode"
        >
          <q-tooltip>{{ appStore.darkMode ? 'Modo claro' : 'Modo oscuro' }}</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="appStore.leftDrawerOpen" show-if-above bordered :width="240">
      <q-list padding>
        <q-item-label header class="text-uppercase text-caption text-weight-bold">Menú</q-item-label>
        <q-item
          v-for="item in menu"
          :key="item.to"
          :to="item.to"
          clickable
          v-ripple
          active-class="text-accent text-weight-bold bg-blue-grey-1"
        >
          <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
          <q-item-section v-if="item.badge && orderStore.activeCount" side>
            <q-badge color="accent" :label="orderStore.activeCount">
              <q-tooltip>Órdenes activas en el taller</q-tooltip>
            </q-badge>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.body--dark .bg-blue-grey-1 {
  background: rgba(255, 255, 255, 0.06) !important;
}
</style>
