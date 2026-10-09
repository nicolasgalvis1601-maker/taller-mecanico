<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useVehicleStore } from '../stores/vehicles.js'
import { useClientStore } from '../stores/clients.js'
import PageHeader from '../components/PageHeader.vue'
import PlateTag from '../components/PlateTag.vue'
import { notifySuccess, notifyError } from '../utils/notify.js'
import { required, year } from '../utils/rules.js'

const $q = useQuasar()
const router = useRouter()
const vehicleStore = useVehicleStore()
const clientStore = useClientStore()

const filter = ref('')

const columns = [
  { name: 'plate', label: 'Placa', field: 'plate', align: 'left', sortable: true },
  { name: 'brand', label: 'Marca', field: 'brand', align: 'left', sortable: true },
  { name: 'model', label: 'Modelo', field: 'model', align: 'left', sortable: true },
  { name: 'year', label: 'Año', field: 'year', align: 'center', sortable: true },
  { name: 'owner', label: 'Propietario', field: (row) => row.clientId?.fullName || '—', align: 'left', sortable: true },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'right' },
]

// Opciones del select de propietario (filtrable)
const allClientOptions = computed(() =>
  clientStore.clients.map((c) => ({ label: `${c.fullName} · ${c.documentId}`, value: c._id }))
)
const clientOptions = ref([])
function filterClients(val, update) {
  update(() => {
    const needle = val.toLowerCase()
    clientOptions.value = allClientOptions.value.filter((o) => o.label.toLowerCase().includes(needle))
  })
}

// ---------- Formulario ----------
const emptyForm = () => ({ plate: '', brand: '', model: '', year: new Date().getFullYear(), clientId: null })
const showForm = ref(false)
const saving = ref(false)
const editingPlate = ref(null)
const form = ref(emptyForm())

function openCreate() {
  editingPlate.value = null
  form.value = emptyForm()
  clientOptions.value = allClientOptions.value
  showForm.value = true
}

function openEdit(row) {
  editingPlate.value = row.plate
  form.value = {
    plate: row.plate,
    brand: row.brand,
    model: row.model,
    year: row.year,
    clientId: row.clientId?._id || row.clientId,
  }
  clientOptions.value = allClientOptions.value
  showForm.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = { ...form.value, plate: form.value.plate.toUpperCase(), year: Number(form.value.year) }
    const res = editingPlate.value
      ? await vehicleStore.updateVehicle(editingPlate.value, payload)
      : await vehicleStore.createVehicle(payload)
    notifySuccess(res.message)
    showForm.value = false
  } catch (error) {
    notifyError(error)
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  $q.dialog({
    title: 'Eliminar vehículo',
    message: `¿Eliminar el vehículo con placa <b>${row.plate}</b>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    try {
      const res = await vehicleStore.deleteVehicle(row.plate)
      notifySuccess(res.message)
    } catch (error) {
      notifyError(error)
    }
  })
}

function goHistory(row) {
  router.push({ name: 'vehicle-history', params: { plate: row.plate } })
}

onMounted(() => {
  vehicleStore.fetchVehicles().catch(notifyError)
  clientStore.fetchClients().catch(() => {})
})
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <PageHeader title="Vehículos" subtitle="Parque automotor registrado y su historial técnico" icon="directions_car">
        <template #actions>
          <q-btn color="accent" icon="add" label="Nuevo vehículo" unelevated @click="openCreate" />
        </template>
      </PageHeader>

      <q-table
        :rows="vehicleStore.vehicles"
        :columns="columns"
        row-key="_id"
        :filter="filter"
        :loading="vehicleStore.loading"
        :rows-per-page-options="[10, 25, 50, 0]"
        no-data-label="No hay vehículos registrados"
        no-results-label="Sin resultados"
        flat
        bordered
      >
        <template #top>
          <q-input v-model="filter" dense outlined clearable placeholder="Filtrar por placa, marca, modelo…" style="width: 360px; max-width: 100%">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </template>

        <template #body-cell-plate="props">
          <q-td :props="props"><PlateTag :plate="props.value" /></q-td>
        </template>

        <template #body-cell-owner="props">
          <q-td :props="props">
            <div>{{ props.value }}</div>
            <div class="text-caption text-grey-7">{{ props.row.clientId?.phone }}</div>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn flat round dense color="primary" icon="history" @click="goHistory(props.row)">
              <q-tooltip>Historial técnico</q-tooltip>
            </q-btn>
            <q-btn flat round dense color="secondary" icon="edit" @click="openEdit(props.row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn flat round dense color="negative" icon="delete" @click="confirmDelete(props.row)">
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="showForm" persistent>
      <q-card style="width: 520px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingPlate ? `Editar vehículo ${editingPlate}` : 'Nuevo vehículo' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-form @submit="save">
          <q-card-section class="q-gutter-sm">
            <q-input v-model.trim="form.plate" label="Placa *" outlined :rules="[required]" input-class="text-uppercase text-mono" />
            <div class="row q-col-gutter-sm">
              <q-input v-model.trim="form.brand" label="Marca *" outlined class="col-6" :rules="[required]" />
              <q-input v-model.trim="form.model" label="Modelo *" outlined class="col-6" :rules="[required]" />
            </div>
            <q-input v-model.number="form.year" type="number" label="Año *" outlined :rules="[required, year]" />
            <q-select
              v-model="form.clientId"
              label="Propietario *"
              outlined
              :options="clientOptions"
              emit-value
              map-options
              use-input
              input-debounce="0"
              :rules="[required]"
              @filter="filterClients"
            >
              <template #no-option>
                <q-item><q-item-section class="text-grey">No hay clientes. Regístralo primero en “Clientes”.</q-item-section></q-item>
              </template>
            </q-select>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn type="submit" color="primary" unelevated :loading="saving" :label="editingPlate ? 'Guardar cambios' : 'Registrar'" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
