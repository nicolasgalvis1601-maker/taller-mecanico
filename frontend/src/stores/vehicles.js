import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api.js'

// Endpoints: /api/vehicles  (el backend identifica el vehículo por su placa)
export const useVehicleStore = defineStore(
  'vehicles',
  () => {
    const vehicles = ref([])
    const loading = ref(false)
    const lastHistoryPlate = ref('')

    async function fetchVehicles() {
      loading.value = true
      try {
        const { data } = await api.get('/vehicles')
        vehicles.value = data // cada vehículo trae clientId poblado con el propietario
        return data
      } finally {
        loading.value = false
      }
    }

    async function getVehicle(plate) {
      const { data } = await api.get(`/vehicles/${encodeURIComponent(plate)}`)
      return data
    }

    async function getHistory(plate) {
      const { data } = await api.get(`/vehicles/${encodeURIComponent(plate)}/history`)
      lastHistoryPlate.value = data.vehicle.plate
      return data // { vehicle, totalRepairs, totalSpent, history }
    }

    async function createVehicle(payload) {
      const { data } = await api.post('/vehicles', payload)
      await fetchVehicles()
      return data
    }

    async function updateVehicle(plate, payload) {
      const { data } = await api.put(`/vehicles/${encodeURIComponent(plate)}`, payload)
      await fetchVehicles()
      return data
    }

    async function deleteVehicle(plate) {
      const { data } = await api.delete(`/vehicles/${encodeURIComponent(plate)}`)
      vehicles.value = vehicles.value.filter((v) => v.plate !== plate)
      return data
    }

    return {
      vehicles, loading, lastHistoryPlate,
      fetchVehicles, getVehicle, getHistory, createVehicle, updateVehicle, deleteVehicle,
    }
  },
  { persist: { pick: ['vehicles', 'lastHistoryPlate'] } }
)
