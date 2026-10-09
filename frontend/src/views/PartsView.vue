<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { usePartStore } from '../stores/parts.js'
import { useAppStore } from '../stores/app.js'
import PageHeader from '../components/PageHeader.vue'
import { notifySuccess, notifyError } from '../utils/notify.js'
import { required, nonNegative, integer } from '../utils/rules.js'
import { formatMoney } from '../utils/format.js'

const $q = useQuasar()
const partStore = usePartStore()
const appStore = useAppStore()

const filter = ref('')
const onlyLowStock = ref(false)

const columns = [
  { name: 'name', label: 'Repuesto', field: 'name', align: 'left', sortable: true },
  { name: 'brand', label: 'Marca', field: (r) => r.brand || '—', align: 'left', sortable: true },
  { name: 'price', label: 'Precio', field: 'price', align: 'right', sortable: true, format: formatMoney },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'right' },
]

const rows = computed(() => (onlyLowStock.value ? partStore.lowStockParts : partStore.parts))

async function load() {
  try {
    if (onlyLowStock.value) await partStore.fetchLowStock(appStore.lowStockThreshold)
    else await partStore.fetchParts()
  } catch (error) {
    notifyError(error)
  }
}

// ---------- Crear / editar ----------
const emptyForm = () => ({ name: '', brand: '', price: null, stock: 0 })
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
  form.value = { name: row.name, brand: row.brand || '', price: row.price, stock: row.stock }
  showForm.value = true
}

async function save() {
  saving.value = true
  try {
    const payload = { ...form.value, price: Number(form.value.price), stock: Number(form.value.stock) }
    if (editingId.value) {
      await partStore.updatePart(editingId.value, payload)
      notifySuccess('Repuesto actualizado exitosamente')
    } else {
      await partStore.createPart(payload)
      notifySuccess('Repuesto creado exitosamente')
    }
    showForm.value = false
    if (onlyLowStock.value) load()
  } catch (error) {
    notifyError(error)
  } finally {
    saving.value = false
  }
}

function confirmDelete(row) {
  $q.dialog({
    title: 'Eliminar repuesto',
    message: `¿Eliminar <b>${row.name}</b> del inventario?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    try {
      const res = await partStore.deletePart(row._id)
      notifySuccess(res.message)
      if (onlyLowStock.value) load()
    } catch (error) {
      notifyError(error)
    }
  })
}

// ---------- Ajuste de inventario (PATCH /parts/:id/stock) ----------
const showStock = ref(false)
const stockPart = ref(null)
const stockMode = ref('in')
const stockQty = ref(1)
const adjusting = ref(false)

function openStock(row) {
  stockPart.value = row
  stockMode.value = 'in'
  stockQty.value = 1
  showStock.value = true
}

async function applyStock() {
  adjusting.value = true
  try {
    const qty = stockMode.value === 'in' ? Number(stockQty.value) : -Number(stockQty.value)
    const updated = await partStore.adjustStock(stockPart.value._id, qty)
    notifySuccess(`Stock de ${updated.name}: ${updated.stock} unidades`)
    showStock.value = false
    if (onlyLowStock.value) load()
  } catch (error) {
    notifyError(error)
  } finally {
    adjusting.value = false
  }
}

const stockColor = (stock) => (stock === 0 ? 'negative' : stock <= appStore.lowStockThreshold ? 'warning' : 'positive')

onMounted(load)
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <PageHeader title="Repuestos" subtitle="Inventario de repuestos y control de existencias" icon="inventory_2">
        <template #actions>
          <q-btn color="accent" icon="add" label="Nuevo repuesto" unelevated @click="openCreate" />
        </template>
      </PageHeader>

      <q-table
        :rows="rows"
        :columns="columns"
        row-key="_id"
        :filter="filter"
        :loading="partStore.loading"
        :rows-per-page-options="[10, 25, 50, 0]"
        :no-data-label="onlyLowStock ? 'Ningún repuesto con stock bajo 🎉' : 'No hay repuestos registrados'"
        flat
        bordered
      >
        <template #top>
          <div class="row items-center q-col-gutter-md full-width">
            <div class="col-12 col-md">
              <q-input v-model="filter" dense outlined clearable placeholder="Filtrar repuestos…" style="max-width: 320px">
                <template #prepend><q-icon name="search" /></template>
              </q-input>
            </div>
            <div class="col-auto">
              <q-toggle v-model="onlyLowStock" color="warning" label="Solo stock bajo" @update:model-value="load" />
            </div>
            <div class="col-auto" style="width: 150px">
              <q-input
                v-model.number="appStore.lowStockThreshold"
                type="number"
                dense
                outlined
                label="Umbral"
                min="0"
                debounce="500"
                @update:model-value="onlyLowStock && load()"
              />
            </div>
          </div>
        </template>

        <template #body-cell-stock="props">
          <q-td :props="props">
            <q-badge :color="stockColor(props.value)" :text-color="stockColor(props.value) === 'warning' ? 'dark' : 'white'" class="text-weight-bold q-px-sm">
              {{ props.value }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn flat round dense color="primary" icon="swap_vert" @click="openStock(props.row)"><q-tooltip>Ajustar stock</q-tooltip></q-btn>
            <q-btn flat round dense color="secondary" icon="edit" @click="openEdit(props.row)"><q-tooltip>Editar</q-tooltip></q-btn>
            <q-btn flat round dense color="negative" icon="delete" @click="confirmDelete(props.row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <q-dialog v-model="showForm" persistent>
      <q-card style="width: 480px; max-width: 95vw">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingId ? 'Editar repuesto' : 'Nuevo repuesto' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-form @submit="save">
          <q-card-section class="q-gutter-sm">
            <q-input v-model.trim="form.name" label="Nombre *" outlined :rules="[required]" />
            <q-input v-model.trim="form.brand" label="Marca" outlined />
            <div class="row q-col-gutter-sm">
              <q-input v-model.number="form.price" label="Precio *" type="number" prefix="$" outlined class="col-7" :rules="[required, nonNegative]" />
              <q-input v-model.number="form.stock" label="Stock" type="number" outlined class="col-5" :rules="[nonNegative, integer]" />
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn type="submit" color="primary" unelevated :loading="saving" :label="editingId ? 'Guardar cambios' : 'Crear'" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showStock" persistent>
      <q-card style="width: 400px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Ajustar stock</div>
          <div class="text-grey-7">{{ stockPart?.name }} · disponible: <b>{{ stockPart?.stock }}</b></div>
        </q-card-section>
        <q-form @submit="applyStock">
          <q-card-section class="q-gutter-md">
            <q-btn-toggle
              v-model="stockMode"
              spread
              unelevated
              toggle-color="primary"
              :options="[
                { label: 'Ingreso', value: 'in', icon: 'add' },
                { label: 'Salida', value: 'out', icon: 'remove' },
              ]"
            />
            <q-input
              v-model.number="stockQty"
              type="number"
              label="Cantidad"
              outlined
              min="1"
              :rules="[required, integer, (v) => Number(v) > 0 || 'Debe ser mayor que 0']"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn type="submit" color="primary" unelevated :loading="adjusting" label="Aplicar" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>
