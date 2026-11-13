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

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
})
const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

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
      <!-- Encabezado: saludo + acciones -->
      <header class="dash-head">
        <div>
          <div class="text-eyebrow">{{ today }}</div>
          <h1 class="dash-title">{{ greeting }}, este es el panel del taller</h1>
        </div>
        <div class="dash-actions">
          <q-input
            v-model="plate"
            dense
            outlined
            bg-color="white"
            placeholder="Historial por placa"
            input-class="text-uppercase"
            class="dash-search"
            @keyup.enter="searchHistory"
          >
            <template #prepend><q-icon name="search" size="20px" /></template>
            <template #append><q-btn flat round dense icon="arrow_forward" :disable="!plate.trim()" @click="searchHistory" /></template>
          </q-input>
          <q-btn color="accent" unelevated icon="add" label="Nueva orden" :to="{ name: 'orders', query: { nueva: 1 } }" />
          <q-btn flat round dense icon="refresh" :loading="refreshing" @click="refresh"><q-tooltip>Actualizar</q-tooltip></q-btn>
        </div>
      </header>

      <!-- Indicadores -->
      <section class="row q-col-gutter-md q-mb-lg">
        <div v-for="k in kpis" :key="k.label" class="col-6 col-md-3">
          <q-card flat bordered class="kpi-card cursor-pointer" @click="router.push(k.to)">
            <q-card-section class="row items-center no-wrap q-gutter-x-md">
              <div class="kpi-icon" :style="{ background: `color-mix(in srgb, var(--q-${k.color}) 12%, transparent)`, color: `var(--q-${k.color})` }">
                <q-icon :name="k.icon" size="24px" />
              </div>
              <div class="col">
                <div class="kpi-label">{{ k.label }}</div>
                <div class="kpi-value">{{ k.value }}</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </section>

      <div class="column q-gutter-y-lg">
        <!-- Tablero -->
        <section class="col-12">
          <div class="row items-baseline q-mb-md">
            <h2 class="section-title q-ma-none">Órdenes activas</h2>
            <q-space />
            <div class="text-caption text-grey-7">
              En proceso <span class="text-weight-bold tabular" style="color: var(--tm-text)">{{ formatMoney(pendingValue) }}</span>
            </div>
          </div>

          <div class="board">
            <div v-for="col in board" :key="col.value" class="board__col">
              <div class="board__head">
                <span class="board__dot" :class="`bg-${col.color}`"></span>
                <span class="board__label ellipsis">{{ col.label }}</span>
                <q-space />
                <span class="board__count">{{ col.orders.length }}</span>
              </div>

              <div class="board__body">
                <router-link
                  v-for="o in col.orders"
                  :key="o._id"
                  :to="{ name: 'order-detail', params: { id: o._id } }"
                  class="order-card"
                >
                  <PlateTag :plate="o.vehicle?.plate" />
                  <div class="order-card__vehicle">{{ o.vehicle?.brand }} {{ o.vehicle?.model }}</div>
                  <div class="order-card__meta ellipsis"><q-icon name="engineering" size="14px" /> {{ o.mechanic?.fullName || 'Sin asignar' }}</div>
                  <div class="order-card__meta"><q-icon name="schedule" size="14px" /> {{ daysIn(o.entryDate) }}</div>
                </router-link>
                <div v-if="!col.orders.length" class="empty-state">Sin órdenes</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Stock bajo -->
        <section class="col-12">
          <div class="row items-baseline q-mb-md">
            <h2 class="section-title q-ma-none">Stock bajo</h2>
            <q-space />
            <span class="text-caption text-grey-7">≤ {{ appStore.lowStockThreshold }} uds.</span>
          </div>
          <div v-if="partStore.lowStockParts.length" class="row q-col-gutter-sm">
            <div v-for="p in partStore.lowStockParts" :key="p._id" class="col-12 col-sm-6 col-md-4 col-lg-3">
              <q-card flat bordered>
                <q-item>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ p.name }}</q-item-label>
                    <q-item-label caption>{{ p.brand || 'Sin marca' }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge rounded :color="p.stock === 0 ? 'negative' : 'warning'" :text-color="p.stock === 0 ? 'white' : 'dark'" :label="p.stock === 0 ? 'Agotado' : `${p.stock} uds.`" />
                  </q-item-section>
                </q-item>
              </q-card>
            </div>
          </div>
          <q-card v-else flat bordered>
            <div class="empty-state">
              <q-icon name="check_circle" color="positive" size="28px" class="q-mb-xs" /><br />
              Inventario en buen nivel
            </div>
          </q-card>
          <div class="q-mt-sm">
            <q-btn flat no-caps dense color="primary" label="Ir a repuestos" icon-right="arrow_forward" to="/repuestos" />
          </div>
        </section>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.dash-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px 20px;
  margin-bottom: 22px;
}
.dash-title {
  margin: 2px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  text-transform: none;
}
.text-eyebrow::first-letter { text-transform: uppercase; }
.dash-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.dash-search { width: 220px; }
.body--dark .dash-search :deep(.q-field__control) { background: var(--tm-surface); }

/* Tablero: columnas con scroll horizontal en pantallas estrechas */
.board {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(200px, 1fr);
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
  scroll-snap-type: x proximity;
}
.board__col {
  scroll-snap-align: start;
  background: color-mix(in srgb, var(--tm-border) 40%, transparent);
  border-radius: var(--tm-radius);
  padding: 10px;
  min-height: 140px;
}
.board__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 10px;
  font-size: 0.8rem;
  font-weight: 600;
}
.board__dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.board__count {
  min-width: 22px;
  padding: 0 7px;
  border-radius: 999px;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--tm-surface);
  color: var(--tm-text-muted);
  border: 1px solid var(--tm-border);
}
.board__body { display: flex; flex-direction: column; gap: 8px; }
.order-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 10px 12px;
  text-decoration: none;
  color: inherit;
  background: var(--tm-surface);
  border: 1px solid var(--tm-border);
  border-radius: 10px;
  box-shadow: var(--tm-shadow);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.order-card:hover { box-shadow: var(--tm-shadow-hover); transform: translateY(-1px); }
.order-card__vehicle { margin-top: 4px; font-size: 0.9rem; font-weight: 600; }
.order-card__meta {
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--tm-text-muted);
}
@media (max-width: 599px) {
  .dash-title { font-size: 1.25rem; }
  .dash-actions { width: 100%; }
  .dash-search { flex: 1 1 100%; width: auto; }
  .board { grid-auto-columns: 78%; }
}
</style>
