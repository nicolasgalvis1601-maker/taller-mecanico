<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useServiceStore } from '../stores/services.js'
import PageHeader from '../components/PageHeader.vue'
import { notifySuccess, notifyError } from '../utils/notify.js'
import { required, nonNegative } from '../utils/rules.js'
import { formatMoney } from '../utils/format.js'

const $q = useQuasar()
const serviceStore = useServiceStore()
const filter = ref('')

const columns = [
  { name: 'name', label: 'Servicio', field: 'name', align: 'left', sortable: true },
  { name: 'description', label: 'Descripción', field: (r) => r.description || '—', align: 'left' },
  { name: 'price', label: 'Precio', field: 'price', align: 'right', sortable: true, format: formatMoney },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'right' },
]

const emptyForm = () => ({ name: '', description: '', price: null })
const showForm = ref(false)
const saving = ref(false)
const editingId = ref(null)
const form = ref(emptyForm())

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  showForm.value = true
}
function openEdit(row) {
  editingId.value = row._id
  form.value = { name: row.name, description: row.description || '', price: row.price }
  showForm.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = { ...form.value, price: Number(form.value.price) }
    if (editingId.value) {
      await serviceStore.updateService(editingId.value, payload)
      notifySuccess('Servicio actualizado (las órdenes existentes conservan su precio)')
    } else {
      await serviceStore.createService(payload)
      notifySuccess('Servicio creado exitosamente')
    }
    showForm.value = false
  } catch (error) {
    notifyError(error)
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  $q.dialog({
    title: 'Eliminar servicio',
    message: `¿Eliminar el servicio <b>${row.name}</b>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    try {
      const res = await serviceStore.deleteService(row._id)
      notifySuccess(res.message)
    } catch (error) {
      notifyError(error)
    }
  })
}

onMounted(() => serviceStore.fetchServices().catch(notifyError))
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <PageHeader title="Servicios" subtitle="Catálogo de mano de obra y sus tarifas" icon="handyman">
        <template #actions>
          <q-btn color="accent" icon="add" label="Nuevo servicio" unelevated @click="openCreate" />
        </template>
      </PageHeader>

      <q-table
        :rows="serviceStore.services"
        :columns="columns"
        row-key="_id"
        :filter="filter"
        :loading="serviceStore.loading"
        :rows-per-page-options="[10, 25, 50, 0]"
        no-data-label="No hay servicios en el catálogo"
        flat
        bordered
      >
        <template #top>
          <q-input v-model="filter" dense outlined clearable placeholder="Filtrar servicios…" style="width: 320px; max-width: 100%">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </template>
        <template #body-cell-price="props">
          <q-td :props="props" class="text-weight-bold">{{ props.value }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn flat round dense color="secondary" icon="edit" @click="openEdit(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
            <q-btn flat round dense color="negative" icon="delete" @click="confirmDelete(props.row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="showForm" persistent>
      <q-card style="width: 480px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingId ? 'Editar servicio' : 'Nuevo servicio' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-form @submit="save">
          <q-card-section class="q-gutter-sm">
            <q-input v-model.trim="form.name" label="Nombre *" outlined :rules="[required]" />
            <q-input v-model.trim="form.description" label="Descripción" type="textarea" autogrow outlined />
            <q-input v-model.number="form.price" label="Precio *" type="number" prefix="$" outlined :rules="[required, nonNegative]" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn type="submit" color="primary" unelevated :loading="saving" :label="editingId ? 'Guardar cambios' : 'Crear'" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
