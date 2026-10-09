import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api.js'

// Endpoints: /api/parts  (inventario de repuestos)
export const usePartStore = defineStore(
  'parts',
  () => {
    const parts = ref([])
    const lowStockParts = ref([])
    const loading = ref(false)

    async function fetchParts() {
      loading.value = true
      try {
        const { data } = await api.get('/parts')
        parts.value = data
        return data
      } finally {
        loading.value = false
      }
    }

    // GET /api/parts?lowStock=5 → repuestos con stock menor o igual al umbral
    async function fetchLowStock(threshold = 5) {
      const { data } = await api.get('/parts', { params: { lowStock: threshold } })
      lowStockParts.value = data
      return data
    }

    async function createPart(payload) {
      const { data } = await api.post('/parts', payload)
      await fetchParts()
      return data
    }

    async function updatePart(id, payload) {
      const { data } = await api.put(`/parts/${id}`, payload)
      await fetchParts()
      return data
    }

    // PATCH /api/parts/:id/stock  { quantity: 10 } suma | { quantity: -2 } resta
    async function adjustStock(id, quantity) {
      const { data } = await api.patch(`/parts/${id}/stock`, { quantity })
      const index = parts.value.findIndex((p) => p._id === id)
      if (index !== -1) parts.value[index] = data
      return data
    }

    async function deletePart(id) {
      const { data } = await api.delete(`/parts/${id}`)
      parts.value = parts.value.filter((p) => p._id !== id)
      return data
    }

    return {
      parts, lowStockParts, loading,
      fetchParts, fetchLowStock, createPart, updatePart, adjustStock, deletePart,
    }
  },
  { persist: { pick: ['parts', 'lowStockParts'] } }
)
