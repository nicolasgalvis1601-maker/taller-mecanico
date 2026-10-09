<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useMechanicStore } from '../stores/mechanics.js'
import PageHeader from '../components/PageHeader.vue'
import StatusChip from '../components/StatusChip.vue'
import PlateTag from '../components/PlateTag.vue'
import { notifySuccess, notifyError } from '../utils/notify.js'
import { required, phone } from '../utils/rules.js'
import { formatDate } from '../utils/format.js'

const $q = useQuasar()
const mechanicStore = useMechanicStore()

const specialties = ['Mecánica general', 'Motor', 'Frenos', 'Suspensión', 'Electricidad', 'Transmisión', 'Latonería y pintura', 'Aire acondicionado']

const emptyForm = () => ({ fullName: '', phone: '', specialty: '' })
const showForm = ref(false)
const saving = ref(false)
const editingId = ref(null)
const form = ref(emptyForm())

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  showForm.value = true
}
function openEdit(m) {
  editingId.value = m._id
  form.value = { fullName: m.fullName, phone: m.phone, specialty: m.specialty }
  showForm.value = true
}

async function save() {
  saving.value = true
  try {
    if (editingId.value) {
      await mechanicStore.updateMechanic(editingId.value, form.value)
      notifySuccess('Mecánico actualizado exitosamente')
    } else {
      await mechanicStore.createMechanic(form.value)
      notifySuccess('Mecánico registrado exitosamente')
    }
    showForm.value = false
  } catch (error) {
    notifyError(error)
  } finally {
    saving.value = false
  }
}

function confirmDelete(m) {
  $q.dialog({
    title: 'Eliminar mecánico',
    message: `¿Eliminar a <b>${m.fullName}</b>?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    try {
      const res = await mechanicStore.deleteMechanic(m._id)
      notifySuccess(res.message)
    } catch (error) {
      notifyError(error)
    }
  })
}

// ---------- Órdenes activas del mecánico ----------
const showOrders = ref(false)
const mechanicOrders = ref({ mechanic: null, totalOrders: 0, orders: [] })
const loadingOrders = ref(false)

async function openOrders(m) {
  showOrders.value = true
  loadingOrders.value = true
  mechanicOrders.value = { mechanic: m, totalOrders: 0, orders: [] }
  try {
    mechanicOrders.value = await mechanicStore.getMechanicOrders(m._id)
  } catch (error) {
    notifyError(error)
  } finally {
    loadingOrders.value = false
  }
}

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

onMounted(() => mechanicStore.fetchMechanics().catch(notifyError))
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <PageHeader title="Mecánicos" subtitle="Equipo técnico y carga de trabajo asignada" icon="engineering">
        <template #actions>
          <q-btn color="accent" icon="person_add" label="Nuevo mecánico" unelevated @click="openCreate" />
        </template>
      </PageHeader>

      <div v-if="mechanicStore.loading && !mechanicStore.mechanics.length" class="flex flex-center q-pa-xl">
        <q-spinner-gears size="48px" color="primary" />
      </div>

      <div v-else-if="!mechanicStore.mechanics.length" class="text-center text-grey-7 q-pa-xl">
        <q-icon name="engineering" size="64px" color="grey-5" />
        <div class="q-mt-sm">Aún no hay mecánicos registrados.</div>
      </div>

      <div v-else class="row q-col-gutter-md">
        <div v-for="m in mechanicStore.mechanics" :key="m._id" class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered class="full-height column">
            <q-card-section class="row items-center no-wrap">
              <q-avatar color="primary" text-color="white" size="48px">{{ initials(m.fullName) }}</q-avatar>
              <div class="q-ml-md">
                <div class="text-subtitle1 text-weight-bold">{{ m.fullName }}</div>
                <q-badge color="accent" :label="m.specialty" />
              </div>
            </q-card-section>
            <q-card-section class="q-pt-none text-grey-8">
              <q-icon name="phone" class="q-mr-xs" /> {{ m.phone }}
            </q-card-section>
            <q-space />
            <q-separator />
            <q-card-actions align="between">
              <q-btn flat color="primary" icon="assignment" label="Órdenes activas" @click="openOrders(m)" />
              <div>
                <q-btn flat round dense color="secondary" icon="edit" @click="openEdit(m)"><q-tooltip>Editar</q-tooltip></q-btn>
                <q-btn flat round dense color="negative" icon="delete" @click="confirmDelete(m)"><q-tooltip>Eliminar</q-tooltip></q-btn>
              </div>
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>

    <q-dialog v-model="showForm" persistent>
      <q-card style="width: 480px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingId ? 'Editar mecánico' : 'Nuevo mecánico' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-form @submit="save">
          <q-card-section class="q-gutter-sm">
            <q-input v-model.trim="form.fullName" label="Nombre completo *" outlined :rules="[required]" />
            <q-input v-model.trim="form.phone" label="Teléfono *" outlined :rules="[required, phone]" />
            <q-select
              v-model="form.specialty"
              label="Especialidad *"
              outlined
              :options="specialties"
              use-input
              new-value-mode="add-unique"
              hide-selected
              fill-input
              input-debounce="0"
              hint="Elige una o escribe otra y presiona Enter"
              :rules="[required]"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn type="submit" color="primary" unelevated :loading="saving" :label="editingId ? 'Guardar cambios' : 'Registrar'" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showOrders">
      <q-card style="width: 560px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Órdenes activas de {{ mechanicOrders.mechanic?.fullName }}</div>
          <div class="text-caption text-grey-7">{{ mechanicOrders.totalOrders }} orden(es) en el taller</div>
        </q-card-section>
        <q-separator />
        <q-card-section v-if="loadingOrders" class="flex flex-center q-pa-lg">
          <q-spinner-gears size="40px" color="primary" />
        </q-card-section>
        <q-list v-else-if="mechanicOrders.orders.length" separator>
          <q-item v-for="o in mechanicOrders.orders" :key="o._id" clickable :to="{ name: 'order-detail', params: { id: o._id } }">
            <q-item-section avatar><PlateTag :plate="o.vehicle?.plate" /></q-item-section>
            <q-item-section>
              <q-item-label>{{ o.vehicle?.brand }} {{ o.vehicle?.model }}</q-item-label>
              <q-item-label caption lines="1">{{ o.problem }} · Ingreso {{ formatDate(o.entryDate) }}</q-item-label>
            </q-item-section>
            <q-item-section side><StatusChip :status="o.status" /></q-item-section>
          </q-item>
        </q-list>
        <q-card-section v-else class="text-center text-grey-7">Sin órdenes activas asignadas.</q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cerrar" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
