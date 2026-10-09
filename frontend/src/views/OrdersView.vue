<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '../stores/orders.js'
import PageHeader from '../components/PageHeader.vue'
import StatusChip from '../components/StatusChip.vue'
import PlateTag from '../components/PlateTag.vue'
import OrderFormDialog from '../components/OrderFormDialog.vue'
import { ORDER_STATUSES } from '../utils/constants.js'
import { formatMoney, formatDateTime, shortId } from '../utils/format.js'
import { notifyError } from '../utils/notify.js'

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
        flat
        bordered
        @row-click="openDetail"
      >
        <template #top>
          <div class="row q-col-gutter-md full-width items-center">
            <div class="col-12 col-sm-6 col-md-4">
              <q-input v-model="filter" dense outlined clearable placeholder="Buscar placa, cliente, mecánico…">
                <template #prepend><q-icon name="search" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6 col-md-4">
              <q-select
                :model-value="orderStore.statusFilter"
                :options="ORDER_STATUSES"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                dense
                outlined
                clearable
                label="Filtrar por estado"
                @update:model-value="onStatusChange"
              />
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
          <q-td :props="props" class="text-weight-bold">{{ props.value }}</q-td>
        </template>
      </q-table>
    </div>

    <OrderFormDialog v-model="showCreate" :preset-plate="presetPlate" @created="onCreated" />
  </q-page>
</template>