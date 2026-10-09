<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVehicleStore } from '../stores/vehicles.js'
import PageHeader from '../components/PageHeader.vue'
import PlateTag from '../components/PlateTag.vue'
import StatusChip from '../components/StatusChip.vue'
import { statusInfo } from '../utils/constants.js'
import { formatMoney, formatDateTime, shortId } from '../utils/format.js'
import { notifyError } from '../utils/notify.js'

const props = defineProps({ plate: { type: String, required: true } })

const router = useRouter()
const vehicleStore = useVehicleStore()

const data = ref(null)
const loading = ref(false)
const searchPlate = ref('')

async function load() {
  loading.value = true
  data.value = null
  try {
    // GET /api/vehicles/:plate/history
    data.value = await vehicleStore.getHistory(props.plate)
  } catch (error) {
    notifyError(error)
  } finally {
    loading.value = false
  }
}
watch(() => props.plate, load, { immediate: true })

function goToPlate() {
  const plate = searchPlate.value.trim().toUpperCase()
  if (plate) router.push({ name: 'vehicle-history', params: { plate } })
  searchPlate.value = ''
}
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <PageHeader title="Historial técnico" subtitle="Todas las intervenciones realizadas al vehículo" icon="history">
        <template #actions>
          <q-input v-model="searchPlate" dense outlined placeholder="Otra placa…" style="width: 180px" input-class="text-uppercase" @keyup.enter="goToPlate">
            <template #append><q-btn flat round dense icon="search" @click="goToPlate" /></template>
          </q-input>
          <q-btn outline color="primary" icon="arrow_back" label="Vehículos" :to="{ name: 'vehicles' }" />
        </template>
      </PageHeader>

      <div v-if="loading" class="flex flex-center q-pa-xl"><q-spinner-gears size="56px" color="primary" /></div>

      <div v-else-if="!data" class="text-center text-grey-7 q-pa-xl">
        <q-icon name="no_crash" size="64px" />
        <div class="text-h6 q-mt-sm">No hay información para la placa {{ plate.toUpperCase() }}</div>
      </div>

      <template v-else>
        <div class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-md-6">
            <q-card flat bordered class="full-height">
              <q-card-section class="row items-center no-wrap">
                <q-icon name="directions_car" size="56px" color="primary" class="q-mr-md" />
                <div>
                  <PlateTag :plate="data.vehicle.plate" />
                  <div class="text-h6 q-mt-xs">{{ data.vehicle.brand }} {{ data.vehicle.model }} · {{ data.vehicle.year }}</div>
                  <div class="text-grey-7">
                    <q-icon name="person" /> {{ data.vehicle.owner?.fullName }} ·
                    <q-icon name="phone" /> {{ data.vehicle.owner?.phone }}
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-md-3">
            <q-card flat bordered class="kpi-card full-height">
              <q-card-section>
                <div class="text-caption text-grey-7">Reparaciones</div>
                <div class="kpi-value">{{ data.totalRepairs }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-md-3">
            <q-card flat bordered class="kpi-card full-height" style="border-left-color: var(--q-accent)">
              <q-card-section>
                <div class="text-caption text-grey-7">Total invertido</div>
                <div class="kpi-value">{{ formatMoney(data.totalSpent) }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div class="row items-center q-mb-sm">
          <div class="text-h6">Intervenciones</div>
          <q-space />
          <q-btn color="accent" unelevated icon="add" label="Nueva orden para este vehículo" :to="{ name: 'orders', query: { nueva: 1, placa: data.vehicle.plate } }" />
        </div>

        <div v-if="!data.history.length" class="text-center text-grey-7 q-pa-xl">
          Este vehículo todavía no tiene órdenes de reparación.
        </div>

        <q-timeline v-else color="primary" layout="dense">
          <q-timeline-entry
            v-for="o in data.history"
            :key="o._id"
            :icon="statusInfo(o.status).icon"
            :color="statusInfo(o.status).color"
            :subtitle="formatDateTime(o.entryDate) + (o.exitDate ? ' → ' + formatDateTime(o.exitDate) : '')"
          >
            <template #title>
              <div class="row items-center q-gutter-sm">
                <router-link :to="{ name: 'order-detail', params: { id: o._id } }" class="text-mono text-primary">{{ shortId(o._id) }}</router-link>
                <StatusChip :status="o.status" />
                <q-space />
                <span class="text-weight-bold">{{ formatMoney(o.total) }}</span>
              </div>
            </template>
            <q-card flat bordered>
              <q-card-section class="q-gutter-y-xs">
                <div><b>Problema:</b> {{ o.problem }}</div>
                <div v-if="o.diagnosis"><b>Diagnóstico:</b> {{ o.diagnosis }}</div>
                <div v-if="o.notes" class="text-grey-8"><b>Notas:</b> {{ o.notes }}</div>
                <div class="text-grey-7"><q-icon name="engineering" /> {{ o.mechanic?.fullName }} ({{ o.mechanic?.specialty }})</div>
              </q-card-section>
              <template v-if="o.services.length || o.parts.length">
                <q-separator />
                <q-card-section class="row q-gutter-xs">
                  <q-chip v-for="(s, i) in o.services" :key="`s-${i}`" dense icon="handyman" color="blue-grey-1" text-color="blue-grey-9">
                    {{ s.service?.name }} × {{ s.quantity }}
                  </q-chip>
                  <q-chip v-for="(p, i) in o.parts" :key="`p-${i}`" dense icon="inventory_2" color="orange-1" text-color="orange-10">
                    {{ p.part?.name }} × {{ p.quantity }}
                  </q-chip>
                </q-card-section>
              </template>
            </q-card>
          </q-timeline-entry>
        </q-timeline>
      </template>
    </div>
  </q-page>
</template>
