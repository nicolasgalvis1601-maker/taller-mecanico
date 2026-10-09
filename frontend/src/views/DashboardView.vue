<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '../stores/orders.js'
import { useClientStore } from '../stores/clients.js'
import { useVehicleStore } from '../stores/vehicles.js'
import { usePartStore } from '../stores/parts.js'
import { useAppStore } from '../stores/app.js'
import PlateTag from '../components/PlateTag.vue'
import { ORDER_STATUSES, ACTIVE_STATUSES } from '../utils/constants.js'
import { formatMoney } from '../utils/format.js'
import { notifyError } from '../utils/notify.js'

const router = useRouter()
const orderStore = useOrderStore()
const clientStore = useClientStore()
const vehicleStore = useVehicleStore()
const partStore = usePartStore()
const appStore = useAppStore()

const refreshing = ref(false)
const plate = ref('')

async function refresh() {
  refreshing.value = true
  const results = await Promise.allSettled([
    orderStore.fetchActiveOrders(),
    clientStore.fetchClients(),
    vehicleStore.fetchVehicles(),
    partStore.fetchLowStock(appStore.lowStockThreshold),
  ])
  const failed = results.find((r) => r.status === 'rejected')
  if (failed) notifyError(failed.reason)
  refreshing.value = false
}

const kpis = computed(() => [
  { label: 'Vehículos en el taller', value: orderStore.activeOrders.length, icon: 'garage', color: 'accent', to: '/ordenes' },
  { label: 'Clientes', value: clientStore.clients.length, icon: 'people', color: 'primary', to: '/clientes' },
  { label: 'Vehículos registrados', value: vehicleStore.vehicles.length, icon: 'directions_car', color: 'secondary', to: '/vehiculos' },
  { label: 'Repuestos con stock bajo', value: partStore.lowStockParts.length, icon: 'warning', color: 'negative', to: '/repuestos' },
])

// Tablero tipo kanban con las órdenes activas agrupadas por estado
const board = computed(() =>
  ORDER_STATUSES.filter((s) => ACTIVE_STATUSES.includes(s.value)).map((s) => ({
    ...s,
    orders: orderStore.activeOrders.filter((o) => o.status === s.value),
  }))
)

const pendingValue = computed(() => orderStore.activeOrders.reduce((acc, o) => acc + (o.total || 0), 0))

const daysIn = (date) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  return days === 0 ? 'hoy' : days === 1 ? '1 día' : `${days} días`
}

function searchHistory() {
  const p = plate.value.trim().toUpperCase()
  if (p) router.push({ name: 'vehicle-history', params: { plate: p } })
}

onMounted(refresh)
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <div class="row items-center q-col-gutter-md q-mb-lg">
        <div class="col-12 col-md">
          <div class="text-h5 text-weight-bold">Panel del taller</div>
          <div class="text-grey-7">Resumen en tiempo real de lo que está pasando en el taller</div>
        </div>
        <div class="col-12 col-md-auto row q-gutter-sm items-center">
          <q-input v-model="plate" dense outlined placeholder="Buscar historial por placa" input-class="text-uppercase" style="width: 240px" @keyup.enter="searchHistory">
            <template #append><q-btn flat round dense icon="manage_search" @click="searchHistory" /></template>
          </q-input>
          <q-btn color="accent" unelevated icon="add" label="Nueva orden" :to="{ name: 'orders', query: { nueva: 1 } }" />
          <q-btn flat round icon="refresh" :loading="refreshing" @click="refresh"><q-tooltip>Actualizar</q-tooltip></q-btn>
        </div>
      </div>

      <!-- Indicadores -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div v-for="k in kpis" :key="k.label" class="col-6 col-md-3">
          <q-card flat bordered class="kpi-card cursor-pointer" :style="{ borderLeftColor: `var(--q-${k.color})` }" @click="router.push(k.to)">
            <q-card-section class="row items-center no-wrap">
              <div class="col">
                <div class="text-caption text-grey-7">{{ k.label }}</div>
                <div class="kpi-value">{{ k.value }}</div>
              </div>
              <q-icon :name="k.icon" size="36px" :color="k.color" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Tablero -->
        <div class="col-12 col-lg-9">
          <div class="row items-center q-mb-sm">
            <div class="text-h6">Tablero de órdenes activas</div>
            <q-space />
            <div class="text-caption text-grey-7">En proceso: <b>{{ formatMoney(pendingValue) }}</b></div>
          </div>
          <div class="row q-col-gutter-sm">
            <div v-for="col in board" :key="col.value" class="col-12 col-sm-6 col-md">
              <q-card flat bordered class="full-height">
                <q-card-section class="q-py-sm row items-center no-wrap" :class="`bg-${col.color} text-white`">
                  <q-icon :name="col.icon" class="q-mr-xs" />
                  <div class="text-caption text-weight-bold ellipsis">{{ col.label }}</div>
                  <q-space />
                  <q-badge color="white" text-color="dark" :label="col.orders.length" />
                </q-card-section>
                <q-list separator dense>
                  <q-item
                    v-for="o in col.orders"
                    :key="o._id"
                    clickable
                    :to="{ name: 'order-detail', params: { id: o._id } }"
                    class="q-py-sm"
                  >
                    <q-item-section>
                      <div><PlateTag :plate="o.vehicle?.plate" /></div>
                      <q-item-label class="q-mt-xs">{{ o.vehicle?.brand }} {{ o.vehicle?.model }}</q-item-label>
                      <q-item-label caption lines="1">{{ o.mechanic?.fullName }}</q-item-label>
                      <q-item-label caption><q-icon name="schedule" /> {{ daysIn(o.entryDate) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-if="!col.orders.length">
                    <q-item-section class="text-caption text-grey-6 text-center">Sin órdenes</q-item-section>
                  </q-item>
                </q-list>
              </q-card>
            </div>
          </div>
        </div>

        <!-- Stock bajo -->
        <div class="col-12 col-lg-3">
          <div class="text-h6 q-mb-sm">Stock bajo (≤ {{ appStore.lowStockThreshold }})</div>
          <q-card flat bordered>
            <q-list separator>
              <q-item v-for="p in partStore.lowStockParts" :key="p._id">
                <q-item-section>
                  <q-item-label>{{ p.name }}</q-item-label>
                  <q-item-label caption>{{ p.brand || 'Sin marca' }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="p.stock === 0 ? 'negative' : 'warning'" :text-color="p.stock === 0 ? 'white' : 'dark'" :label="p.stock" />
                </q-item-section>
              </q-item>
              <q-item v-if="!partStore.lowStockParts.length">
                <q-item-section class="text-grey-7 text-center">
                  <q-icon name="check_circle" color="positive" size="28px" class="q-mx-auto" />
                  Inventario en buen nivel
                </q-item-section>
              </q-item>
            </q-list>
            <q-card-actions>
              <q-btn flat color="primary" label="Ir a repuestos" icon-right="arrow_forward" to="/repuestos" />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>
