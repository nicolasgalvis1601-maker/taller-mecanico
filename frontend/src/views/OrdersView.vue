<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useOrderStore } from '../stores/orders.js'
import PageHeader from '../components/PageHeader.vue'
import StatusChip from '../components/StatusChip.vue'
import PlateTag from '../components/PlateTag.vue'
import OrderFormDialog from '../components/OrderFormDialog.vue'
import { ORDER_STATUSES } from '../utils/constants.js'
import { formatMoney, formatDateTime, shortId } from '../utils/format.js'
import { notifyError } from '../utils/notify.js'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()

const filter = ref('')
const showCreate = ref(false)
const presetPlate = ref('')
const pagination = ref({ sortBy: 'entryDate', descending: true, rowsPerPage: 10 })

const columns = [
  { name: 'id', label: 'Orden', field: '_id', align: 'left', format: shortId },
  { name: 'entryDate', label: 'Ingreso', field: 'entryDate', align: 'left', sortable: true, format: formatDateTime },
  { name: 'plate', label: 'Placa', field: (r) => r.vehicle?.plate || '', align: 'left', sortable: true },
  { name: 'brand', label: 'Marca', field: (r) => r.vehicle?.brand || '—', align: 'left', sortable: true },
  { name: 'model', label: 'Modelo', field: (r) => r.vehicle?.model || '—', align: 'left', sortable: true },
  { name: 'owner', label: 'Propietario', field: (r) => r.vehicle?.clientId?.fullName || '—', align: 'left', sortable: true },
  { name: 'mechanic', label: 'Mecánico', field: (r) => r.mechanic?.fullName || '—', align: 'left', sortable: true },
  { name: 'status', label: 'Estado', field: 'status', align: 'center', sortable: true },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true, format: formatMoney },
]

// GET /api/orders?status=...  (el filtro queda guardado en Pinia)
function onStatusChange(value) {
  orderStore.statusFilter = value
  orderStore.fetchOrders(value).catch(notifyError)
}

function openDetail(_evt, row) {
  router.push({ name: 'order-detail', params: { id: row._id } })
}

function onCreated(order) {
  router.push({ name: 'order-detail', params: { id: order._id } })
}

onMounted(() => {
  orderStore.fetchOrders().catch(notifyError)
  // Permite abrir el formulario desde otras pantallas: /ordenes?nueva=1&placa=ABC123
  if (route.query.nueva) {
    presetPlate.value = route.query.placa || ''
    showCreate.value = true
    router.replace({ query: {} })
  }
})
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <PageHeader title="Órdenes de reparación" subtitle="Ingresos al taller, estado y facturación" icon="assignment">
        <template #actions>
          <q-btn color="accent" icon="add" label="Nueva orden" unelevated @click="presetPlate = ''; showCreate = true" />
        </template>
      </PageHeader>

      <q-table
        class="table-clickable"
        :rows="orderStore.orders"
        :columns="columns"
        row-key="_id"
        :filter="filter"
        :loading="orderStore.loading"
        :rows-per-page-options="[10, 25, 50, 0]"
        v-model:pagination="pagination"
        no-data-label="No hay órdenes para mostrar"
        :grid="$q.screen.lt.sm"
        flat
        bordered
        @row-click="openDetail"
      >
        <template #top>
          <div class="orders-toolbar">
            <q-input v-model="filter" dense outlined clearable placeholder="Buscar placa, cliente, mecánico…" class="orders-toolbar__search">
              <template #prepend><q-icon name="search" /></template>
            </q-input>

            <!-- Filtro rápido por estado (reemplaza el select, un clic en vez de dos) -->
            <div class="orders-toolbar__chips">
              <q-chip
                clickable
                :outline="!!orderStore.statusFilter"
                color="primary"
                text-color="white"
                :class="{ 'chip-off': !!orderStore.statusFilter }"
                @click="onStatusChange(null)"
              >Todas</q-chip>
              <q-chip
                v-for="s in ORDER_STATUSES"
                :key="s.value"
                clickable
                :outline="orderStore.statusFilter !== s.value"
                :color="s.color"
                :text-color="orderStore.statusFilter === s.value ? 'white' : undefined"
                :icon="s.icon"
                @click="onStatusChange(orderStore.statusFilter === s.value ? null : s.value)"
              >{{ s.label }}</q-chip>
            </div>
          </div>
        </template>

        <template #body-cell-id="props">
          <q-td :props="props" class="text-mono text-weight-bold">{{ props.value }}</q-td>
        </template>
        <template #body-cell-plate="props">
          <q-td :props="props"><PlateTag :plate="props.value" /></q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props"><StatusChip :status="props.value" /></q-td>
        </template>
        <template #body-cell-total="props">
          <q-td :props="props" class="text-weight-bold tabular">{{ props.value }}</q-td>
        </template>

        <!-- Vista móvil: una tarjeta por orden -->
        <template #item="props">
          <div class="col-12 q-pa-xs">
            <q-card flat bordered class="cursor-pointer" @click="openDetail(null, props.row)">
              <q-card-section class="q-pb-sm">
                <div class="row items-center no-wrap">
                  <PlateTag :plate="props.row.vehicle?.plate" />
                  <span class="text-mono text-caption text-grey-7 q-ml-sm">{{ shortId(props.row._id) }}</span>
                  <q-space />
                  <StatusChip :status="props.row.status" />
                </div>
                <div class="text-subtitle1 text-weight-semibold q-mt-sm">
                  {{ props.row.vehicle?.brand }} {{ props.row.vehicle?.model }}
                </div>
                <div class="text-body2 text-grey-7">{{ props.row.vehicle?.clientId?.fullName || '—' }}</div>
              </q-card-section>
              <q-separator />
              <q-card-section class="row items-center q-py-sm text-caption text-grey-7">
                <q-icon name="engineering" size="16px" class="q-mr-xs" />{{ props.row.mechanic?.fullName || '—' }}
                <q-space />
                <span class="text-weight-bold tabular" style="color: var(--tm-text)">{{ formatMoney(props.row.total) }}</span>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>
    </div>

    <OrderFormDialog v-model="showCreate" :preset-plate="presetPlate" @created="onCreated" />
  </q-page>
</template>

<style scoped>
.orders-toolbar {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.orders-toolbar__search { max-width: 420px; }
.orders-toolbar__chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.orders-toolbar__chips :deep(.q-chip) { margin: 0; flex: none; }
.chip-off { opacity: 0.6; }
@media (max-width: 599px) {
  .orders-toolbar__search { max-width: none; }
}
</style>
