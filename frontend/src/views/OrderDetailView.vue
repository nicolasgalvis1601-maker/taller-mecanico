<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useOrderStore } from '../stores/orders.js'
import { useMechanicStore } from '../stores/mechanics.js'
import { useServiceStore } from '../stores/services.js'
import { usePartStore } from '../stores/parts.js'
import StatusChip from '../components/StatusChip.vue'
import PlateTag from '../components/PlateTag.vue'
import { ORDER_STATUSES, CLOSED_STATUSES, statusInfo } from '../utils/constants.js'
import { formatMoney, formatDateTime, shortId } from '../utils/format.js'
import { notifySuccess, notifyError } from '../utils/notify.js'
import { required } from '../utils/rules.js'

const props = defineProps({ id: { type: String, required: true } })

const $q = useQuasar()
const orderStore = useOrderStore()
const mechanicStore = useMechanicStore()
const serviceStore = useServiceStore()
const partStore = usePartStore()

const loading = ref(true)
const notFound = ref(false)

const order = computed(() => (orderStore.currentOrder?._id === props.id ? orderStore.currentOrder : null))
const isDelivered = computed(() => order.value?.status === 'ENTREGADO')
const isClosed = computed(() => CLOSED_STATUSES.includes(order.value?.status))

async function load() {
  loading.value = true
  notFound.value = false
  try {
    await orderStore.fetchOrder(props.id)
    fillGeneralForm()
  } catch (error) {
    notFound.value = true
    notifyError(error)
  } finally {
    loading.value = false
  }
  Promise.all([mechanicStore.fetchMechanics(), serviceStore.fetchServices(), partStore.fetchParts()]).catch(() => {})
}
watch(() => props.id, load, { immediate: true })

// ---------- Flujo de estados ----------
const currentIndex = computed(() => ORDER_STATUSES.findIndex((s) => s.value === order.value?.status))
const nextStatus = computed(() => ORDER_STATUSES[currentIndex.value + 1] || null)

const statusOptions = computed(() =>
  ORDER_STATUSES.filter((s) => s.value !== order.value?.status).map((s) => ({
    ...s,
    disable: s.value === 'ENTREGADO' && order.value?.status !== 'FINALIZADO',
  }))
)
const newStatus = ref(null)
const statusNote = ref('')
const changingStatus = ref(false)

async function changeStatus(status) {
  if (!status) return
  const run = async () => {
    changingStatus.value = true
    try {
      const extra = statusNote.value ? { notes: statusNote.value } : {}
      await orderStore.changeStatus(props.id, status, extra)
      fillGeneralForm()
      notifySuccess(`Estado cambiado a “${statusInfo(status).label}”`)
      newStatus.value = null
      statusNote.value = ''
      orderStore.fetchActiveOrders().catch(() => {})
    } catch (error) {
      notifyError(error)
    } finally {
      changingStatus.value = false
    }
  }
  if (status === 'ENTREGADO') {
    $q.dialog({
      title: 'Entregar vehículo',
      message: 'Se registrará la fecha de salida y la orden ya no podrá modificarse. ¿Continuar?',
      cancel: { label: 'Cancelar', flat: true },
      ok: { label: 'Entregar', color: 'primary', unelevated: true },
      persistent: true,
    }).onOk(run)
  } else {
    run()
  }
}

// ---------- Datos generales (PATCH /orders/:id) ----------
const general = ref({ problem: '', diagnosis: '', notes: '', mechanic: null })
const savingGeneral = ref(false)

function fillGeneralForm() {
  const o = orderStore.currentOrder
  if (!o) return
  general.value = { problem: o.problem || '', diagnosis: o.diagnosis || '', notes: o.notes || '', mechanic: o.mechanic?._id || null }
}

const mechanicOptions = computed(() => mechanicStore.mechanics.map((m) => ({ value: m._id, label: `${m.fullName} · ${m.specialty}` })))

async function saveGeneral() {
  savingGeneral.value = true
  try {
    await orderStore.updateOrder(props.id, general.value)
    fillGeneralForm()
    notifySuccess('Orden actualizada')
  } catch (error) {
    notifyError(error)
  } finally {
    savingGeneral.value = false
  }
}

// ---------- Ítems (servicios y repuestos) ----------
const itemColumns = [
  { name: 'name', label: 'Descripción', field: 'name', align: 'left' },
  { name: 'quantity', label: 'Cant.', field: 'quantity', align: 'center' },
  { name: 'price', label: 'Precio unit.', field: 'price', align: 'right', format: formatMoney },
  { name: 'subtotal', label: 'Subtotal', field: 'subtotal', align: 'right', format: formatMoney },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const itemRows = computed(() => {
  if (!order.value) return []
  // La clave incluye el índice: un mismo servicio/repuesto puede aparecer en dos
  // líneas si su precio cambió entre una adición y otra (el backend las separa).
  const services = order.value.services.map((l, i) => ({
    key: `s-${i}-${l.service?._id || 'eliminado'}`,
    type: 'services',
    itemId: l.service?._id,
    icon: 'handyman',
    name: l.service?.name || 'Servicio eliminado',
    detail: l.service?.description,
    quantity: l.quantity,
    price: l.price,
    subtotal: l.price * l.quantity,
  }))
  const parts = order.value.parts.map((l, i) => ({
    key: `p-${i}-${l.part?._id || 'eliminado'}`,
    type: 'parts',
    itemId: l.part?._id,
    icon: 'inventory_2',
    name: l.part?.name || 'Repuesto eliminado',
    detail: l.part?.brand,
    quantity: l.quantity,
    price: l.price,
    subtotal: l.price * l.quantity,
  }))
  return [...services, ...parts]
})

const itemType = ref('service')
const itemId = ref(null)
const itemQty = ref(1)
const addingItem = ref(false)

const itemOptions = computed(() =>
  itemType.value === 'service'
    ? serviceStore.services.map((s) => ({ value: s._id, label: `${s.name} — ${formatMoney(s.price)}` }))
    : partStore.parts.map((p) => ({
        value: p._id,
        label: `${p.name}${p.brand ? ' (' + p.brand + ')' : ''} — ${formatMoney(p.price)} · stock ${p.stock}`,
        disable: p.stock === 0,
      }))
)
watch(itemType, () => (itemId.value = null))

async function addItem() {
  addingItem.value = true
  try {
    const line = itemType.value === 'service'
      ? { services: [{ service: itemId.value, quantity: Number(itemQty.value) }] }
      : { parts: [{ part: itemId.value, quantity: Number(itemQty.value) }] }
    await orderStore.addItems(props.id, line)
    notifySuccess('Ítem agregado a la orden')
    itemId.value = null
    itemQty.value = 1
    if (line.parts) partStore.fetchParts().catch(() => {})
  } catch (error) {
    notifyError(error)
  } finally {
    addingItem.value = false
  }
}

function removeItem(row) {
  $q.dialog({
    title: 'Quitar ítem',
    message: `¿Quitar “${row.name}” de la orden?${row.type === 'parts' ? ' Las unidades vuelven al inventario.' : ''}`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Quitar', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await orderStore.removeItem(props.id, row.type, row.itemId)
      notifySuccess('Ítem retirado')
      if (row.type === 'parts') partStore.fetchParts().catch(() => {})
    } catch (error) {
      notifyError(error)
    }
  })
}
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <div class="q-mb-md">
        <q-btn flat dense icon="arrow_back" label="Órdenes" color="primary" :to="{ name: 'orders' }" />
      </div>

      <div v-if="loading && !order" class="flex flex-center q-pa-xl">
        <q-spinner-gears size="56px" color="primary" />
      </div>

      <div v-else-if="notFound || !order" class="text-center q-pa-xl text-grey-7">
        <q-icon name="search_off" size="64px" />
        <div class="text-h6 q-mt-sm">No se encontró la orden</div>
      </div>

      <template v-else>
        <!-- Encabezado -->
        <div class="row items-center q-col-gutter-md q-mb-md">
          <div class="col-12 col-md">
            <div class="text-overline text-grey-7">Orden de reparación</div>
            <div class="row items-center q-gutter-sm">
              <span class="text-h4 text-weight-bold text-mono">{{ shortId(order._id) }}</span>
              <StatusChip :status="order.status" :dense="false" />
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              Ingreso: {{ formatDateTime(order.entryDate) }}
              <span v-if="order.exitDate"> · Salida: {{ formatDateTime(order.exitDate) }}</span>
            </div>
          </div>
          <div class="col-12 col-md-auto text-right">
            <div class="text-caption text-grey-7">Total de la orden</div>
            <div class="text-h4 text-weight-bold text-accent">{{ formatMoney(order.total) }}</div>
          </div>
        </div>

        <!-- Flujo de estados -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="row items-center q-gutter-xs">
            <template v-for="(s, i) in ORDER_STATUSES" :key="s.value">
              <q-chip
                :color="i <= currentIndex ? s.color : 'grey-4'"
                :text-color="i <= currentIndex ? 'white' : 'grey-8'"
                :icon="i < currentIndex ? 'check' : s.icon"
                :outline="i < currentIndex"
                :class="{ 'text-weight-bold': i === currentIndex }"
                square
              >
                {{ s.label }}
              </q-chip>
              <q-icon v-if="i < ORDER_STATUSES.length - 1" name="chevron_right" color="grey-6" class="gt-xs" />
            </template>
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!isDelivered" class="row q-col-gutter-sm items-center">
            <div class="col-12 col-md-auto">
              <q-btn
                v-if="nextStatus"
                unelevated
                color="accent"
                icon-right="arrow_forward"
                :label="`Pasar a ${nextStatus.label}`"
                :loading="changingStatus"
                @click="changeStatus(nextStatus.value)"
              />
            </div>
            <div class="col-12 col-md-3">
              <q-select v-model="newStatus" :options="statusOptions" option-value="value" option-label="label" emit-value map-options dense outlined label="Otro estado" />
            </div>
            <div class="col-12 col-md">
              <q-input v-model="statusNote" dense outlined label="Nota del cambio (opcional, reemplaza las notas)" />
            </div>
            <div class="col-12 col-md-auto">
              <q-btn outline color="primary" label="Cambiar" :disable="!newStatus" :loading="changingStatus" @click="changeStatus(newStatus)" />
            </div>
          </q-card-section>
          <q-card-section v-else class="text-positive">
            <q-icon name="verified" /> Vehículo entregado. La orden está cerrada.
          </q-card-section>
        </q-card>

        <div class="row q-col-gutter-md">
          <!-- Columna izquierda -->
          <div class="col-12 col-md-4 q-gutter-y-md">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-overline text-grey-7">Vehículo</div>
                <PlateTag :plate="order.vehicle?.plate" />
                <div class="text-h6 q-mt-sm">{{ order.vehicle?.brand }} {{ order.vehicle?.model }}</div>
                <div class="text-grey-7">Año {{ order.vehicle?.year }}</div>
              </q-card-section>
              <q-separator inset />
              <q-card-section>
                <div class="text-overline text-grey-7">Propietario</div>
                <div class="text-weight-medium">{{ order.vehicle?.clientId?.fullName }}</div>
                <div class="text-caption">Doc. {{ order.vehicle?.clientId?.documentId }}</div>
                <div class="text-caption"><q-icon name="phone" /> {{ order.vehicle?.clientId?.phone }}</div>
                <div v-if="order.vehicle?.clientId?.email" class="text-caption"><q-icon name="mail" /> {{ order.vehicle.clientId.email }}</div>
              </q-card-section>
              <q-card-actions>
                <q-btn flat color="primary" icon="history" label="Historial del vehículo" :to="{ name: 'vehicle-history', params: { plate: order.vehicle?.plate } }" />
              </q-card-actions>
            </q-card>

            <q-card flat bordered>
              <q-card-section>
                <div class="text-overline text-grey-7">Mecánico asignado</div>
                <div class="text-weight-medium">{{ order.mechanic?.fullName }}</div>
                <q-badge color="accent" :label="order.mechanic?.specialty" />
                <div class="text-caption q-mt-xs"><q-icon name="phone" /> {{ order.mechanic?.phone }}</div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Columna derecha -->
          <div class="col-12 col-md-8 q-gutter-y-md">
            <q-card flat bordered>
              <q-card-section class="text-subtitle1 text-weight-bold">
                <q-icon name="receipt_long" class="q-mr-xs" /> Servicios y repuestos
              </q-card-section>
              <q-table :rows="itemRows" :columns="itemColumns" row-key="key" flat hide-pagination :rows-per-page-options="[0]" no-data-label="Aún no se han agregado servicios ni repuestos">
                <template #body-cell-name="props">
                  <q-td :props="props">
                    <q-icon :name="props.row.icon" color="grey-7" class="q-mr-sm" />
                    {{ props.value }}
                    <div v-if="props.row.detail" class="text-caption text-grey-7 q-ml-lg">{{ props.row.detail }}</div>
                  </q-td>
                </template>
                <template #body-cell-actions="props">
                  <q-td :props="props">
                    <q-btn v-if="!isClosed && props.row.itemId" flat round dense icon="remove_circle_outline" color="negative" @click="removeItem(props.row)">
                      <q-tooltip>Quitar</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
                <template #bottom-row>
                  <q-tr>
                    <q-td colspan="3" class="text-right text-weight-bold">TOTAL</q-td>
                    <q-td class="text-right text-weight-bold text-subtitle1">{{ formatMoney(order.total) }}</q-td>
                    <q-td />
                  </q-tr>
                </template>
              </q-table>

              <template v-if="!isClosed">
                <q-separator />
                <q-form class="q-pa-md row q-col-gutter-sm items-start" @submit="addItem">
                  <div class="col-12 col-sm-auto">
                    <q-btn-toggle
                      v-model="itemType"
                      unelevated
                      toggle-color="primary"
                      :options="[{ label: 'Servicio', value: 'service' }, { label: 'Repuesto', value: 'part' }]"
                    />
                  </div>
                  <div class="col-12 col-sm">
                    <q-select v-model="itemId" :options="itemOptions" emit-value map-options dense outlined :label="itemType === 'service' ? 'Servicio' : 'Repuesto'" :rules="[required]" hide-bottom-space />
                  </div>
                  <div class="col-6 col-sm-2">
                    <q-input v-model.number="itemQty" type="number" min="1" dense outlined label="Cant." :rules="[(v) => (Number.isInteger(Number(v)) && Number(v) >= 1) || 'Entero ≥ 1']" hide-bottom-space />
                  </div>
                  <div class="col-6 col-sm-auto">
                    <q-btn type="submit" color="primary" unelevated icon="add" label="Agregar" :loading="addingItem" />
                  </div>
                </q-form>
              </template>
              <q-card-section v-else class="text-caption text-grey-7">
                En estado {{ statusInfo(order.status).label }} ya no se pueden agregar ni quitar ítems.
              </q-card-section>
            </q-card>

            <q-card flat bordered>
              <q-card-section class="text-subtitle1 text-weight-bold">
                <q-icon name="description" class="q-mr-xs" /> Datos de la orden
              </q-card-section>
              <q-form class="q-px-md q-pb-md q-gutter-sm" @submit="saveGeneral">
                <q-input v-model.trim="general.problem" label="Problema reportado *" type="textarea" autogrow outlined :readonly="isDelivered" :rules="[required]" />
                <q-input v-model.trim="general.diagnosis" label="Diagnóstico" type="textarea" autogrow outlined :readonly="isDelivered" />
                <q-input v-model.trim="general.notes" label="Notas" type="textarea" autogrow outlined :readonly="isDelivered" />
                <q-select v-model="general.mechanic" :options="mechanicOptions" emit-value map-options outlined label="Mecánico" :readonly="isDelivered" />
                <div v-if="!isDelivered" class="text-right">
                  <q-btn type="submit" color="primary" unelevated icon="save" label="Guardar cambios" :loading="savingGeneral" />
                </div>
              </q-form>
            </q-card>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>
