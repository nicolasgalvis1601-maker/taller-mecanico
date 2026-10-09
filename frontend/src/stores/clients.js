import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api.js'

// Endpoints: /api/clients  (el backend identifica al cliente por su documentId)
export const useClientStore = defineStore(
  'clients',
  () => {
    const clients = ref([])
    const loading = ref(false)

    async function fetchClients(search = '') {
      loading.value = true
      try {
        const params = search ? { search } : {}
        const { data } = await api.get('/clients', { params })
        clients.value = data
        return data
      } finally {
        loading.value = false
      }
    }

    async function getClient(documentId) {
      const { data } = await api.get(`/clients/${encodeURIComponent(documentId)}`)
      return data
    }

    async function getClientVehicles(documentId) {
      const { data } = await api.get(`/clients/${encodeURIComponent(documentId)}/vehicles`)
      return data // { client, vehicles }
    }

    async function createClient(payload) {
      const { data } = await api.post('/clients', payload)
      await fetchClients()
      return data // { message, client }
    }

    async function updateClient(documentId, payload) {
      const { data } = await api.put(`/clients/${encodeURIComponent(documentId)}`, payload)
      await fetchClients()
      return data // { message, client }
    }

    async function deleteClient(documentId) {
      const { data } = await api.delete(`/clients/${encodeURIComponent(documentId)}`)
      clients.value = clients.value.filter((c) => c.documentId !== documentId)
      return data
    }

    return { clients, loading, fetchClients, getClient, getClientVehicles, createClient, updateClient, deleteClient }
  },
  // Solo se persiste la lista (no el estado de carga)
  { persist: { pick: ['clients'] } }
)
