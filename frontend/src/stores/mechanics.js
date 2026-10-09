import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api.js'

// Endpoints: /api/mechanics
export const useMechanicStore = defineStore(
  'mechanics',
  () => {
    const mechanics = ref([])
    const loading = ref(false)

    async function fetchMechanics() {
      loading.value = true
      try {
        const { data } = await api.get('/mechanics')
        mechanics.value = data
        return data
      } finally {
        loading.value = false
      }
    }

    async function getMechanicOrders(id) {
      const { data } = await api.get(`/mechanics/${id}/orders`)
      return data // { mechanic, totalOrders, orders }
    }

    async function createMechanic(payload) {
      const { data } = await api.post('/mechanics', payload)
      await fetchMechanics()
      return data
    }

    async function updateMechanic(id, payload) {
      const { data } = await api.put(`/mechanics/${id}`, payload)
      await fetchMechanics()
      return data
    }

    async function deleteMechanic(id) {
      const { data } = await api.delete(`/mechanics/${id}`)
      mechanics.value = mechanics.value.filter((m) => m._id !== id)
      return data
    }

    return { mechanics, loading, fetchMechanics, getMechanicOrders, createMechanic, updateMechanic, deleteMechanic }
  },
  { persist: { pick: ['mechanics'] } }
)
