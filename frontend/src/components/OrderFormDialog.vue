<script setup>
import { ref, computed, watch } from 'vue'
import { useVehicleStore } from '../stores/vehicles.js'
import { useMechanicStore } from '../stores/mechanics.js'
import { useServiceStore } from '../stores/services.js'
import { usePartStore } from '../stores/parts.js'
import { useOrderStore } from '../stores/orders.js'
import { notifySuccess, notifyError, notifyWarning } from '../utils/notify.js'
import { required } from '../utils/rules.js'
import { formatMoney } from '../utils/format.js'

// v-model para abrir / cerrar el diálogo
const show = defineModel({ type: Boolean, default: false })
const props = defineProps({ presetPlate: { type: String, default: '' } })
const emit = defineEmits(['created'])

const vehicleStore = useVehicleStore()
const mechanicStore = useMechanicStore()
const serviceStore = useServiceStore()
const partStore = usePartStore()
const orderStore = useOrderStore()

const emptyForm = () => ({ vehicle: null, mechanic: null, problem: '', diagnosis: '', notes: '', services: [], parts: [] })
const form = ref(emptyForm())
const saving = ref(false)

// Un vehículo no puede tener dos órdenes activas (regla del backend)
const busyVehicleIds = computed(() => new Set(orderStore.activeOrders.map((o) => o.vehicle?._id)))

const vehicleOptionsAll = computed(() =>
  vehicleStore.vehicles.map((v) => ({
    value: v._id,
    label: `${v.plate} — ${v.brand} ${v.model}`,
    caption: v.clientId?.fullName ? `Propietario: ${v.clientId.fullName}` : '',
    disable: busyVehicleIds.value.has(v._id),
  }))
)
const vehicleOptions = ref([])
function filterVehicles(val, update) {
  update(() => {
    const n = val.toLowerCase()
    vehicleOptions.value = vehicleOptionsAll.value.filter((o) => (o.label + o.caption).toLowerCase().includes(n))
  })
}

const mechanicOptions = computed(() =>
  mechanicStore.mechanics.map((m) => ({ value: m._id, label: m.fullName, caption: m.specialty }))
)
const serviceOptions = computed(() =>
  serviceStore.services.map((s) => ({ value: s._id, label: s.name, caption: formatMoney(s.price) }))
)
const partOptions = computed(() =>
  partStore.parts.map((p) => ({
    value: p._id,
    label: `${p.name}${p.brand ? ' (' + p.brand + ')' : ''}`,
    caption: `${formatMoney(p.price)} · stock ${p.stock}`,
    disable: p.stock === 0,
  }))
)

// Al abrir: recarga catálogos para tener precios y stock actualizados
watch(show, async (open) => {
  if (!open) return
  form.value = emptyForm()
  try {
    await Promise.all([
      vehicleStore.fetchVehicles(),
      mechanicStore.fetchMechanics(),
      serviceStore.fetchServices(),
      partStore.fetchParts(),
      orderStore.fetchActiveOrders(),
    ])
    vehicleOptions.value = vehicleOptionsAll.value
    if (props.presetPlate) {
      const v = vehicleStore.vehicles.find((x) => x.plate === props.presetPlate.toUpperCase())
      if (v && busyVehicleIds.value.has(v._id)) {
        notifyWarning(`El vehículo ${v.plate} ya tiene una orden activa en el taller`)
      } else if (v) {
        form.value.vehicle = v._id
      }
    }
  } catch (error) {
    notifyError(error)
  }
})

const addService = () => form.value.services.push({ service: null, quantity: 1 })
const addPart = () => form.value.parts.push({ part: null, quantity: 1 })

// El backend exige cantidades enteras mayores o iguales a 1
const minQuantity = (v) => (Number.isInteger(Number(v)) && Number(v) >= 1) || 'Mín. 1'

const partStock = (id) => partStore.parts.find((p) => p._id === id)?.stock ?? 0

// Total estimado (el valor definitivo lo calcula el backend con los precios del catálogo)
const estimatedTotal = computed(() => {
  const s = form.value.services.reduce((acc, l) => acc + (serviceStore.services.find((x) => x._id === l.service)?.price || 0) * (l.quantity || 0), 0)
  const p = form.value.parts.reduce((acc, l) => acc + (partStore.parts.find((x) => x._id === l.part)?.price || 0) * (l.quantity || 0), 0)
  return s + p
})

async function save() {
  saving.value = true
  try {
    const payload = {
      vehicle: form.value.vehicle,
      mechanic: form.value.mechanic,
      problem: form.value.problem,
      services: form.value.services.filter((l) => l.service).map((l) => ({ service: l.service, quantity: Number(l.quantity) })),
      parts: form.value.parts.filter((l) => l.part).map((l) => ({ part: l.part, quantity: Number(l.quantity) })),
    }
    if (form.value.diagnosis) payload.diagnosis = form.value.diagnosis
    if (form.value.notes) payload.notes = form.value.notes

    const order = await orderStore.createOrder(payload)
    orderStore.fetchActiveOrders().catch(() => {})
    if (payload.parts.length) partStore.fetchParts().catch(() => {})
    notifySuccess('Orden de reparación creada')
    show.value = false
    emit('created', order)
  } catch (error) {
    notifyError(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <q-dialog v-model="show" persistent :maximized="$q.screen.lt.sm">
    <q-card style="width: 760px; max-width: 95vw">
      <q-card-section class="row items-center bg-primary text-white">
        <q-icon name="assignment_add" size="24px" class="q-mr-sm" />
        <div class="text-h6">Nueva orden de reparación</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-form @submit="save">
        <q-card-section class="q-gutter-y-sm">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-7">
              <q-select
                v-model="form.vehicle"
                label="Vehículo *"
                outlined
                :options="vehicleOptions"
                emit-value
                map-options
                use-input
                input-debounce="0"
                :rules="[required]"
                @filter="filterVehicles"
              >
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption>
                        {{ scope.opt.caption }}
                        <span v-if="scope.opt.disable" class="text-negative"> · ya tiene una orden activa</span>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template #no-option>
                  <q-item><q-item-section class="text-grey">No hay vehículos. Regístralo en “Vehículos”.</q-item-section></q-item>
                </template>
              </q-select>
            </div>
            <div class="col-12 col-sm-5">
              <q-select v-model="form.mechanic" label="Mecánico *" outlined :options="mechanicOptions" emit-value map-options :rules="[required]">
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.caption }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
          </div>

          <q-input v-model.trim="form.problem" label="Problema reportado *" type="textarea" autogrow outlined :rules="[required]" />
          <div class="row q-col-gutter-sm">
            <q-input v-model.trim="form.diagnosis" label="Diagnóstico inicial" type="textarea" autogrow outlined class="col-12 col-sm-6" />
            <q-input v-model.trim="form.notes" label="Notas" type="textarea" autogrow outlined class="col-12 col-sm-6" />
          </div>

          <!-- Servicios -->
          <div class="row items-center q-mt-md">
            <div class="text-subtitle2"><q-icon name="handyman" /> Servicios</div>
            <q-space />
            <q-btn flat dense color="primary" icon="add" label="Agregar servicio" @click="addService" />
          </div>
          <div v-for="(line, i) in form.services" :key="'s' + i" class="row q-col-gutter-sm items-center">
            <q-select v-model="line.service" :options="serviceOptions" emit-value map-options dense outlined label="Servicio" class="col">
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>{{ scope.opt.label }}</q-item-section>
                  <q-item-section side>{{ scope.opt.caption }}</q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input
              v-model.number="line.quantity"
              type="number"
              min="1"
              dense
              outlined
              label="Cant."
              style="width: 90px"
              :rules="[minQuantity]"
              hide-bottom-space
            />
            <q-btn flat round dense icon="close" color="negative" @click="form.services.splice(i, 1)" />
          </div>

          <!-- Repuestos -->
          <div class="row items-center q-mt-md">
            <div class="text-subtitle2"><q-icon name="inventory_2" /> Repuestos</div>
            <q-space />
            <q-btn flat dense color="primary" icon="add" label="Agregar repuesto" @click="addPart" />
          </div>
          <div v-for="(line, i) in form.parts" :key="'p' + i" class="row q-col-gutter-sm items-center">
            <q-select v-model="line.part" :options="partOptions" emit-value map-options dense outlined label="Repuesto" class="col">
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>{{ scope.opt.label }}</q-item-section>
                  <q-item-section side>{{ scope.opt.caption }}</q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input
              v-model.number="line.quantity"
              type="number"
              min="1"
              :max="partStock(line.part) || undefined"
              dense
              outlined
              label="Cant."
              style="width: 90px"
              :rules="[minQuantity, (v) => !line.part || Number(v) <= partStock(line.part) || `Máx. ${partStock(line.part)}`]"
              hide-bottom-space
            />
            <q-btn flat round dense icon="close" color="negative" @click="form.parts.splice(i, 1)" />
          </div>
        </q-card-section>

        <q-separator />
        <q-card-actions class="q-pa-md">
          <div>
            <div class="text-caption text-grey-7">Total estimado</div>
            <div class="text-h6 text-weight-bold">{{ formatMoney(estimatedTotal) }}</div>
          </div>
          <q-space />
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn type="submit" color="accent" unelevated icon="save" label="Crear orden" :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>
