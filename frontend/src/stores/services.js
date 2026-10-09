import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api.js'

// Endpoints: /api/services  (catálogo de mano de obra)
export const useServiceStore = defineStore(
  'services',
  () => {
    const services = ref([])
    const loading = ref(false)

    async function fetchServices() {
      loading.value = true
      try {
        const { data } = await api.get('/services')
        services.value = data
        return data
      } finally {
        loading.value = false
      }
    }

    async function createService(payload) {
      const { data } = await api.post('/services', payload)
      await fetchServices()
      return data
    }

    async function updateService(id, payload) {
      const { data } = await api.put(`/services/${id}`, payload)
      await fetchServices()
      return data
    }

    async function deleteService(id) {
      const { data } = await api.delete(`/services/${id}`)
      services.value = services.value.filter((s) => s._id !== id)
      return data
    }

    return { services, loading, fetchServices, createService, updateService, deleteService }
  },
  { persist: { pick: ['services'] } }
)
