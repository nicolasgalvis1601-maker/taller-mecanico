<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useClientStore } from '../stores/clients.js'
import PageHeader from '../components/PageHeader.vue'
import PlateTag from '../components/PlateTag.vue'
import { notifySuccess, notifyError } from '../utils/notify.js'
import { required, minLength, phone, email } from '../utils/rules.js'

const $q = useQuasar()
const clientStore = useClientStore()

const search = ref('')

const columns = [
  { name: 'documentId', label: 'Documento', field: 'documentId', align: 'left', sortable: true },
  { name: 'fullName', label: 'Nombre completo', field: 'fullName', align: 'left', sortable: true },
  { name: 'phone', label: 'Teléfono', field: 'phone', align: 'left' },
  { name: 'email', label: 'Correo', field: (row) => row.email || '—', align: 'left' },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'right' },
]

// ---------- Formulario (crear / editar) ----------
const emptyForm = () => ({ documentId: '', fullName: '', phone: '', email: '' })
const showForm = ref(false)
const saving = ref(false)
const editingDocument = ref(null) // documentId original cuando se edita
const form = ref(emptyForm())

function openCreate() {
  editingDocument.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(row) {
  editingDocument.value = row.documentId
  form.value = { documentId: row.documentId, fullName: row.fullName, phone: row.phone, email: row.email || '' }
  showForm.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!editingDocument.value && !payload.email) delete payload.email
    const res = editingDocument.value
      ? await clientStore.updateClient(editingDocument.value, payload)
      : await clientStore.createClient(payload)
    notifySuccess(res.message)
    showForm.value = false
    search.value = ''
  } catch (error) {
    notifyError(error)
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  $q.dialog({
    title: 'Eliminar cliente',
    message: `¿Seguro que deseas eliminar a <b>${row.fullName}</b>? Esta acción no se puede deshacer.`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    try {
      const res = await clientStore.deleteClient(row.documentId)
      notifySuccess(res.message)
    } catch (error) {
      notifyError(error)
    }
  })
}

// ---------- Vehículos del cliente ----------
const showVehicles = ref(false)
const clientVehicles = ref({ client: null, vehicles: [] })
const loadingVehicles = ref(false)

async function openVehicles(row) {
  showVehicles.value = true
  loadingVehicles.value = true
  clientVehicles.value = { client: row, vehicles: [] }
  try {
    clientVehicles.value = await clientStore.getClientVehicles(row.documentId)
  } catch (error) {
    notifyError(error)
  } finally {
    loadingVehicles.value = false
  }
}

// Búsqueda en el servidor: GET /api/clients?search=texto
function onSearch(value) {
  clientStore.fetchClients(value || '').catch(notifyError)
}

onMounted(() => onSearch(search.value))
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <PageHeader title="Clientes" subtitle="Propietarios de los vehículos que atiende el taller" icon="people">
        <template #actions>
          <q-btn color="accent" icon="person_add" label="Nuevo cliente" unelevated @click="openCreate" />
        </template>
      </PageHeader>

      <q-table
        :rows="clientStore.clients"
        :columns="columns"
        row-key="_id"
        :loading="clientStore.loading"
        :rows-per-page-options="[10, 25, 50, 0]"
        no-data-label="No hay clientes registrados"
        no-results-label="Sin resultados para la búsqueda"
        flat
        bordered
      >
        <template #top>
          <q-input
            v-model="search"
            dense
            outlined
            debounce="400"
            clearable
            placeholder="Buscar por nombre, documento, correo o teléfono"
            class="full-width"
            style="max-width: 420px"
            @update:model-value="onSearch"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn flat round dense color="primary" icon="directions_car" @click="openVehicles(props.row)">
              <q-tooltip>Ver vehículos</q-tooltip>
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

    <!-- Diálogo crear / editar -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="width: 520px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingDocument ? 'Editar cliente' : 'Nuevo cliente' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-form @submit="save">
          <q-card-section class="q-gutter-sm">
            <q-input v-model.trim="form.documentId" label="Documento de identidad *" outlined :rules="[required]" />
            <q-input v-model.trim="form.fullName" label="Nombre completo *" outlined :rules="[required, minLength(3)]" />
            <q-input v-model.trim="form.phone" label="Teléfono *" outlined :rules="[required, phone]" />
            <q-input v-model.trim="form.email" label="Correo electrónico" type="email" outlined :rules="[email]" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn type="submit" color="primary" unelevated :loading="saving" :label="editingDocument ? 'Guardar cambios' : 'Registrar'" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Diálogo vehículos del cliente -->
    <q-dialog v-model="showVehicles">
      <q-card style="width: 520px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Vehículos de {{ clientVehicles.client?.fullName }}</div>
          <div class="text-caption text-grey-7">Documento {{ clientVehicles.client?.documentId }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section v-if="loadingVehicles" class="flex flex-center q-pa-lg">
          <q-spinner-gears size="40px" color="primary" />
        </q-card-section>
        <q-list v-else-if="clientVehicles.vehicles.length" separator>
          <q-item
            v-for="v in clientVehicles.vehicles"
            :key="v._id"
            clickable
            :to="{ name: 'vehicle-history', params: { plate: v.plate } }"
          >
            <q-item-section avatar><PlateTag :plate="v.plate" /></q-item-section>
            <q-item-section>
              <q-item-label>{{ v.brand }} {{ v.model }}</q-item-label>
              <q-item-label caption>Año {{ v.year }}</q-item-label>
            </q-item-section>
            <q-item-section side><q-icon name="history" /></q-item-section>
          </q-item>
        </q-list>
        <q-card-section v-else class="text-grey-7 text-center">Este cliente no tiene vehículos registrados.</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cerrar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
