<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAppStore } from '../stores/app.js'
import { useOrderStore } from '../stores/orders.js'
import api, { API_URL } from '../services/api.js'

const $q = useQuasar()
const route = useRoute()
const appStore = useAppStore()
const orderStore = useOrderStore()

// Menú agrupado por secciones para una navegación más clara
const sections = [
  {
    label: 'Operación',
    items: [
      { to: '/inicio', icon: 'space_dashboard', label: 'Inicio' },
      { to: '/ordenes', icon: 'assignment', label: 'Órdenes', badge: true },
    ],
  },
  {
    label: 'Clientes y flota',
    items: [
      { to: '/clientes', icon: 'people', label: 'Clientes' },
      { to: '/vehiculos', icon: 'directions_car', label: 'Vehículos' },
    ],
  },
  {
    label: 'Taller',
    items: [
      { to: '/mecanicos', icon: 'engineering', label: 'Mecánicos' },
      { to: '/servicios', icon: 'handyman', label: 'Servicios' },
      { to: '/repuestos', icon: 'inventory_2', label: 'Repuestos' },
    ],
  },
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

// En móvil/tablet el menú es superpuesto: arranca cerrado y se cierra al navegar
watch(() => route.fullPath, () => { if ($q.screen.lt.md) appStore.leftDrawerOpen = false })

onMounted(() => {
  if ($q.screen.lt.md) appStore.leftDrawerOpen = false
  checkApi()
  orderStore.fetchActiveOrders().catch(() => {})
})
</script>

<template>
  <q-layout view="hHh LpR lFf">
    <!-- Barra superior: limpia, con el título de la sección actual -->
    <q-header class="app-header" :class="appStore.darkMode ? 'bg-dark text-white' : 'bg-white text-dark'">
      <q-toolbar class="app-toolbar">
        <q-btn flat dense round icon="menu" aria-label="Menú" @click="appStore.toggleDrawer" />
        <!-- En móvil/tablet el menú está oculto: se muestra la marca. En escritorio, cada página trae su propio título -->
        <q-toolbar-title class="app-toolbar__title lt-md">Taller Mecánico Pro</q-toolbar-title>
        <q-space class="gt-sm" />

        <q-chip
          v-if="apiOnline !== null"
          clickable
          dense
          outline
          :color="apiOnline ? 'positive' : 'negative'"
          :icon="apiOnline ? 'cloud_done' : 'cloud_off'"
          @click="checkApi"
        >
          <span class="gt-xs">{{ apiOnline ? 'API en línea' : 'API sin conexión' }}</span>
          <q-tooltip>{{ API_URL }} — clic para comprobar</q-tooltip>
        </q-chip>

        <q-btn flat round dense :icon="appStore.darkMode ? 'light_mode' : 'dark_mode'" @click="appStore.toggleDarkMode">
          <q-tooltip>{{ appStore.darkMode ? 'Modo claro' : 'Modo oscuro' }}</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Menú lateral: fijo en escritorio, superpuesto en tablet/móvil -->
    <q-drawer v-model="appStore.leftDrawerOpen" show-if-above :width="256" :breakpoint="1024" class="app-drawer">
      <div class="app-brand">
        <div class="app-brand__logo"><q-icon name="car_repair" size="22px" /></div>
        <div>
          <div class="app-brand__name">Taller Mecánico</div>
          <div class="app-brand__tag">PRO · Gestión del taller</div>
        </div>
      </div>

      <q-scroll-area class="app-drawer__scroll">
        <q-list class="q-px-sm q-pb-md">
          <template v-for="section in sections" :key="section.label">
            <q-item-label header class="app-nav__header">{{ section.label }}</q-item-label>
            <q-item
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              clickable
              v-ripple
              class="app-nav__item"
              active-class="app-nav__item--active"
            >
              <q-item-section avatar><q-icon :name="item.icon" size="20px" /></q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
              <q-item-section v-if="item.badge && orderStore.activeCount" side>
                <q-badge color="accent" rounded :label="orderStore.activeCount">
                  <q-tooltip>Órdenes activas en el taller</q-tooltip>
                </q-badge>
              </q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style>
/* ----- Header ----- */
.app-header {
  border-bottom: 1px solid var(--tm-border);
  box-shadow: none;
}
.app-toolbar {
  min-height: 60px;
  gap: 4px;
  padding-inline: 12px;
}
.app-toolbar__title {
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

/* ----- Drawer (siempre oscuro, estilo "panel de taller") ----- */
.app-drawer,
.app-drawer .q-drawer {
  background: #14283f !important;
  color: #cbd5e1;
  border-right: none;
}
.app-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 14px;
}
.app-brand__logo {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--q-accent);
  color: #fff;
  box-shadow: 0 4px 10px rgba(245, 124, 0, 0.35);
}
.app-brand__name {
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.app-brand__tag {
  font-size: 0.66rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #8ea3bd;
  text-transform: uppercase;
}
.app-drawer__scroll {
  height: calc(100% - 71px);
}
.app-nav__header {
  padding: 18px 12px 6px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6f86a3;
}
.app-nav__item {
  min-height: 42px;
  margin-bottom: 2px;
  border-radius: 10px;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.12s ease;
}
.app-nav__item .q-item__section--avatar {
  min-width: 36px;
  color: #8ea3bd;
}
.app-nav__item:hover {
  background: rgba(255, 255, 255, 0.07);
}
.app-nav__item--active {
  background: rgba(245, 124, 0, 0.16);
  color: #fff;
  font-weight: 600;
}
.app-nav__item--active .q-item__section--avatar {
  color: var(--q-accent);
}
</style>
